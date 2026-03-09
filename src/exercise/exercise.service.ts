import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { AiService } from 'src/ai/ai.service';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { EXERCISE_TYPE_SPECIFIC_FIELDS_TO_UNSET } from 'src/exercise/constants/exercise-type-specific-fields-to-unset.constant';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { TransferExerciseDto } from 'src/exercise/types/dto/transfer-exercise.dto';
import { UpdateExerciseDto } from 'src/exercise/types/dto/update-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { ReadAllExercisesResponse } from 'src/exercise/types/response/read-all-exercises.response';
import { ReadSingleExerciseResponse } from 'src/exercise/types/response/read-single-exercise.response';
import { validateExerciseFields } from 'src/exercise/utils/validate-exercise-fields.util';
import ResponseBase from 'src/shared/interfaces/response-base.interface';
import { SourceService } from 'src/source/source.service';

@Injectable()
export class ExerciseService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Exercise', Model<ExerciseDocument>>,
        private aiService: AiService,
        private sourceService: SourceService,
        @Inject(forwardRef(() => ExerciseSetService))
        private exerciseSetService: ExerciseSetService
    ) {}

    async create(
        exerciseSetId: string,
        dto: CreateExerciseDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        validateExerciseFields(dto.type, dto);

        const commonFields = {
            exerciseSetId,
            type: dto.type,
            difficulty: dto.difficulty,
            prompt: dto.prompt,
        };

        let exerciseData: Record<string, unknown>;

        switch (dto.type) {
            case ExerciseType.MCQ:
                exerciseData = { ...commonFields, choices: dto.choices, correctChoiceIndex: dto.correctChoiceIndex };
                break;
            case ExerciseType.TRUE_FALSE:
                exerciseData = { ...commonFields, correctChoiceIndex: dto.correctChoiceIndex };
                break;
            case ExerciseType.OPEN_ENDED:
                exerciseData = { ...commonFields, solution: dto.solution };
                break;
            default:
                throw new BadRequestException(`unsupported exercise type: ${dto.type as string}`);
        }

        await this.db.Exercise.create([exerciseData], { session });
        await this.exerciseSetService.registerExercise(exerciseSetId, dto.type, dto.difficulty, session);

        return { isSuccess: true, message: 'exercise created' };
    }

    async readAll(): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find();

        return { isSuccess: true, message: 'all exercises read', exercises };
    }

    async readById(id: string): Promise<ReadSingleExerciseResponse> {
        const exercise = await this.db.Exercise.findById(id);

        if (!exercise) {
            throw new NotFoundException(`no exercise found by id: ${id}`);
        }

        return { isSuccess: true, message: `exercise read by id: ${id}`, exercise };
    }

    async readAllByExerciseSetId(
        exerciseSetId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find({ exerciseSetId }).session(session ?? null);

        return {
            isSuccess: true,
            message: `all exercises read that has exerciseSetId: ${exerciseSetId}`,
            exercises,
        };
    }

    async updateById(id: string, dto: UpdateExerciseDto): Promise<ResponseBase> {
        const { type, difficulty, ...restOfDto } = dto;

        const exercise = await this.db.Exercise.findById(id);

        if (!exercise) {
            throw new NotFoundException(`no exercise found by id: ${id}`);
        }

        const effectiveType = type ?? exercise.type;
        const effectiveDifficulty = difficulty ?? exercise.difficulty;

        const updateData: Partial<ExerciseDocument> = { ...restOfDto };

        if (type !== undefined) {
            updateData.type = type;

            validateExerciseFields(type, {
                choices: restOfDto.choices ?? exercise.choices,
                correctChoiceIndex: restOfDto.correctChoiceIndex ?? exercise.correctChoiceIndex,
                solution: restOfDto.solution ?? exercise.solution,
            });
        }

        if (difficulty !== undefined) {
            updateData.difficulty = difficulty;
        }

        const typeChanged = type !== undefined && type !== exercise.type;
        const needsBookkeeping = typeChanged || difficulty !== undefined;

        if (needsBookkeeping) {
            let unsetFields: Record<string, number> | undefined;

            if (typeChanged) {
                const fieldsToUnset = EXERCISE_TYPE_SPECIFIC_FIELDS_TO_UNSET[type];

                for (const field of fieldsToUnset) {
                    delete (updateData as Record<string, unknown>)[field];
                }

                unsetFields = Object.fromEntries(fieldsToUnset.map((field) => [field, 1]));
            }

            const session = await mongoose.startSession();

            session.startTransaction();

            try {
                await this.db.Exercise.findByIdAndUpdate(
                    id,
                    { $set: updateData, ...(unsetFields && { $unset: unsetFields }) },
                    { session }
                );
                await this.exerciseSetService.unregisterExercise(exercise.exerciseSetId, session);
                await this.exerciseSetService.registerExercise(
                    exercise.exerciseSetId,
                    effectiveType,
                    effectiveDifficulty,
                    session
                );
                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }

            return { isSuccess: true, message: 'exercise updated' };
        }

        await this.db.Exercise.findByIdAndUpdate(id, { $set: updateData });

        return { isSuccess: true, message: 'exercise updated' };
    }

    async transfer(id: string, dto: TransferExerciseDto): Promise<ResponseBase> {
        const { exercise } = await this.readById(id);
        const { exerciseSet: sourceExerciseSet } = await this.exerciseSetService.readById(exercise.exerciseSetId);
        const { exerciseSet: targetExerciseSet } = await this.exerciseSetService.readById(dto.exerciseSetId);

        if (sourceExerciseSet._id.toString() === targetExerciseSet._id.toString()) {
            return { isSuccess: false, message: 'exercise already belongs to this exercise set' };
        }

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.db.Exercise.findByIdAndUpdate(id, { $set: { exerciseSetId: dto.exerciseSetId } }, { session });

            await this.exerciseSetService.unregisterExercise(sourceExerciseSet._id, session);
            await this.exerciseSetService.registerExercise(
                targetExerciseSet._id,
                exercise.type,
                exercise.difficulty,
                session
            );

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        return {
            isSuccess: true,
            message: `exercise transferred from exercise set ${sourceExerciseSet._id} to ${targetExerciseSet._id}`,
        };
    }

    async deleteById(id: string): Promise<ResponseBase> {
        const { exercise } = await this.readById(id);

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const deletedExercise = await this.db.Exercise.findByIdAndDelete(id, { session });

            if (!deletedExercise) {
                throw new NotFoundException('no exercise found to delete');
            }

            await this.exerciseSetService.unregisterExercise(exercise.exerciseSetId, session);

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        return { isSuccess: true, message: `exercise deleted by id: ${id}` };
    }
}

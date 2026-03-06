import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { validateExerciseFields } from 'src/exercise/utils/validate-exercise-fields.util';
import { TransferExerciseDto } from 'src/exercise/types/dto/transfer-exercise.dto';
import { OpenaiService } from '../openai/openai.service';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { SourceService } from '../source/source.service';
import { CreateExerciseDto } from './types/dto/create-exercise.dto';
import { ExerciseDocument } from './types/exercise-document.interface';
import { ReadAllExercisesResponse } from './types/response/read-all-exercises.response';
import { ReadSingleExerciseResponse } from './types/response/read-single-exercise.response';
import { UpdateExerciseDto } from 'src/exercise/types/dto/update-exercise.dto';

@Injectable()
export class ExerciseService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Exercise', Model<ExerciseDocument>>,
        private openaiService: OpenaiService,
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
                exerciseData = { ...commonFields, correctChoiceIndex: dto.correctChoiceIndex, solution: dto.solution };
                break;
            case ExerciseType.OPEN_ENDED:
                exerciseData = { ...commonFields, solution: dto.solution };
                break;
            default:
                throw new BadRequestException(`unsupported exercise type: ${dto.type as string}`);
        }

        await this.db.Exercise.create([exerciseData], { session });
        await this.exerciseSetService.addExercise(exerciseSetId, dto.type, session);

        return { isSuccess: true, message: 'exercise created' };
    }

    async readAll(): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find();

        if (exercises.length === 0) {
            throw new NotFoundException('no exercises found');
        }

        return { isSuccess: true, message: 'all exercises read', exercises };
    }

    async readById(id: string): Promise<ReadSingleExerciseResponse> {
        const exercise = await this.db.Exercise.findById(id);

        if (!exercise) {
            throw new NotFoundException(`no exercise found by id: ${id}`);
        }

        return { isSuccess: true, message: `exercise read by id: ${id}`, exercise };
    }

    async readAllByExerciseSetId(exerciseSetId: string): Promise<ReadAllExercisesResponse> {
        const exercises = await this.db.Exercise.find({ exerciseSetId });

        if (!exercises || exercises.length === 0) {
            throw new NotFoundException(`no exercises found for exerciseSetId: ${exerciseSetId}`);
        }

        return {
            isSuccess: true,
            message: `all exercises read that has exerciseSetId: ${exerciseSetId}`,
            exercises,
        };
    }

    async updateById(id: string, dto: UpdateExerciseDto): Promise<ResponseBase> {
        const { type, ...restOfDto } = dto;

        const exercise = await this.db.Exercise.findById(id);
        if (!exercise) {
            throw new NotFoundException(`no exercise found by id: ${id}`);
        }

        const updateData: Partial<ExerciseDocument> = { ...restOfDto };

        if (type !== undefined) {
            updateData.type = type;

            validateExerciseFields(type, {
                choices: restOfDto.choices ?? exercise.choices,
                correctChoiceIndex: restOfDto.correctChoiceIndex ?? exercise.correctChoiceIndex,
                solution: restOfDto.solution ?? exercise.solution,
            });

            if (type !== exercise.type) {
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    await this.db.Exercise.findByIdAndUpdate(id, { $set: updateData }, { session });
                    await this.exerciseSetService.removeExercise(exercise.exerciseSetId, session);
                    await this.exerciseSetService.addExercise(exercise.exerciseSetId, type, session);
                    await session.commitTransaction();
                } catch (error) {
                    await session.abortTransaction();
                    throw error;
                } finally {
                    await session.endSession();
                }
                return { isSuccess: true, message: 'exercise updated' };
            }
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

            await this.exerciseSetService.removeExercise(sourceExerciseSet._id, session);
            await this.exerciseSetService.addExercise(targetExerciseSet._id, exercise.type, session);

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
        const { exerciseSet: associatedExerciseSet } = await this.exerciseSetService.readById(exercise.exerciseSetId);

        const deletedExercise = await this.db.Exercise.findByIdAndDelete(id);

        if (!deletedExercise) {
            throw new NotFoundException('no exercise found to delete');
        }

        await this.exerciseSetService.removeExercise(associatedExerciseSet._id);

        return { isSuccess: true, message: `exercise deleted by id: ${id}` };
    }
}

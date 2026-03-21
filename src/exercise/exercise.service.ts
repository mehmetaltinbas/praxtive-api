import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import { AiService } from 'src/ai/ai.service';
import { GenerateAiExerciseSchema } from 'src/ai/types/generate-ai-exercise-schema.interface';
import { AiGeneratedExercise } from 'src/ai/types/response/generate-exercises.response';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { EXERCISE_TYPE_SPECIFIC_FIELDS_TO_UNSET } from 'src/exercise/constants/exercise-type-specific-fields-to-unset.constant';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseTypeFactory } from 'src/exercise/strategies/type/exercise-type.factory';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { TransferExerciseDto } from 'src/exercise/types/dto/transfer-exercise.dto';
import { UpdateExerciseDto } from 'src/exercise/types/dto/update-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { ReadMultipleExercisesResponse } from 'src/exercise/types/response/read-multiple-exercises.response';
import { ReadSingleExerciseResponse } from 'src/exercise/types/response/read-single-exercise.response';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class ExerciseService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Exercise', mongoose.Model<ExerciseDocument>>,
        private exerciseTypeFactory: ExerciseTypeFactory,
        @Inject(forwardRef(() => ExerciseSetService)) private exerciseSetService: ExerciseSetService
    ) {}

    async create(
        userId: string,
        exerciseSetId: string,
        dto: CreateExerciseDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const isLocalSession = !session;
        const activeSession = session || (await mongoose.startSession());

        try {
            if (isLocalSession) activeSession.startTransaction();

            const strategy = this.exerciseTypeFactory.resolveStrategy(dto.type);

            strategy.validateFields(dto);

            const commonFields = {
                exerciseSetId,
                type: dto.type,
                difficulty: dto.difficulty,
                prompt: dto.prompt,
            };

            const exerciseData = {
                ...commonFields,
                ...strategy.getCreateExerciseData(dto),
            };

            const count = await this.db.Exercise.countDocuments({ exerciseSetId }).session(activeSession);

            await this.db.Exercise.create([{ ...exerciseData, order: count }], { session: activeSession });

            await this.exerciseSetService.registerExercise(
                userId,
                exerciseSetId,
                dto.type,
                dto.difficulty,
                activeSession
            );

            if (isLocalSession) {
                await activeSession.commitTransaction();
            }

            return { isSuccess: true, message: 'exercise created' };
        } catch (error) {
            if (isLocalSession) {
                await activeSession.abortTransaction();
            }

            throw error;
        } finally {
            if (isLocalSession) {
                await activeSession.endSession();
            }
        }
    }

    /**
     * Reads a single exercise by id.
     * Validates ownership via the parent exercise set. When userId is undefined,
     * cascades public access check (visibility:PUBLIC) to the exercise set.
     * @param userId - The owner's id, or undefined for public access.
     * @param id - The exercise id.
     */
    async readById(userId: string | undefined, id: string): Promise<ReadSingleExerciseResponse> {
        const exercise = await this.db.Exercise.findOne({ _id: id });

        if (!exercise) {
            throw new NotFoundException(`no exercise found by id: ${id}`);
        }

        await this.exerciseSetService.readById(userId, exercise.exerciseSetId);

        return { isSuccess: true, message: `exercise read by id: ${id}`, exercise };
    }

    /**
     * Reads all exercises belonging to an exercise set.
     * Validates access via the parent exercise set. When userId is undefined,
     * cascades public access check (visibility: PUBLIC) to the exercise set.
     * @param userId - The owner's id, or undefined for public access.
     * @param exerciseSetId - The exercise set id.
     * @param session - Optional MongoDB session.
     */
    async readAllByExerciseSetId(
        userId: string | undefined,
        exerciseSetId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ReadMultipleExercisesResponse> {
        const { exerciseSet } = await this.exerciseSetService.readById(userId, exerciseSetId);

        const exercises = await this.db.Exercise.find({ exerciseSetId })
            .sort({ order: 1 })
            .session(session ?? null);

        return {
            isSuccess: true,
            message: `all exercises read that has exerciseSetId: ${exerciseSetId}`,
            exercises,
        };
    }

    async updateById(userId: string, id: string, dto: UpdateExerciseDto): Promise<ResponseBase> {
        const { type, difficulty, ...restOfDto } = dto;

        const { exercise } = await this.readById(userId, id);

        const effectiveType = type ?? exercise.type;
        const effectiveDifficulty = difficulty ?? exercise.difficulty;

        const updateData: Partial<ExerciseDocument> = { ...restOfDto };

        if (type !== undefined) {
            updateData.type = type;

            const strategy = this.exerciseTypeFactory.resolveStrategy(type);

            strategy.validateFields(restOfDto);
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
                await this.exerciseSetService.unregisterExercise(userId, exercise.exerciseSetId, session);
                await this.exerciseSetService.registerExercise(
                    userId,
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

    async transfer(userId: string, id: string, dto: TransferExerciseDto): Promise<ResponseBase> {
        const { exercise } = await this.readById(userId, id);
        const { exerciseSet: sourceExerciseSet } = await this.exerciseSetService.readById(
            userId,
            exercise.exerciseSetId
        );
        const { exerciseSet: targetExerciseSet } = await this.exerciseSetService.readById(userId, dto.exerciseSetId);

        if (sourceExerciseSet._id.toString() === targetExerciseSet._id.toString()) {
            return { isSuccess: false, message: 'exercise already belongs to this exercise set' };
        }

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const count = await this.db.Exercise.countDocuments({ exerciseSetId: dto.exerciseSetId }).session(session);

            await this.db.Exercise.findByIdAndUpdate(
                id,
                { $set: { exerciseSetId: dto.exerciseSetId, order: count } },
                { session }
            );

            await this.db.Exercise.updateMany(
                { exerciseSetId: sourceExerciseSet._id, order: { $gt: exercise.order } },
                { $inc: { order: -1 } },
                { session }
            );

            await this.exerciseSetService.unregisterExercise(userId, sourceExerciseSet._id, session);
            await this.exerciseSetService.registerExercise(
                userId,
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

    async reorder(id: string, order: number, session: mongoose.mongo.ClientSession): Promise<void> {
        await this.db.Exercise.findOneAndUpdate({ _id: id }, { $set: { order } }, { session });
    }

    async deleteById(userId: string, id: string): Promise<ResponseBase> {
        const { exercise } = await this.readById(userId, id);

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const deletedExercise = await this.db.Exercise.findByIdAndDelete(id, { session });

            if (!deletedExercise) {
                throw new NotFoundException('no exercise found to delete');
            }

            await this.db.Exercise.updateMany(
                { exerciseSetId: exercise.exerciseSetId, order: { $gt: exercise.order } },
                { $inc: { order: -1 } },
                { session }
            );

            await this.exerciseSetService.unregisterExercise(userId, exercise.exerciseSetId, session);

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        return { isSuccess: true, message: `exercise deleted by id: ${id}` };
    }

    buildRestOfGenerateAiExerciseSchema(schema: GenerateAiExerciseSchema, exerciseType: ExerciseType): void {
        const strategy = this.exerciseTypeFactory.resolveStrategy(exerciseType);

        return strategy.buildRestOfGenerateAiExerciseSchema(schema);
    }

    buildCreateExerciseDto(dto: CreateExerciseDto, exercise: AiGeneratedExercise): void {
        const strategy = this.exerciseTypeFactory.resolveStrategy(exercise.type);

        return strategy.buildCreateExerciseDto(dto, exercise);
    }

    async evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse> {
        const strategy = this.exerciseTypeFactory.resolveStrategy(exercise.type);

        return await strategy.evaluateAnswer(exercise, answer);
    }

    buildPaperExtractionPrompt(exercise: ExerciseDocument, exerciseNumber: number): string {
        const strategy = this.exerciseTypeFactory.resolveStrategy(exercise.type);

        return strategy.buildPaperExtractionPrompt(exerciseNumber, exercise);
    }

    normalizePaperAnswer(exercise: ExerciseDocument, rawAnswer: string): string {
        const strategy = this.exerciseTypeFactory.resolveStrategy(exercise.type);

        return strategy.normalizePaperAnswer(rawAnswer);
    }

    getCorrectAnswerText(exercise: ExerciseDocument): string {
        const strategy = this.exerciseTypeFactory.resolveStrategy(exercise.type);

        return strategy.getCorrectAnswerText(exercise);
    }

    drawExerciseToPdf(
        exercise: ExerciseDocument,
        index: number,
        document: typeof PDFDocument,
        usableWidth: number,
        availableHeight: number
    ): void {
        const strategy = this.exerciseTypeFactory.resolveStrategy(exercise.type);

        strategy.drawExerciseToPdf(exercise, index, document, usableWidth, availableHeight);
    }
}

import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import mongoose, { FilterQuery, Model } from 'mongoose';
import { ExerciseSetReadAllFilterCompositeProvider } from 'src/exercise-set/composites/read-all-filter/exercise-set-read-all-filter-composite.provider';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetTypeStrategyResolverProvider } from 'src/exercise-set/strategies/type/exercise-set-type-strategy-resolver.provider';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { UpdateExerciseSetDto } from 'src/exercise-set/types/dto/update-exercise-set.dto';
import {
    EvaluateAnswersResponse,
    ExerciseAnswerEvaluationResult,
} from 'src/exercise-set/types/response/evaluate-answers.response';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { AiService } from '../ai/ai.service';
import { ExerciseService } from '../exercise/exercise.service';
import { CreateExerciseDto } from '../exercise/types/dto/create-exercise.dto';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { SourceService } from '../source/source.service';
import { ExtendedSourceDocument } from '../source/types/extended-source-document.interface';
import { CreateExerciseSetDto } from './types/dto/create-exercise-set.dto';
import { ExerciseSetDocument } from './types/exercise-set-document.interface';
import { ReadAllExerciseSetsGroupedBySourcesResponse } from './types/response/read-all-exercise-sets-grouped-by-sources.response';
import { ReadAllExerciseSetsResponse } from './types/response/read-all-exercise-sets.response';
import { ReadSingleExerciseSetResponse } from './types/response/read-single-exercise-set.response';

@Injectable()
export class ExerciseSetService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'ExerciseSet', Model<ExerciseSetDocument>>,
        @Inject(forwardRef(() => ExerciseService)) private exerciseService: ExerciseService,
        private aiService: AiService,
        private sourceService: SourceService,
        private exerciseSetTypeStrategyResolverProvider: ExerciseSetTypeStrategyResolverProvider,
        private exerciseSetReadAllFilterCompositeProvider: ExerciseSetReadAllFilterCompositeProvider
    ) {}

    async create(userId: string, sourceId: string | undefined, dto: CreateExerciseSetDto): Promise<ResponseBase> {
        let sourceText;
        let sourceType;

        if (sourceId) {
            const readSingleSourceResponse = await this.sourceService.readById(sourceId);

            sourceText = readSingleSourceResponse.source.rawText;
            sourceType = ExerciseSetSourceType.SOURCE;
        } else {
            sourceType = ExerciseSetSourceType.INDEPENDENT;
        }

        let message = '';

        switch (sourceType) {
            case ExerciseSetSourceType.SOURCE: {
                const generateExercisesResponse = await this.aiService.generateExercises(
                    sourceText as string,
                    dto.type as unknown as ExerciseType,
                    dto.difficulty as unknown as ExerciseDifficulty,
                    dto.count
                );

                const session = await mongoose.startSession();

                session.startTransaction();

                try {
                    const [exerciseSet] = await this.db.ExerciseSet.create(
                        [
                            {
                                userId: new mongoose.Types.ObjectId(userId),
                                sourceType,
                                sourceId,
                                title: dto.title,
                                type: dto.type,
                                difficulty: dto.difficulty,
                                count: 0,
                            },
                        ],
                        { session }
                    );

                    const promises = generateExercisesResponse.exercises.map((exercise) => {
                        const createDto: CreateExerciseDto = {
                            type: exercise.type,
                            difficulty: exercise.difficulty,
                            prompt: exercise.prompt,
                        };

                        if (createDto.type === ExerciseType.MCQ) {
                            createDto.choices = exercise.choices;
                            createDto.correctChoiceIndex = exercise.correctChoiceIndex;
                        } else if (createDto.type === ExerciseType.TRUE_FALSE) {
                            createDto.correctChoiceIndex = exercise.correctChoiceIndex;
                        } else if (createDto.type === ExerciseType.OPEN_ENDED) {
                            createDto.solution = exercise.solution;
                        }

                        return this.exerciseService.create(exerciseSet._id, createDto, session);
                    });

                    await Promise.all(promises);

                    await session.commitTransaction();

                    message = `exercise set created, type: ${exerciseSet.type}, difficulty: ${exerciseSet.difficulty}, exercise count: ${generateExercisesResponse.exercises.length}`;
                } catch (error) {
                    await session.abortTransaction();
                    throw error;
                } finally {
                    await session.endSession();
                }

                break;
            }

            case ExerciseSetSourceType.INDEPENDENT: {
                const exerciseSet = await this.db.ExerciseSet.create({
                    userId: new mongoose.Types.ObjectId(userId),
                    sourceType,
                    title: dto.title,
                    type: dto.type,
                    difficulty: dto.difficulty,
                    count: 0,
                });

                message = `exercises et created with type ${exerciseSet.type}`;
                break;
            }
        }

        return {
            isSuccess: true,
            message,
        };
    }

    async readAllByUserId(
        userId: string,
        readMultipleExerciseSetsFilterCriteriaDto: ReadMultipleExerciseSetsFilterCriteriaDto
    ): Promise<ReadAllExerciseSetsResponse> {
        const filter: FilterQuery<ExerciseSetDocument> = {
            userId: new mongoose.Types.ObjectId(userId),
        };

        const response = await this.sourceService.readAllByUserId(userId);

        if (
            readMultipleExerciseSetsFilterCriteriaDto.sourceType === ExerciseSetSourceType.SOURCE &&
            response.sources &&
            response.sources.length !== 0
        ) {
            const sourceIds = response.sources.map((s) => s._id);

            filter.sourceId = { $in: sourceIds };
        }

        const refinedFilter = this.exerciseSetReadAllFilterCompositeProvider.filter(
            readMultipleExerciseSetsFilterCriteriaDto,
            filter
        );
        const exerciseSets = await this.db.ExerciseSet.find(refinedFilter);

        return { isSuccess: true, message: 'All exercise sets read', exerciseSets };
    }

    async readAllByUserIdGroupedBySources(userId: string): Promise<ReadAllExerciseSetsGroupedBySourcesResponse> {
        const sourcesResponse = await this.sourceService.readAllByUserId(userId);

        const sources = [];

        for (const source of sourcesResponse.sources) {
            const exerciseSetsOfSource = await this.db.ExerciseSet.find({
                sourceId: source._id,
            });
            const extendedSource: ExtendedSourceDocument = {
                ...(source.toObject() as Omit<ExtendedSourceDocument, 'exerciseSets'>),
                exerciseSets: exerciseSetsOfSource,
            };

            sources.push(extendedSource);
        }

        return { isSuccess: true, message: 'All exercise sets read', sources };
    }

    async readById(id: string, session?: mongoose.mongo.ClientSession): Promise<ReadSingleExerciseSetResponse> {
        const exerciseSet = await this.db.ExerciseSet.findById(id).session(session ?? null);

        if (!exerciseSet) {
            throw new NotFoundException(`no exerciseSet found by id ${id}`);
        }

        return {
            isSuccess: true,
            message: `exerciseSet read by id ${id}`,
            exerciseSet,
        };
    }

    async updateById(
        id: string,
        dto: UpdateExerciseSetDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const updateData: Partial<ExerciseSetDocument> = { ...dto };
        const updated = await this.db.ExerciseSet.findByIdAndUpdate(id, { $set: updateData }, { new: true, session });

        if (!updated) {
            throw new NotFoundException('exercise set not found');
        }

        return { isSuccess: true, message: 'exercise set updated' };
    }

    async registerExercise(
        id: string,
        exerciseType: ExerciseType,
        exerciseDifficulty: ExerciseDifficulty,
        session?: mongoose.mongo.ClientSession
    ): Promise<void> {
        const { exerciseSet } = await this.readById(id, session);

        const update: Record<string, unknown> = { $inc: { count: 1 } };
        const $set: Record<string, unknown> = {};

        if (exerciseSet.count === 0) {
            $set.type = exerciseType;
            $set.difficulty = exerciseDifficulty;
        } else {
            if (exerciseType.toString() !== exerciseSet.type.toString() && exerciseSet.type !== ExerciseSetType.MIX) {
                $set.type = ExerciseSetType.MIX;
            }

            if (
                exerciseDifficulty.toString() !== exerciseSet.difficulty.toString() &&
                exerciseSet.difficulty !== ExerciseSetDifficulty.MIX
            ) {
                $set.difficulty = ExerciseSetDifficulty.MIX;
            }
        }

        if (Object.keys($set).length > 0) update.$set = $set;

        await this.db.ExerciseSet.findByIdAndUpdate(id, update, { session });
    }

    async unregisterExercise(id: string, session?: mongoose.mongo.ClientSession): Promise<void> {
        const { exerciseSet } = await this.readById(id, session);

        const update: Record<string, unknown> = { $inc: { count: -1 } };
        const $set: Record<string, unknown> = {};

        const isMixType = exerciseSet.type === ExerciseSetType.MIX;
        const isMixDifficulty = exerciseSet.difficulty === ExerciseSetDifficulty.MIX;

        if (isMixType || isMixDifficulty) {
            let exercises: ExerciseDocument[] = [];

            const result = await this.exerciseService.readAllByExerciseSetId(exerciseSet._id, session);
            exercises = result.exercises;

            if (exercises.length > 0) {
                if (isMixType) {
                    const types = new Set<ExerciseType>();

                    for (const exercise of exercises) {
                        types.add(exercise.type);
                        if (types.size > 1) break;
                    }

                    if (types.size === 1) {
                        $set.type = [...types][0];
                    }
                }

                if (isMixDifficulty) {
                    const difficulties = new Set<ExerciseDifficulty>();

                    for (const exercise of exercises) {
                        difficulties.add(exercise.difficulty);
                        if (difficulties.size > 1) break;
                    }

                    if (difficulties.size === 1) {
                        $set.difficulty = [...difficulties][0];
                    }
                }
            }
        }

        if (Object.keys($set).length > 0) update.$set = $set;

        await this.db.ExerciseSet.findByIdAndUpdate(id, update, { session });
    }

    async deleteById(id: string): Promise<ResponseBase> {
        const deletedExerciseSet = await this.db.ExerciseSet.findByIdAndDelete(id);

        if (!deletedExerciseSet) {
            throw new NotFoundException('exercise set not found');
        }

        return { isSuccess: true, message: 'exercise set deleted' };
    }

    async evaluateAnswers(evaluateAnswersDto: EvaluateAnswersDto): Promise<EvaluateAnswersResponse> {
        const exerciseAnswerEvaluationResults: ExerciseAnswerEvaluationResult[] = [];

        for (const exercise of evaluateAnswersDto.exercises) {
            try {
                const readExerciseByIdResponse = await this.exerciseService.readById(exercise.id);
                const resolveTypeStrategyProviderResponse =
                    this.exerciseSetTypeStrategyResolverProvider.resolveTypeStrategyProvider(
                        readExerciseByIdResponse.exercise.type
                    );

                const evaluatedAnswer = await resolveTypeStrategyProviderResponse.strategy.evaluateAnswer(
                    readExerciseByIdResponse.exercise,
                    exercise.answer
                );

                if (evaluatedAnswer.score === undefined || !evaluatedAnswer.feedback) continue;

                exerciseAnswerEvaluationResults.push({
                    exerciseId: exercise.id,
                    exerciseType: readExerciseByIdResponse.exercise.type,
                    userAnswer: exercise.answer,
                    solution: readExerciseByIdResponse.exercise.solution,
                    correctChoiceIndex: readExerciseByIdResponse.exercise.correctChoiceIndex,
                    score: evaluatedAnswer.score,
                    feedback: evaluatedAnswer.feedback,
                });
            } catch {
                continue;
            }
        }

        let totalOfAllScores = 0;

        exerciseAnswerEvaluationResults.forEach((element) => (totalOfAllScores += element.score));
        const overallScore = Math.floor(totalOfAllScores / exerciseAnswerEvaluationResults.length);

        return {
            isSuccess: true,
            message: 'done',
            overallScore,
            exerciseAnswerEvaluationResults,
        };
    }
}

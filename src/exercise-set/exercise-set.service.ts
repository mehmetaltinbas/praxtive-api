import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import mongoose, { FilterQuery } from 'mongoose';
import PDFDocument from 'pdfkit';
import { AiService } from 'src/ai/ai.service';
import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';
import { CreditEstimationService } from 'src/credit-transaction/services/credit-estimation.service';
import { CreditGuardService } from 'src/credit-transaction/services/credit-guard.service';
import { CreditEstimateResponse } from 'src/credit-transaction/types/response/credit-estimate.response';
import { ExerciseSetReadAllFilterCompositeProvider } from 'src/exercise-set/composites/read-all-filter/exercise-set-read-all-filter-composite.provider';
import { ALLOWED_PAPER_IMAGE_MIMETYPES } from 'src/exercise-set/constants/allowed-paper-image-mimetypes.constant';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';
import { ExerciseSetContextTypeFactory } from 'src/exercise-set/strategies/context-type/exercise-set-context-type.factory';
import { ExerciseSetTypeFactory } from 'src/exercise-set/strategies/type/exercise-set-type.factory';
import { ChangeExerciseSetContextDto } from 'src/exercise-set/types/dto/change-exercise-set-context.dto';
import { CloneExerciseSetDto } from 'src/exercise-set/types/dto/clone-exercise-set.dto';
import { CreateExerciseSetDto } from 'src/exercise-set/types/dto/create-exercise-set.dto';
import { EstimateEvaluatePaperAnswersDto } from 'src/exercise-set/types/dto/estimate-evaluate-paper-answers.dto';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';
import { GenerateAdditionalExercisesDto } from 'src/exercise-set/types/dto/generate-additional-exercises.dto';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { SaveGeneratedNotesDto } from 'src/exercise-set/types/dto/save-generated-notes.dto';
import { UpdateExerciseSetDto } from 'src/exercise-set/types/dto/update-exercise-set.dto';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import {
    EvaluateAnswersResponse,
    ExerciseAnswerEvaluationResult,
} from 'src/exercise-set/types/response/evaluate-answers.response';
import { GenerateNotesResponse } from 'src/exercise-set/types/response/generate-notes.response';
import { GetPdfResponse } from 'src/exercise-set/types/response/get-pdf.response';
import { ReadAllExerciseSetsGroupedBySourcesResponse } from 'src/exercise-set/types/response/read-all-exercise-sets-grouped-by-sources.response';
import { ReadAllExerciseSetsResponse } from 'src/exercise-set/types/response/read-all-exercise-sets.response';
import { ReadSingleExerciseSetResponse } from 'src/exercise-set/types/response/read-single-exercise-set.response';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseService } from 'src/exercise/exercise.service';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ReorderExercisesDto } from 'src/exercise/types/dto/reorder-exercises.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';
import { SourceService } from 'src/source/source.service';
import { ExtendedSourceDocument } from 'src/source/types/extended-source-document.interface';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ExerciseSetService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'ExerciseSet', mongoose.Model<ExerciseSetDocument>>,
        @Inject(forwardRef(() => ExerciseService)) private exerciseService: ExerciseService,
        private aiService: AiService,
        private sourceService: SourceService,
        private exerciseSetTypeFactory: ExerciseSetTypeFactory,
        private exerciseSetContextTypeFactory: ExerciseSetContextTypeFactory,
        private exerciseSetReadAllFilterCompositeProvider: ExerciseSetReadAllFilterCompositeProvider,
        private userService: UserService,
        private creditGuardService: CreditGuardService,
        private costEstimationService: CreditEstimationService,
        private subscriptionService: SubscriptionService
    ) {}

    async create(userId: string, contextId: string | undefined, dto: CreateExerciseSetDto): Promise<ResponseBase> {
        const { plan } = await this.subscriptionService.getActivePlanForUser(userId);

        if (plan.maxExerciseSets !== -1) {
            const count = await this.db.ExerciseSet.countDocuments({ user: userId });

            if (count >= plan.maxExerciseSets) {
                throw new ForbiddenException(
                    `Exercise set limit reached (${plan.maxExerciseSets}). Upgrade your plan to create more.`
                );
            }
        }

        const conflict = await this.db.ExerciseSet.findOne({ user: userId, title: dto.title });

        if (conflict) {
            return {
                isSuccess: false,
                message: `An exercise set with the title "${dto.title}" already exists.`,
            };
        }

        const contextType = contextId ? dto.contextType : ExerciseSetContextType.INDEPENDENT;
        const strategy = this.exerciseSetContextTypeFactory.resolveStrategy(contextType);
        const createContext = await strategy.resolveCreateContext(userId, contextId);

        if (createContext.sourceText) {
            const estimate = await this.costEstimationService.estimateExerciseSetGeneration(
                createContext.sourceText,
                dto.type as unknown as ExerciseType,
                dto.difficulty as unknown as ExerciseDifficulty,
                dto.count,
                dto.generationMode
            );

            const session = await mongoose.startSession();

            session.startTransaction();

            try {
                await this.creditGuardService.assertAndDeduct(
                    userId,
                    estimate.credits,
                    CreditTransactionType.EXERCISE_SET_GENERATION,
                    session
                );

                const generateExercisesResponse = await this.aiService.generateExercises(
                    createContext.sourceText,
                    dto.type,
                    dto.difficulty,
                    dto.count,
                    dto.generationMode
                );

                const [exerciseSet] = await this.db.ExerciseSet.create(
                    [
                        {
                            user: new mongoose.Types.ObjectId(userId),
                            contextType: createContext.contextType,
                            contextId: createContext.contextId,
                            title: dto.title,
                            type: dto.type,
                            difficulty: dto.difficulty,
                            count: 0,
                            visibility: dto.visibility,
                        },
                    ],
                    { session }
                );

                for (const exercise of generateExercisesResponse.exercises) {
                    const createExerciseDto: CreateExerciseDto = {
                        type: exercise.type,
                        difficulty: exercise.difficulty,
                        stem: exercise.stem,
                    };

                    const strategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);

                    strategy.buildCreateExerciseDto(createExerciseDto, exercise);

                    await this.exerciseService.create(userId, exerciseSet._id, createExerciseDto, session);
                }

                await session.commitTransaction();

                return {
                    isSuccess: true,
                    message: `Exercise set created, type: ${exerciseSet.type}, difficulty: ${exerciseSet.difficulty}, exercise count: ${generateExercisesResponse.exercises.length}.`,
                };
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }
        } else {
            const exerciseSet = await this.db.ExerciseSet.create({
                user: new mongoose.Types.ObjectId(userId),
                contextType: createContext.contextType,
                contextId: createContext.contextId,
                title: dto.title,
                type: dto.type,
                difficulty: dto.difficulty,
                count: 0,
                visibility: dto.visibility,
            });

            return {
                isSuccess: true,
                message: `Exercise set created with type ${exerciseSet.type}`,
            };
        }
    }

    async generateAdditionalExercises(
        userId: string,
        exerciseSetId: string,
        dto: GenerateAdditionalExercisesDto
    ): Promise<ResponseBase> {
        const { exerciseSet } = await this.readById(userId, exerciseSetId);

        const contextStrategy = this.exerciseSetContextTypeFactory.resolveStrategy(exerciseSet.contextType);
        const { sourceText } = await contextStrategy.resolveAdditionalExercisesContext(userId, exerciseSet.contextId);

        const { exercises: existingExercises } = await this.exerciseService.readAllByExerciseSetId(
            userId,
            exerciseSetId
        );
        const existingPrompts = existingExercises.map((e) => e.stem);

        const estimate = await this.costEstimationService.estimateAdditionalExerciseGeneration(
            sourceText,
            dto.type as unknown as ExerciseType,
            dto.difficulty as unknown as ExerciseDifficulty,
            dto.count,
            dto.generationMode,
            existingPrompts
        );

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.creditGuardService.assertAndDeduct(
                userId,
                estimate.credits,
                CreditTransactionType.EXERCISE_SET_ADDITIONAL_GENERATION,
                session
            );

            const { exercises: generatedExercises } = await this.aiService.generateAdditionalExercises(
                sourceText,
                dto.type,
                dto.difficulty,
                dto.count,
                dto.generationMode,
                existingPrompts
            );

            for (const exercise of generatedExercises) {
                const createExerciseDto: CreateExerciseDto = {
                    type: exercise.type,
                    difficulty: exercise.difficulty,
                    stem: exercise.stem,
                };

                const strategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);

                strategy.buildCreateExerciseDto(createExerciseDto, exercise);

                await this.exerciseService.create(userId, exerciseSetId, createExerciseDto, session);
            }

            await session.commitTransaction();

            return {
                isSuccess: true,
                message: `${generatedExercises.length} additional exercises generated.`,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async generateNotes(userId: string, exerciseSetId: string): Promise<GenerateNotesResponse> {
        await this.readById(userId, exerciseSetId);

        const { exercises } = await this.exerciseService.readAllByExerciseSetId(userId, exerciseSetId);

        if (exercises.length === 0) {
            throw new BadRequestException('Cannot generate lecture notes for an exercise set with no exercises.');
        }

        const exercisesData = exercises.map((exercise) => {
            let answer: string;

            switch (exercise.type) {
                case ExerciseType.MULTIPLE_CHOICE:
                    answer = exercise.choices![exercise.correctChoiceIndex!];
                    break;
                case ExerciseType.TRUE_FALSE:
                    answer = exercise.correctChoiceIndex === 1 ? 'True' : 'False';
                    break;
                case ExerciseType.OPEN_ENDED:
                    answer = exercise.solution ?? '';
                    break;
            }

            return { prompt: exercise.stem, answer };
        });

        const estimate = await this.costEstimationService.estimateLectureNotesGeneration(exercisesData);

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.creditGuardService.assertAndDeduct(
                userId,
                estimate.credits,
                CreditTransactionType.LECTURE_NOTES_GENERATION,
                session
            );

            const { title, rawText } = await this.aiService.generateLectureNotes(exercisesData);

            await session.commitTransaction();

            return { isSuccess: true, message: 'Lecture notes generated.', title, rawText };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async saveGeneratedNotes(userId: string, exerciseSetId: string, dto: SaveGeneratedNotesDto): Promise<ResponseBase> {
        await this.readById(userId, exerciseSetId);

        const createSourceResponse = await this.sourceService.create(userId, {
            type: SourceType.RAW_TEXT,
            title: dto.title,
            rawText: dto.rawText,
            visibility: SourceVisibility.PRIVATE,
        });

        if (!createSourceResponse.isSuccess) {
            return createSourceResponse;
        }

        if (dto.link) {
            await this.changeContext(userId, exerciseSetId, {
                contextType: ExerciseSetContextType.SOURCE,
                contextId: createSourceResponse.sourceId!,
            });
        }

        return { isSuccess: true, message: 'Notes saved and linked to exercise set.' };
    }

    /**
     * Clones a public exercise set into the authenticated user's account.
     * The source set is read via public access (visibility: PUBLIC).
     * The cloned set defaults to PRIVATE visibility.
     * @param userId - The authenticated user cloning the set.
     * @param exerciseSetId - The public exercise set to clone.
     * @param dto - Contains the fields inputted from user clonning the set set.
     */
    async clone(userId: string, exerciseSetId: string, dto: CloneExerciseSetDto): Promise<ResponseBase> {
        const { exerciseSet: sourceExerciseSet } = await this.readById(undefined, exerciseSetId);

        if (sourceExerciseSet.user === userId) {
            throw new ForbiddenException('You cannot clone your own exercise set.');
        }

        const conflict = await this.db.ExerciseSet.findOne({ user: userId, title: dto.title });

        if (conflict) {
            return {
                isSuccess: false,
                message: `An exercise set with the title "${dto.title}" already exists.`,
            };
        }

        const { exercises } = await this.exerciseService.readAllByExerciseSetId(undefined, exerciseSetId);

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const [clonedSet] = await this.db.ExerciseSet.create(
                [
                    {
                        user: new mongoose.Types.ObjectId(userId),
                        contextType: ExerciseSetContextType.INDEPENDENT,
                        title: dto.title,
                        type: sourceExerciseSet.type,
                        difficulty: sourceExerciseSet.difficulty,
                        count: 0,
                        visibility: dto.visibility,
                    },
                ],
                { session }
            );

            for (const exercise of exercises) {
                const createDto: CreateExerciseDto = {
                    type: exercise.type,
                    difficulty: exercise.difficulty,
                    stem: exercise.stem,
                };

                if (exercise.choices) {
                    createDto.choices = exercise.choices;
                }

                if (exercise.correctChoiceIndex !== undefined) {
                    createDto.correctChoiceIndex = exercise.correctChoiceIndex;
                }

                if (exercise.solution) {
                    createDto.solution = exercise.solution;
                }

                await this.exerciseService.create(userId, clonedSet._id, createDto, session);
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        return { isSuccess: true, message: 'Exercise set cloned' };
    }

    async readAllByUserId(
        userId: string,
        readMultipleExerciseSetsFilterCriteriaDto: ReadMultipleExerciseSetsFilterCriteriaDto
    ): Promise<ReadAllExerciseSetsResponse> {
        const filter: mongoose.FilterQuery<ExerciseSetDocument> = {
            user: new mongoose.Types.ObjectId(userId),
        };

        const response = await this.sourceService.readAllByUserId(userId);

        if (
            readMultipleExerciseSetsFilterCriteriaDto.contextType === ExerciseSetContextType.SOURCE &&
            response.sources &&
            response.sources.length !== 0
        ) {
            const sourceIds = response.sources.map((s) => s._id);

            filter.contextId = { $in: sourceIds };
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
                contextId: source._id,
            });
            const extendedSource: ExtendedSourceDocument = {
                ...(source.toObject() as Omit<ExtendedSourceDocument, 'exerciseSets'>),
                exerciseSets: exerciseSetsOfSource,
            };

            sources.push(extendedSource);
        }

        return { isSuccess: true, message: 'All exercise sets read', sources };
    }

    /**
     * Reads an exercise set by id.
     * When userId is provided, validates ownership. When undefined, enforces visibility:PUBLIC.
     * @param userId - The owner's id, or undefined for public access.
     * @param exerciseSetId - The exercise set id.
     * @param session - Optional MongoDB session.
     */
    async readById(
        userId: string | undefined,
        exerciseSetId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ReadSingleExerciseSetResponse> {
        const filter: FilterQuery<ExerciseSetDocument> = { _id: exerciseSetId };

        if (userId) {
            filter.user = userId;
        } else {
            filter.visibility = ExerciseSetVisibility.PUBLIC;
        }

        const exerciseSet = await this.db.ExerciseSet.findOne(filter).session(session ?? null);

        if (!exerciseSet) {
            throw new NotFoundException(`No exerciseSet found by id ${exerciseSetId}.`);
        }

        return {
            isSuccess: true,
            message: `ExerciseSet read by id ${exerciseSetId}`,
            exerciseSet,
        };
    }

    /**
     * Reads all public exercise sets belonging to a user identified by userName.
     */
    async readAllPublicByUserName(userName: string): Promise<ReadAllExerciseSetsResponse> {
        const { user } = await this.userService.readPublicByUserName(userName);

        const exerciseSets = await this.db.ExerciseSet.find({
            user: user._id,
            visibility: ExerciseSetVisibility.PUBLIC,
        });

        return { isSuccess: true, message: 'Public exercise sets read', exerciseSets };
    }

    async updateById(
        userId: string,
        id: string,
        dto: UpdateExerciseSetDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const { title, ...restOfDto } = dto;

        if (title) {
            const { exerciseSet } = await this.readById(userId, id);

            if (!exerciseSet) throw new NotFoundException('exercise set not found');

            const conflict = await this.db.ExerciseSet.findOne({
                user: userId,
                title: title,
                _id: { $ne: id }, // exclude the current document from the search
            });

            if (conflict) {
                throw new ConflictException(`Another exercise set already uses the title "${title}".`);
            }
        }

        const updated = await this.db.ExerciseSet.findByIdAndUpdate(
            id,
            { $set: { ...restOfDto, title } },
            { new: true, session }
        );

        if (!updated) {
            throw new NotFoundException('exercise set not found');
        }

        return { isSuccess: true, message: 'exercise set updated' };
    }

    async changeContext(
        userId: string,
        exerciseSetId: string,
        dto: ChangeExerciseSetContextDto
    ): Promise<ResponseBase> {
        await this.readById(userId, exerciseSetId);

        const strategy = this.exerciseSetContextTypeFactory.resolveStrategy(dto.contextType);
        const { contextId } = await strategy.resolveChangeContext(userId, dto.contextId);

        const updated = await this.db.ExerciseSet.findByIdAndUpdate(
            exerciseSetId,
            { $set: { contextType: dto.contextType, contextId } },
            { new: true }
        );

        if (!updated) {
            throw new NotFoundException('Exercise set not found.');
        }

        return { isSuccess: true, message: 'Exercise set source updated.' };
    }

    async reorder(userId: string, id: string, dto: ReorderExercisesDto): Promise<ResponseBase> {
        await this.readById(userId, id);

        const { exercises } = await this.exerciseService.readAllByExerciseSetId(userId, id);
        const existingIds = new Set(exercises.map((e) => e._id.toString()));
        const allBelong = dto.orderedExerciseIds.every((id) => existingIds.has(id));

        if (!allBelong) {
            throw new BadRequestException('Some exercise IDs do not belong to this exercise set.');
        }

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            for (let i = 0; i < dto.orderedExerciseIds.length; i++) {
                await this.exerciseService.reorder(dto.orderedExerciseIds[i], i, session);
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        return { isSuccess: true, message: 'exercise set reordered' };
    }

    async registerExercise(
        userId: string,
        exerciseSetId: string,
        exerciseType: ExerciseType,
        exerciseDifficulty: ExerciseDifficulty,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const { exerciseSet } = await this.readById(userId, exerciseSetId, session);

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

        await this.db.ExerciseSet.findByIdAndUpdate(exerciseSetId, update, { session });

        return { isSuccess: true, message: 'Exercise registered.' };
    }

    async unregisterExercise(
        userId: string,
        exerciseSetId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const { exerciseSet } = await this.readById(userId, exerciseSetId, session);

        const update: Record<string, unknown> = { $inc: { count: -1 } };
        const $set: Record<string, unknown> = {};

        const isMixType = exerciseSet.type === ExerciseSetType.MIX;
        const isMixDifficulty = exerciseSet.difficulty === ExerciseSetDifficulty.MIX;

        if (isMixType || isMixDifficulty) {
            let exercises: ExerciseDocument[] = [];

            const result = await this.exerciseService.readAllByExerciseSetId(userId, exerciseSet._id, session);

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

        await this.db.ExerciseSet.findByIdAndUpdate(exerciseSetId, update, { session });

        return { isSuccess: true, message: 'Exercise unregistered.' };
    }

    async deleteById(userId: string, id: string): Promise<ResponseBase> {
        const deletedExerciseSet = await this.db.ExerciseSet.findOneAndDelete({ _id: id, user: userId });

        if (!deletedExerciseSet) {
            throw new NotFoundException('exercise set not found');
        }

        return { isSuccess: true, message: 'exercise set deleted' };
    }

    /**
     * Evaluates user answers against exercises.
     * Supports both owned and public exercise sets.
     * @param userId - The authenticated user evaluating answers (used for credit deduction).
     * @param dto - The answers to evaluate.
     * @param isPublicAccess - If true, skips ownership check on exercises (uses visibility: PUBLIC).
     */
    async evaluateAnswers(
        userId: string,
        dto: EvaluateAnswersDto,
        isPublicAccess = false
    ): Promise<EvaluateAnswersResponse> {
        const results = await Promise.allSettled(
            dto.exercises.map(async ({ id, answer }) => {
                const { exercise } = await this.exerciseService.readById(isPublicAccess ? undefined : userId, id);

                const strategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);
                const evaluatedAnswer = await strategy.evaluateAnswer(exercise, answer);

                if (!evaluatedAnswer.isSuccess || evaluatedAnswer.score === undefined || !evaluatedAnswer.feedback)
                    return null;

                return {
                    exerciseId: id,
                    exerciseType: exercise.type,
                    solution: exercise.solution,
                    correctChoiceIndex: exercise.correctChoiceIndex,
                    score: evaluatedAnswer.score,
                    feedback: evaluatedAnswer.feedback,
                    userAnswer: answer,
                } as ExerciseAnswerEvaluationResult;
            })
        );

        const exerciseAnswerEvaluationResults = results
            .filter(
                (r): r is PromiseFulfilledResult<ExerciseAnswerEvaluationResult> =>
                    r.status === 'fulfilled' && r.value !== null
            )
            .map((r) => r.value);

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

    async getPdf(userId: string | undefined, id: string, withAnswers = false): Promise<GetPdfResponse> {
        const { exerciseSet } = await this.readById(userId, id);
        const { exercises } = await this.exerciseService.readAllByExerciseSetId(userId, id);

        const contextStrategy = this.exerciseSetContextTypeFactory.resolveStrategy(exerciseSet.contextType);
        const sourceTypeTitle = await contextStrategy.resolvePdfContextTitle(userId, exerciseSet.contextId);

        return new Promise((resolve, reject) => {
            const document = new PDFDocument({ margins: { top: 36, bottom: 36, left: 72, right: 72 } });
            const buffers: Buffer[] = [];

            document.on('data', buffers.push.bind(buffers));
            document.on('error', reject);
            document.on('end', () => {
                const finalBuffer = Buffer.concat(buffers);

                resolve({
                    isSuccess: true,
                    message: 'PDF generated successfully.',
                    pdfBase64: finalBuffer.toString('base64'),
                });
            });

            document.font('Times-Bold').fontSize(16).text(exerciseSet.title, { align: 'center' });
            document.moveDown(0.5);

            // --- METADATA SECTION START ---
            document.fontSize(14);

            document.font('Times-Roman');
            const labelWidth = document.widthOfString('Association:  | Type:  | Difficulty:  | Count: ');

            document.font('Times-Italic');
            const valueWidth = document.widthOfString(
                `${sourceTypeTitle}${exerciseSet.type}${exerciseSet.difficulty}${exerciseSet.count}`
            );

            const totalWidth = labelWidth + valueWidth;
            const startX = (document.page.width - totalWidth) / 2;

            document
                .font('Times-Roman')
                .text('Source: ', startX, document.y, { continued: true })
                .font('Times-Italic')
                .text(`${sourceTypeTitle}`, { continued: true })
                .font('Times-Roman')
                .text(' | Type: ', { continued: true })
                .font('Times-Italic')
                .text(`${exerciseSet.type}`, { continued: true })
                .font('Times-Roman')
                .text(' | Difficulty: ', { continued: true })
                .font('Times-Italic')
                .text(`${exerciseSet.difficulty}`, { continued: true })
                .font('Times-Roman')
                .text(' | Count: ', { continued: true })
                .font('Times-Italic')
                .text(`${exerciseSet.count}`);

            document.x = document.page.margins.left;
            // --- METADATA SECTION END ---

            document.moveDown(2);

            const usableWidth = document.page.width - document.page.margins.left - document.page.margins.right;

            exercises.forEach((exercise, index) => {
                if (index > 0) {
                    document.moveDown(1.5);
                }

                // Calculate header height (number text line + moveDown(0.5) space)
                document.font('Times-Bold').fontSize(12);
                const headerHeight = document.currentLineHeight() + document.currentLineHeight() * 0.5;

                // Calculate exercise content height
                const exerciseTypeStrategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);

                document.font('Times-Roman').fontSize(12);
                const contentHeight = exerciseTypeStrategy.getRequiredHeight(exercise, document, usableWidth);

                // Check if total fits BEFORE drawing anything
                const availableHeight = document.page.height - document.page.margins.bottom - document.y;

                if (headerHeight + contentHeight > availableHeight) {
                    document.addPage();
                }

                // Draw "N ————————————————"
                const numberText = `${index + 1} `;

                document.font('Times-Bold').fontSize(12).text(numberText);
                const numberWidth = document.widthOfString(numberText);
                const lineY = document.y - document.currentLineHeight() / 2;

                document
                    .moveTo(document.page.margins.left + numberWidth, lineY)
                    .lineTo(document.page.width - document.page.margins.right, lineY)
                    .strokeColor('#333333')
                    .lineWidth(1)
                    .stroke();
                document.moveDown(0.5);

                document.font('Times-Roman').fontSize(12);
                exerciseTypeStrategy.drawExerciseToPdf(exercise, index, document, usableWidth);
            });

            if (withAnswers) {
                document.addPage();
                document.font('Times-Bold').fontSize(16).text('Answer Key', { align: 'center' });
                document.moveDown(1);

                exercises.forEach((exercise, index) => {
                    if (index > 0) {
                        document.moveDown(1.5);
                    }

                    const answerStrategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);
                    const answer = answerStrategy.getCorrectAnswerText(exercise);

                    // Calculate header height (number text line + moveDown(0.5) space)
                    document.font('Times-Bold').fontSize(12);
                    const headerHeight = document.currentLineHeight() + document.currentLineHeight() * 0.5;

                    // Calculate answer text height
                    document.font('Times-Roman').fontSize(12);
                    const answerHeight = document.heightOfString(answer, { width: usableWidth });

                    // Check if total fits BEFORE drawing anything
                    const availableHeight = document.page.height - document.page.margins.bottom - document.y;

                    if (headerHeight + answerHeight > availableHeight) {
                        document.addPage();
                    }

                    // Draw "N ————————————————"
                    const numberText = `${index + 1} `;

                    document.font('Times-Bold').fontSize(12).text(numberText);
                    const numberWidth = document.widthOfString(numberText);
                    const lineY = document.y - document.currentLineHeight() / 2;

                    document
                        .moveTo(document.page.margins.left + numberWidth, lineY)
                        .lineTo(document.page.width - document.page.margins.right, lineY)
                        .strokeColor('#333333')
                        .lineWidth(1)
                        .stroke();
                    document.moveDown(0.5);

                    document.font('Times-Roman').fontSize(12).text(answer);
                });
            }

            document.end();
        });
    }

    /**
     * Evaluates answers extracted from paper images.
     * @param userId - The authenticated user (used for credit deduction).
     * @param exerciseSetId - The exercise set to evaluate against.
     * @param files - Uploaded paper images.
     * @param isPublicAccess - If true, validates via visibility:PUBLIC instead of ownership.
     */
    async evaluatePaperAnswers(
        userId: string,
        exerciseSetId: string,
        files: Express.Multer.File[],
        isPublicAccess = false
    ): Promise<EvaluateAnswersResponse> {
        if (!files || files.length === 0) {
            throw new BadRequestException('At least one image file is required.');
        }

        const invalidFile = files.find((f) => !ALLOWED_PAPER_IMAGE_MIMETYPES.includes(f.mimetype));

        if (invalidFile) {
            throw new BadRequestException(
                `Unsupported file type: ${invalidFile.mimetype}. Allowed types: ${ALLOWED_PAPER_IMAGE_MIMETYPES.join(', ')}`
            );
        }

        const effectiveUserId = isPublicAccess ? undefined : userId;

        await this.readById(effectiveUserId, exerciseSetId);

        const { exercises } = await this.exerciseService.readAllByExerciseSetId(effectiveUserId, exerciseSetId);

        const exerciseSummary = exercises
            .map((exercise, index) => {
                const strategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);

                return strategy.buildPaperExtractionPrompt(index + 1, exercise);
            })
            .join('\n\n');

        const estimate = await this.costEstimationService.estimatePaperVisionExtraction(
            { imageCount: files.length },
            exerciseSummary,
            exercises.length
        );

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.creditGuardService.assertAndDeduct(
                userId,
                estimate.credits,
                CreditTransactionType.PAPER_VISION_EXTRACTION,
                session
            );

            const imageData = files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));
            const { extractedAnswers } = await this.aiService.extractAnswersFromPaperImages(
                imageData,
                exerciseSummary,
                exercises.length
            );

            await session.commitTransaction();

            const evaluateAnswersDto: EvaluateAnswersDto = {
                exercises: [],
            };

            for (const extractedAnswer of extractedAnswers) {
                const exerciseIndex = extractedAnswer.exerciseNumber - 1;

                if (exerciseIndex < 0 || exerciseIndex >= exercises.length) continue;

                const exercise = exercises[exerciseIndex];
                const paperStrategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);
                const normalizedAnswer = paperStrategy.normalizePaperAnswer(extractedAnswer.answer);

                evaluateAnswersDto.exercises.push({ id: exercise._id, answer: normalizedAnswer });
            }

            return this.evaluateAnswers(userId, evaluateAnswersDto, isPublicAccess);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // COST ESTIMATIONS ↓

    async estimateCreate(
        userId: string,
        contextId: string,
        dto: CreateExerciseSetDto
    ): Promise<CreditEstimateResponse> {
        const strategy = this.exerciseSetContextTypeFactory.resolveStrategy(dto.contextType);
        const createContext = await strategy.resolveCreateContext(userId, contextId);

        if (!createContext.sourceText) {
            return { isSuccess: true, message: 'No cost for this context type.', credits: 0, breakdown: {} };
        }

        return this.costEstimationService.estimateExerciseSetGeneration(
            createContext.sourceText,
            dto.type as unknown as ExerciseType,
            dto.difficulty as unknown as ExerciseDifficulty,
            dto.count,
            dto.generationMode
        );
    }

    async estimateAdditional(
        userId: string,
        exerciseSetId: string,
        dto: GenerateAdditionalExercisesDto
    ): Promise<CreditEstimateResponse> {
        const { exerciseSet } = await this.readById(userId, exerciseSetId);
        const contextStrategy = this.exerciseSetContextTypeFactory.resolveStrategy(exerciseSet.contextType);
        const { sourceText } = await contextStrategy.resolveAdditionalExercisesContext(userId, exerciseSet.contextId);
        const { exercises } = await this.exerciseService.readAllByExerciseSetId(userId, exerciseSetId);

        return this.costEstimationService.estimateAdditionalExerciseGeneration(
            sourceText,
            dto.type as unknown as ExerciseType,
            dto.difficulty as unknown as ExerciseDifficulty,
            dto.count,
            dto.generationMode,
            exercises.map((e) => e.stem)
        );
    }

    async estimatePaperVision(
        userId: string,
        exerciseSetId: string,
        dto: EstimateEvaluatePaperAnswersDto
    ): Promise<CreditEstimateResponse> {
        const { exercises } = await this.exerciseService.readAllByExerciseSetId(userId, exerciseSetId);
        const exerciseSummary = exercises
            .map((exercise, index) => {
                const strategy = this.exerciseService.resolveExerciseTypeStrategy(exercise.type);

                return strategy.buildPaperExtractionPrompt(index + 1, exercise);
            })
            .join('\n\n');

        return this.costEstimationService.estimatePaperVisionExtraction(dto, exerciseSummary, exercises.length);
    }

    async estimateLectureNotes(userId: string, exerciseSetId: string): Promise<CreditEstimateResponse> {
        const { exercises } = await this.exerciseService.readAllByExerciseSetId(userId, exerciseSetId);
        const exerciseData = exercises.map((exercise) => {
            let answer: string;

            switch (exercise.type) {
                case ExerciseType.MULTIPLE_CHOICE:
                    answer = exercise.choices![exercise.correctChoiceIndex!];
                    break;
                case ExerciseType.TRUE_FALSE:
                    answer = exercise.correctChoiceIndex === 1 ? 'True' : 'False';
                    break;
                case ExerciseType.OPEN_ENDED:
                    answer = exercise.solution ?? '';
                    break;
            }

            return { prompt: exercise.stem, answer };
        });

        return this.costEstimationService.estimateLectureNotesGeneration(exerciseData);
    }
}

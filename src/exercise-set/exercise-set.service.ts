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
import { ExerciseSetReadAllFilterCompositeProvider } from 'src/exercise-set/composites/read-all-filter/exercise-set-read-all-filter-composite.provider';
import { ALLOWED_PAPER_IMAGE_MIMETYPES } from 'src/exercise-set/constants/allowed-paper-image-mimetypes.constant';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';
import { ExerciseSetTypeFactory } from 'src/exercise-set/strategies/type/exercise-set-type.factory';
import { ChangeSourceDto } from 'src/exercise-set/types/dto/change-source.dto';
import { CloneExerciseSetDto } from 'src/exercise-set/types/dto/clone-exercise-set.dto';
import { CreateExerciseSetDto } from 'src/exercise-set/types/dto/create-exercise-set.dto';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';
import { GenerateAdditionalExercisesDto } from 'src/exercise-set/types/dto/generate-additional-exercises.dto';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { UpdateExerciseSetDto } from 'src/exercise-set/types/dto/update-exercise-set.dto';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import {
    EvaluateAnswersResponse,
    ExerciseAnswerEvaluationResult,
} from 'src/exercise-set/types/response/evaluate-answers.response';
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
import { SourceService } from 'src/source/source.service';
import { ExtendedSourceDocument } from 'src/source/types/extended-source-document.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ExerciseSetService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'ExerciseSet', mongoose.Model<ExerciseSetDocument>>,
        @Inject(forwardRef(() => ExerciseService)) private exerciseService: ExerciseService,
        private aiService: AiService,
        private sourceService: SourceService,
        private exerciseSetTypeFactory: ExerciseSetTypeFactory,
        private exerciseSetReadAllFilterCompositeProvider: ExerciseSetReadAllFilterCompositeProvider,
        private userService: UserService
    ) {}

    async create(userId: string, sourceId: string | undefined, dto: CreateExerciseSetDto): Promise<ResponseBase> {
        let sourceText;
        let sourceType;

        const conflict = await this.db.ExerciseSet.findOne({ userId, title: dto.title });

        if (conflict) {
            return {
                isSuccess: false,
                message: `An exercise set with the title "${dto.title}" already exists.`,
            };
        }

        if (sourceId) {
            const readSingleSourceResponse = await this.sourceService.readById(userId, sourceId);

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
                    dto.type,
                    dto.difficulty,
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
                                visibility: dto.visibility,
                            },
                        ],
                        { session }
                    );

                    for (const exercise of generateExercisesResponse.exercises) {
                        const createExerciseDto: CreateExerciseDto = {
                            type: exercise.type,
                            difficulty: exercise.difficulty,
                            prompt: exercise.prompt,
                        };

                        this.exerciseService.buildCreateExerciseDto(createExerciseDto, exercise);

                        await this.exerciseService.create(userId, exerciseSet._id, createExerciseDto, session);
                    }

                    await session.commitTransaction();

                    message = `Exercise set created, type: ${exerciseSet.type}, difficulty: ${exerciseSet.difficulty}, exercise count: ${generateExercisesResponse.exercises.length}.`;
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
                    visibility: dto.visibility,
                });

                message = `Exercises et created with type ${exerciseSet.type}`;
                break;
            }
        }

        return {
            isSuccess: true,
            message,
        };
    }

    async generateAdditionalExercises(
        userId: string,
        exerciseSetId: string,
        dto: GenerateAdditionalExercisesDto
    ): Promise<ResponseBase> {
        const { exerciseSet } = await this.readById(userId, exerciseSetId);

        if (exerciseSet.sourceType !== ExerciseSetSourceType.SOURCE) {
            throw new BadRequestException('Additional exercises can only be generated for SOURCE type exercise sets.');
        }

        const { source } = await this.sourceService.readById(userId, exerciseSet.sourceId);
        const sourceText = source.rawText;

        const { exercises: existingExercises } = await this.exerciseService.readAllByExerciseSetId(
            userId,
            exerciseSetId
        );
        const existingPrompts = existingExercises.map((e) => e.prompt);

        const { exercises: generatedExercises } = await this.aiService.generateAdditionalExercises(
            sourceText,
            dto.type,
            dto.difficulty,
            dto.count,
            existingPrompts
        );

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            for (const exercise of generatedExercises) {
                const createExerciseDto: CreateExerciseDto = {
                    type: exercise.type,
                    difficulty: exercise.difficulty,
                    prompt: exercise.prompt,
                };

                this.exerciseService.buildCreateExerciseDto(createExerciseDto, exercise);

                await this.exerciseService.create(userId, exerciseSetId, createExerciseDto, session);
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        return {
            isSuccess: true,
            message: `${generatedExercises.length} additional exercises generated.`,
        };
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

        if (sourceExerciseSet.userId.toString() === userId) {
            throw new ForbiddenException('You cannot clone your own exercise set.');
        }

        const conflict = await this.db.ExerciseSet.findOne({ userId, title: dto.title });

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
                        userId: new mongoose.Types.ObjectId(userId),
                        sourceType: ExerciseSetSourceType.INDEPENDENT,
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
                    prompt: exercise.prompt,
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
            filter.userId = userId;
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
            userId: user._id,
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
                userId: userId,
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

    async changeSource(userId: string, exerciseSetId: string, dto: ChangeSourceDto): Promise<ResponseBase> {
        await this.readById(userId, exerciseSetId);

        const update: Record<string, unknown> = {
            sourceType: dto.sourceType,
        };

        if (dto.sourceType === ExerciseSetSourceType.SOURCE) {
            await this.sourceService.readById(userId, dto.sourceId!);

            update.sourceId = new mongoose.Types.ObjectId(dto.sourceId!);
        } else {
            update.sourceId = null;
        }

        const updated = await this.db.ExerciseSet.findByIdAndUpdate(exerciseSetId, { $set: update }, { new: true });

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
    ): Promise<void> {
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
    }

    async unregisterExercise(
        userId: string,
        exerciseSetId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<void> {
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
    }

    async deleteById(userId: string, id: string): Promise<ResponseBase> {
        const deletedExerciseSet = await this.db.ExerciseSet.findOneAndDelete({ _id: id, userId });

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
        const exerciseAnswerEvaluationResults: ExerciseAnswerEvaluationResult[] = [];

        for (const { id, answer } of dto.exercises) {
            try {
                const { exercise } = await this.exerciseService.readById(isPublicAccess ? undefined : userId, id);

                const evaluatedAnswer = await this.exerciseService.evaluateAnswer(exercise, answer);

                if (!evaluatedAnswer.isSuccess || evaluatedAnswer.score === undefined || !evaluatedAnswer.feedback)
                    continue;

                exerciseAnswerEvaluationResults.push({
                    exerciseId: id,
                    exerciseType: exercise.type,
                    solution: exercise.solution,
                    correctChoiceIndex: exercise.correctChoiceIndex,
                    score: evaluatedAnswer.score,
                    feedback: evaluatedAnswer.feedback,
                    userAnswer: answer,
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

    async getPdf(userId: string | undefined, id: string, withAnswers = false): Promise<GetPdfResponse> {
        const { exerciseSet } = await this.readById(userId, id);
        const { exercises } = await this.exerciseService.readAllByExerciseSetId(userId, id);

        let sourceTypeTitle: string =
            exerciseSet.sourceType === ExerciseSetSourceType.INDEPENDENT
                ? ExerciseSetSourceType.INDEPENDENT
                : ExerciseSetSourceType.SOURCE;

        if (userId && exerciseSet.sourceType === ExerciseSetSourceType.SOURCE) {
            const { source } = await this.sourceService.readById(userId, exerciseSet.sourceId);

            sourceTypeTitle = source.title;
        }

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
            const labelWidth = document.widthOfString('Source:  | Type:  | Difficulty:  | Count: ');

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
                document.font('Times-Roman').fontSize(12);

                const availableHeight = document.page.height - document.page.margins.bottom - document.y;

                this.exerciseService.drawExerciseToPdf(exercise, index, document, usableWidth, availableHeight);

                document.moveDown(3);
            });

            if (withAnswers) {
                document.addPage();
                document.font('Times-Bold').fontSize(16).text('Answer Key', { align: 'center' });
                document.moveDown(1);

                exercises.forEach((exercise, index) => {
                    const lineHeight = 14 + 21; // approximate line + moveDown(1.5)
                    const availableHeight = document.page.height - document.page.margins.bottom - document.y;

                    if (availableHeight < lineHeight) {
                        document.addPage();
                    }

                    const answer = this.exerciseService.getCorrectAnswerText(exercise);

                    document
                        .font('Times-Bold')
                        .fontSize(12)
                        .text(`${index + 1} - `, { continued: true })
                        .font('Times-Roman')
                        .text(answer);

                    document.moveDown(1.5);
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
            .map((exercise, index) => this.exerciseService.buildPaperExtractionPrompt(exercise, index + 1))
            .join('\n\n');

        const imageData = files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));
        const extractedAnswers = await this.aiService.extractAnswersFromPaperImages(imageData, exerciseSummary);

        const evaluateAnswersDto: EvaluateAnswersDto = {
            exercises: [],
        };

        for (const extractedAnswer of extractedAnswers) {
            const exerciseIndex = extractedAnswer.exerciseNumber - 1;

            if (exerciseIndex < 0 || exerciseIndex >= exercises.length) continue;

            const exercise = exercises[exerciseIndex];
            const normalizedAnswer = this.exerciseService.normalizePaperAnswer(exercise, extractedAnswer.answer);

            evaluateAnswersDto.exercises.push({ id: exercise._id, answer: normalizedAnswer });
        }

        return this.evaluateAnswers(userId, evaluateAnswersDto, isPublicAccess);
    }
}

import PDFDocument from 'pdfkit';
import { GenerateAiExerciseSchema } from 'src/ai/types/generate-ai-exercise-schema.interface';
import { AiGeneratedExercise } from 'src/ai/types/response/generate-exercises.response';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

export interface ExerciseTypeStrategy {
    readonly type: ExerciseType;

    buildRestOfGenerateAiExerciseSchema(schema: GenerateAiExerciseSchema): void;
    buildCreateExerciseDto(dto: CreateExerciseDto, exercise: AiGeneratedExercise): void;
    validateFields(fields: { choices?: string[]; correctChoiceIndex?: number; solution?: string }): void;
    getCreateExerciseData(dto: CreateExerciseDto): Record<string, unknown>;
    evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse>;
    getRequiredHeight(exercise: ExerciseDocument, document: typeof PDFDocument, usableWidth: number): number;
    drawExerciseToPdf(
        exercise: ExerciseDocument,
        index: number,
        document: typeof PDFDocument,
        usableWidth: number
    ): void;
    buildPaperExtractionPrompt(exerciseNumber: number, exercise: ExerciseDocument): string;
    normalizePaperAnswer(rawAnswer: string): string;
    getCorrectAnswerText(exercise: ExerciseDocument): string;
}

import { ExtractedPaperAnswer } from 'src/ai/types/response/extract-paper-answers.response';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface ExtractPaperAnswersResultResponse extends ResponseBase {
    extractedAnswers: ExtractedPaperAnswer[];
}

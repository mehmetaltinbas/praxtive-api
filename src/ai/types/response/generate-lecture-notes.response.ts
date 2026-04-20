import ResponseBase from 'src/shared/types/response-base.interface';

export interface GenerateLectureNotesResponse extends ResponseBase {
    title: string;
    rawText: string;
}

import ResponseBase from 'src/shared/types/response-base.interface';

export interface TranscribeAudioResponse extends ResponseBase {
    text: string;
}

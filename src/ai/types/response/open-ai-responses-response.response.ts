import ResponseBase from 'src/shared/types/response-base.interface';

export interface OpenaiResponsesResponse extends ResponseBase {
    response: object;
}

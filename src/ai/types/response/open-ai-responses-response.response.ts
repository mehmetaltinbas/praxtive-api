import ResponseBase from 'src/shared/interfaces/response-base.interface';

export interface OpenaiResponsesResponse extends ResponseBase {
    response: object;
}

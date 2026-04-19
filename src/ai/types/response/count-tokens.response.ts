import ResponseBase from 'src/shared/types/response-base.interface';

export interface CountTokensResponse extends ResponseBase {
    tokenCount: number;
}

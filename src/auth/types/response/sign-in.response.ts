import ResponseBase from 'src/shared/types/response-base.interface';

export interface SignInResponse extends ResponseBase {
    jwt?: string;
    userId?: string;
    isEmailVerificationRequired: boolean;
    email?: string;
}

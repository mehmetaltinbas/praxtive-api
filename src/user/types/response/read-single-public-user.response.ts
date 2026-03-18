import ResponseBase from 'src/shared/types/response-base.interface';
import { PublicUserDocument } from 'src/user/types/public-user-document.interface';

export interface ReadSinglePublicUserResponse extends ResponseBase {
    user: PublicUserDocument;
}

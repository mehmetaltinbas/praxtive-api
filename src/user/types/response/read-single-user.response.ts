import ResponseBase from 'src/shared/interfaces/response-base.interface';
import { UserDocument } from 'src/user/types/user-document.interface';

export interface ReadSingleUserResponse extends ResponseBase {
    user?: UserDocument;
}

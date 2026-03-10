import ResponseBase from 'src/shared/types/response-base.interface';
import { UserDocument } from 'src/user/types/user-document.interface';

export interface ReadAllUsersResponse extends ResponseBase {
    users: UserDocument[];
}

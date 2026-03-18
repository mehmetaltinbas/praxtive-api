import { Document as MongooseDocument } from 'mongoose';
import { PublicUserDocument } from 'src/user/types/public-user-document.interface';

type PublicKeys = keyof Omit<PublicUserDocument, keyof MongooseDocument>;

// This helper ensures the array contains EVERY key in PublicKeys
function defineFields<T extends PublicKeys[]>(
    ...fields: T & ([PublicKeys] extends [T[number]] ? T : [never])
): PublicKeys[] {
    return fields;
}

export const PUBLIC_USER_FIELDS = defineFields('userName');
// If you add 'anotherFieldName' to PublicUserDocument, the line above will
// immediately throw a red squiggly error until you add 'email' here.

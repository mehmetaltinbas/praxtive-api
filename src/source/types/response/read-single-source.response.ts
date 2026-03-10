import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceDocument } from 'src/source/types/source-document.interface';

export interface ReadSingleSourceResponse extends ResponseBase {
    source: SourceDocument;
}

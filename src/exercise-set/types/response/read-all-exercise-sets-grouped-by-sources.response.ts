import ResponseBase from '../../../shared/types/response-base.interface';
import { ExtendedSourceDocument } from '../../../source/types/extended-source-document.interface';

export interface ReadAllExerciseSetsGroupedBySourcesResponse extends ResponseBase {
    sources?: ExtendedSourceDocument[];
}

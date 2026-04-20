import ResponseBase from 'src/shared/types/response-base.interface';
import { ExtendedSourceDocument } from 'src/source/types/extended-source-document.interface';

export interface ReadAllExerciseSetsGroupedBySourcesResponse extends ResponseBase {
    sources?: ExtendedSourceDocument[];
}

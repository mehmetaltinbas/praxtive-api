import { ExerciseSetReadAllFilterCompositeProvider } from 'src/exercise-set/composites/read-all-filter/exercise-set-read-all-filter-composite.provider';
import { SourceTypeReadAllFilter } from 'src/exercise-set/composites/read-all-filter/source-type-read-all-filter.provider';

export const exerciseSetReadAllFilterProviders = [
    ExerciseSetReadAllFilterCompositeProvider, 
    SourceTypeReadAllFilter
];

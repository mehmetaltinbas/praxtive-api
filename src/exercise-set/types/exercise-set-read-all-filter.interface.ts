import { FilterQuery } from 'mongoose';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';

export interface ExerciseSetReadAllFilter {
    filter(
        readMultipleExerciseSetsFilterCriteriaDto: ReadMultipleExerciseSetsFilterCriteriaDto,
        rootFilterQuery: FilterQuery<ExerciseSetDocument>
    ): FilterQuery<ExerciseSetDocument>;
}

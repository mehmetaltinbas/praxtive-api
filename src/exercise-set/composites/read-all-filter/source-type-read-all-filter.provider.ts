import { Injectable } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import { ExerciseSetReadAllFilter } from 'src/exercise-set/types/exercise-set-read-all-filter.interface';

@Injectable()
export class SourceTypeReadAllFilter implements ExerciseSetReadAllFilter {
    private children: ExerciseSetReadAllFilter[] = [];

    constructor() {}

    filter(
        readMultipleExerciseSetsFilterCriteriaDto: ReadMultipleExerciseSetsFilterCriteriaDto,
        filterQuery: FilterQuery<ExerciseSetDocument>
    ): FilterQuery<ExerciseSetDocument> {
        if (readMultipleExerciseSetsFilterCriteriaDto.contextType) {
            filterQuery.contextType = readMultipleExerciseSetsFilterCriteriaDto.contextType;
        }

        return filterQuery;
    }
}

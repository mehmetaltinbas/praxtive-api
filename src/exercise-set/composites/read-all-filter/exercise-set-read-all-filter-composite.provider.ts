import { Inject, Injectable } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { SourceTypeReadAllFilter } from 'src/exercise-set/composites/read-all-filter/source-type-read-all-filter.provider';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import { ExerciseSetReadAllFilter } from 'src/exercise-set/types/exercise-set-read-all-filter.interface';

@Injectable()
export class ExerciseSetReadAllFilterCompositeProvider implements ExerciseSetReadAllFilter {
    private children: ExerciseSetReadAllFilter[];

    constructor(@Inject(SourceTypeReadAllFilter) sourceTypeFilter: ExerciseSetReadAllFilter) {
        this.children = [sourceTypeFilter];
    }

    filter(
        readMultipleExerciseSetsFilterCriteriaDto: ReadMultipleExerciseSetsFilterCriteriaDto,
        filterQuery: FilterQuery<ExerciseSetDocument>
    ): FilterQuery<ExerciseSetDocument> {
        for (const child of this.children) {
            filterQuery = child.filter(readMultipleExerciseSetsFilterCriteriaDto, filterQuery);
        }

        return filterQuery;
    }
}

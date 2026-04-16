import { Type } from '@nestjs/common';
import { ExerciseSetContextTypeStrategy } from 'src/exercise-set/strategies/context-type/exercise-set-context-type-strategy.interface';
import { GroupExerciseSetContextTypeStrategy } from 'src/exercise-set/strategies/context-type/implementations/group-exercise-set-context-type.strategy';
import { IndependentExerciseSetContextTypeStrategy } from 'src/exercise-set/strategies/context-type/implementations/independent-exercise-set-context-type.strategy';
import { SourceExerciseSetContextTypeStrategy } from 'src/exercise-set/strategies/context-type/implementations/source-exercise-set-context-type.strategy';

export const ExerciseSetContextTypeStrategiesBarrel: Type<ExerciseSetContextTypeStrategy>[] = [
    SourceExerciseSetContextTypeStrategy,
    IndependentExerciseSetContextTypeStrategy,
    GroupExerciseSetContextTypeStrategy,
];

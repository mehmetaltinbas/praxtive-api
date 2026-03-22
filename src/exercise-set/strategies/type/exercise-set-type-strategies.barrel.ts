import { Type } from '@nestjs/common';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/exercise-set-type-strategy.interface';
import { MultipleChoiceExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/implementations/multiple-choice-exercise-set-type.strategy';
import { OpenEndedExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/implementations/open-ended-exercise-set-type.strategy';
import { TrueFalseExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/implementations/true-false-exercise-set-type.strategy';

export const ExerciseSetTypeStrategiesBarrel: Type<ExerciseSetTypeStrategy>[] = [
    MultipleChoiceExerciseSetTypeStrategy,
    TrueFalseExerciseSetTypeStrategy,
    OpenEndedExerciseSetTypeStrategy,
];

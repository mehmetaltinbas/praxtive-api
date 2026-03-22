import { Type } from '@nestjs/common';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';
import { MultipleChoiceExerciseTypeStrategy } from 'src/exercise/strategies/type/implementations/multiple-choice-exercise-type.strategy';
import { OpenEndedExerciseTypeStrategy } from 'src/exercise/strategies/type/implementations/open-ended-exercise-type.strategy';
import { TrueFalseExerciseTypeStrategy } from 'src/exercise/strategies/type/implementations/true-false-exercise-type.strategy';

export const ExerciseTypeStrategiesBarrel: Type<ExerciseTypeStrategy>[] = [
    MultipleChoiceExerciseTypeStrategy,
    TrueFalseExerciseTypeStrategy,
    OpenEndedExerciseTypeStrategy,
];

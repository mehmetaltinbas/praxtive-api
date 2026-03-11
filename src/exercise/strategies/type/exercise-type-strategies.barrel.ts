import { Type } from '@nestjs/common';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';
import { MCQExerciseTypeStrategy } from 'src/exercise/strategies/type/implementations/mcq-exercise-type.strategy';
import { OpenEndedExerciseTypeStrategy } from 'src/exercise/strategies/type/implementations/open-ended-exercise-type.strategy';
import { TrueFalseExerciseTypeStrategy } from 'src/exercise/strategies/type/implementations/true-false-type.strategy';

export const ExerciseTypeStrategiesBarrel: Type<ExerciseTypeStrategy>[] = [
    MCQExerciseTypeStrategy,
    TrueFalseExerciseTypeStrategy,
    OpenEndedExerciseTypeStrategy,
];

import { Type } from '@nestjs/common';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/exercise-set-type-strategy.interface';
import { MCQExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/implementations/mcq-exercise-set-type.strategy';
import { OpenEndedExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/implementations/open-ended-exercise-set-type.strategy';
import { TrueFalseExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/implementations/true-false-exercise-set-type.strategy';

export const ExerciseSetTypeStrategiesBarrel: Type<ExerciseSetTypeStrategy>[] = [
    MCQExerciseSetTypeStrategy,
    TrueFalseExerciseSetTypeStrategy,
    OpenEndedExerciseSetTypeStrategy,
];

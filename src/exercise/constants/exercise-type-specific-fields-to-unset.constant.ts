import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export const EXERCISE_TYPE_SPECIFIC_FIELDS_TO_UNSET: Record<ExerciseType, string[]> = {
    [ExerciseType.MCQ]: ['solution'],
    [ExerciseType.TRUE_FALSE]: ['choices', 'solution'],
    [ExerciseType.OPEN_ENDED]: ['choices', 'correctChoiceIndex'],
};

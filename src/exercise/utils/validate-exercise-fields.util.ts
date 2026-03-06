import { BadRequestException } from '@nestjs/common';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { MCQ_CHOICES_COUNT } from 'src/exercise/constants/mcq-choices-count.constant';

export function validateExerciseFields(
    type: ExerciseType,
    fields: { choices?: string[]; correctChoiceIndex?: number; solution?: string }
): void {
    switch (type) {
        case ExerciseType.MCQ:
            if (!fields.choices || fields.choices.length !== MCQ_CHOICES_COUNT) {
                throw new BadRequestException(`MCQ exercises must have exactly ${MCQ_CHOICES_COUNT} choices`);
            }
            if (fields.correctChoiceIndex === undefined || fields.correctChoiceIndex < 0 || fields.correctChoiceIndex > 4) {
                throw new BadRequestException('MCQ exercises must have a correctChoiceIndex between 0 and 4');
            }
            break;

        case ExerciseType.TRUE_FALSE:
            if (fields.correctChoiceIndex === undefined || (fields.correctChoiceIndex !== 0 && fields.correctChoiceIndex !== 1)) {
                throw new BadRequestException('TRUE_FALSE exercises must have a correctChoiceIndex of 0 or 1');
            }
            if (!fields.solution) {
                throw new BadRequestException('TRUE_FALSE exercises must have a solution');
            }
            break;

        case ExerciseType.OPEN_ENDED:
            if (!fields.solution) {
                throw new BadRequestException('OPEN_ENDED exercises must have a solution');
            }
            break;
    }
}

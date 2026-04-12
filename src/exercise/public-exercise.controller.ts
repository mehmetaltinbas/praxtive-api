import { Controller, Get, Param } from '@nestjs/common';
import { ExerciseService } from 'src/exercise/exercise.service';
import { ReadMultipleExercisesResponse } from 'src/exercise/types/response/read-multiple-exercises.response';

@Controller('/public-exercise')
export class PublicExerciseController {
    constructor(private exerciseService: ExerciseService) {}

    @Get('read-all-by-exercise-set-id/:exerciseSetId')
    async readAllPublicByExerciseSetId(
        @Param('exerciseSetId') exerciseSetId: string
    ): Promise<ReadMultipleExercisesResponse> {
        return await this.exerciseService.readAllByExerciseSetId(undefined, exerciseSetId);
    }
}

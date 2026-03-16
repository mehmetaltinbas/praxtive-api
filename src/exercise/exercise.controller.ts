// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { ExerciseService } from 'src/exercise/exercise.service';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { TransferExerciseDto } from 'src/exercise/types/dto/transfer-exercise.dto';
import { UpdateExerciseDto } from 'src/exercise/types/dto/update-exercise.dto';
import { ReadMultipleExercisesResponse } from 'src/exercise/types/response/read-multiple-exercises.response';
import { ReadSingleExerciseResponse } from 'src/exercise/types/response/read-single-exercise.response';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';

@Controller('exercise')
@UseGuards(AuthGuard)
export class ExerciseController {
    constructor(private exerciseService: ExerciseService) {}

    @Post('create-by-exercise-set-id/:exerciseSetId')
    async createByExerciseSetId(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string,
        @Body() createExerciseDto: CreateExerciseDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseService.create(user.sub, exerciseSetId, createExerciseDto);

        return response;
    }

    @Get('read-by-id/:id')
    async readById(@User() user: JwtPayload, @Param('id') id: string): Promise<ReadSingleExerciseResponse> {
        const response = await this.exerciseService.readById(user.sub, id);

        return response;
    }

    @Get('read-all-by-exercise-set-id/:exerciseSetId')
    async readAllByExerciseSetId(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string
    ): Promise<ReadMultipleExercisesResponse> {
        const response = await this.exerciseService.readAllByExerciseSetId(user.sub, exerciseSetId);

        return response;
    }

    @Patch('update-by-id/:id')
    async updateById(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateExerciseDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseService.updateById(user.sub, id, dto);

        return response;
    }

    @Post('transfer/:id')
    async transfer(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: TransferExerciseDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseService.transfer(user.sub, id, dto);

        return response;
    }

    @Delete('delete-by-id/:id')
    async deleteById(@User() user: JwtPayload, @Param('id') id: string): Promise<ResponseBase> {
        const response = await this.exerciseService.deleteById(user.sub, id);

        return response;
    }
}

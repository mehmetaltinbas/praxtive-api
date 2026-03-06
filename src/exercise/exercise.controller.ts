// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { TransferExerciseDto } from 'src/exercise/types/dto/transfer-exercise.dto';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { ExerciseService } from './exercise.service';
import { ReadAllExercisesResponse } from './types/response/read-all-exercises.response';
import { UpdateExerciseDto } from 'src/exercise/types/dto/update-exercise.dto';

@Controller('exercise')
@UseGuards(AuthGuard)
export class ExerciseController {
    constructor(private exerciseService: ExerciseService) {}

    @Post('create-by-exercise-set-id/:exerciseSetId')
    async createByExerciseSetId(
        @Param('exerciseSetId') exerciseSetId: string,
        @Body() createExerciseDto: CreateExerciseDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseService.create(exerciseSetId, createExerciseDto);

        return response;
    }

    @Get('read-all')
    async readAll(): Promise<ResponseBase> {
        const response = await this.exerciseService.readAll();

        return response;
    }

    @Get('read-by-id/:id')
    async readById(@Param('id') id: string): Promise<ResponseBase> {
        const response = await this.exerciseService.readById(id);

        return response;
    }

    @Get('read-all-by-exercise-set-id/:exerciseSetId')
    async readAllByExerciseSetId(@Param('exerciseSetId') exerciseSetId: string): Promise<ReadAllExercisesResponse> {
        const response = await this.exerciseService.readAllByExerciseSetId(exerciseSetId);

        return response;
    }

    @Patch('update-by-id/:id')
    async updateById(@Param('id') id: string, @Body() dto: UpdateExerciseDto): Promise<ResponseBase> {
        const response = await this.exerciseService.updateById(id, dto);

        return response;
    }

    @Delete('delete-by-id/:id')
    async deleteById(@Param('id') id: string): Promise<ResponseBase> {
        const response = await this.exerciseService.deleteById(id);

        return response;
    }

    @Post('transfer/:id')
    async transfer(@Param('id') id: string, @Body() dto: TransferExerciseDto): Promise<ResponseBase> {
        const response = await this.exerciseService.transfer(id, dto);

        return response;
    }
}

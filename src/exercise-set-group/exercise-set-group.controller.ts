// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { ExerciseSetGroupService } from 'src/exercise-set-group/exercise-set-group.service';
import { CreateExerciseSetGroupDto } from 'src/exercise-set-group/types/dto/create-exercise-set-group.dto';
import { UpdateExerciseSetGroupDto } from 'src/exercise-set-group/types/dto/update-exercise-set-group.dto';
import { ReadMultipleExerciseSetGroupsResponse } from 'src/exercise-set-group/types/response/read-multiple-exercise-set-groups.response';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';

@Controller('exercise-set-group')
@UseGuards(AuthGuard)
export class ExerciseSetGroupController {
    constructor(private exerciseSetGroupService: ExerciseSetGroupService) {}

    @Post('create')
    async create(@User() user: JwtPayload, @Body() dto: CreateExerciseSetGroupDto): Promise<ResponseBase> {
        return this.exerciseSetGroupService.create(user.sub, dto);
    }

    @Get('read-all-by-user-id')
    async readAllByUserId(@User() user: JwtPayload): Promise<ReadMultipleExerciseSetGroupsResponse> {
        return this.exerciseSetGroupService.readAllByUserId(user.sub);
    }

    @Patch('update-by-id/:id')
    async updateById(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateExerciseSetGroupDto
    ): Promise<ResponseBase> {
        return this.exerciseSetGroupService.updateById(user.sub, id, dto);
    }

    @Delete('delete-by-id/:id')
    async deleteById(@User() user: JwtPayload, @Param('id') id: string): Promise<ResponseBase> {
        return this.exerciseSetGroupService.deleteById(user.sub, id);
    }
}

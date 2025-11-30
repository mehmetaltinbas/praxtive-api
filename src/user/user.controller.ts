// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SignUpUserDto } from 'src/user/types/dto/sign-up-user.dto';
import { UpdateUserDto } from 'src/user/types/dto/update-user.dto';
import { ReadAllUsersResponse } from 'src/user/types/response/read-all-users.response';
import { ReadSingleUserResponse } from 'src/user/types/response/read-single-user.response';
import { AuthGuard } from '../auth/auth.guard';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    @Post('signup')
    async signUp(@Body() signUpUserDto: SignUpUserDto): Promise<ResponseBase> {
        const response = await this.userService.create(signUpUserDto);
        return response;
    }

    @Get('read-all')
    async readAll(): Promise<ReadAllUsersResponse> {
        const response = await this.userService.readAll();
        return response;
    }

    @Get('read-by-id/:id')
    async readById(@Param('id') id: string): Promise<ReadSingleUserResponse> {
        const response = await this.userService.readById(id);
        return response;
    }

    @Patch('update-by-id/:id')
    @UseGuards(AuthGuard)
    async updateById(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto
    ): Promise<ResponseBase> {
        const response = this.userService.updateById(id, updateUserDto);
        return response;
    }

    @Delete('delete-by-id/:id')
    @UseGuards(AuthGuard)
    async deleteById(@Param('id') id: string): Promise<ResponseBase> {
        const response = this.userService.deleteById(id);
        return response;
    }
}

// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import User from 'src/shared/custom-decorators/user.decorator';
import { UpdateUserPasswordDto } from 'src/user/types/dto/update-user-password.dto';
import { UpdateUserDto } from 'src/user/types/dto/update-user.dto';
import { ReadSinglePublicUserResponse } from 'src/user/types/response/read-single-public-user.response';
import { ReadSingleUserResponse } from 'src/user/types/response/read-single-user.response';
import { SearchPublicUsersResponse } from 'src/user/types/response/search-public-users.response';
import { UpdateUserResponse } from 'src/user/types/response/update-user.response';
import { AuthGuard } from '../auth/auth.guard';
import ResponseBase from '../shared/types/response-base.interface';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    @Get('read-by-token')
    @UseGuards(AuthGuard)
    async readByToken(@User() user: JwtPayload): Promise<ReadSingleUserResponse> {
        return await this.userService.readById(user.sub);
    }

    @Patch('update-by-token')
    @UseGuards(AuthGuard)
    async updateById(@User() user: JwtPayload, @Body() updateUserDto: UpdateUserDto): Promise<UpdateUserResponse> {
        return await this.userService.updateById(user.sub, updateUserDto);
    }

    @Patch('update-password')
    @UseGuards(AuthGuard)
    async updatePassword(@User() user: JwtPayload, @Body() dto: UpdateUserPasswordDto): Promise<ResponseBase> {
        return await this.userService.updatePassword(user.sub, dto);
    }

    @Delete('delete-by-token')
    @UseGuards(AuthGuard)
    async deleteByToken(@User() user: JwtPayload): Promise<ResponseBase> {
        return await this.userService.deleteById(user.sub);
    }

    @Get('read-by-user-name/:userName')
    async readPublicByUserName(@Param('userName') userName: string): Promise<ReadSinglePublicUserResponse> {
        return await this.userService.readPublicByUserName(userName);
    }

    @Get('read-public-by-id/:id')
    async readPublicById(@Param('id') id: string): Promise<ReadSinglePublicUserResponse> {
        return await this.userService.readPublicById(id);
    }

    @Get('search-by-user-name/:userName')
    async searchByUserName(@Param('userName') userName: string): Promise<SearchPublicUsersResponse> {
        return await this.userService.searchByUserName(userName);
    }
}

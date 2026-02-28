import {
    Body as BodyDecorator,
    Controller,
    Req,
    Post,
    Get,
    Patch,
    Delete,
    UseGuards,
    HttpCode,
    Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './types/auth-dtos';
import { SignInResponse } from './types/auth-responses';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { AuthGuard } from './auth.guard';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) {}

    @HttpCode(200)
    @Post('sign-in')
    async signIn(
        @BodyDecorator() signInDto: SignInDto,
        @Res() res: ExpressResponse
    ): Promise<ExpressResponse<any, Record<string, any>>> {
        const response = await this.authService.signInAsync(signInDto);

        if (!response.isSuccess) {
            return res.json({ isSuccess: response.isSuccess, message: response.message });
        }

        const jwtCookieName = this.configService.get<string>('JWT_COOKIE_NAME');

        if (jwtCookieName) {
            res.cookie(jwtCookieName, response.jwt, {
                httpOnly: true,
                maxAge: 3600000,
                // secure: true,
                sameSite: 'lax',
            });
        } else if (!jwtCookieName) {
            return res.json({
                isSuccess: false,
                message: 'no jwt cookie name provided as env variable',
            });
        }

        return res.json({ isSuccess: response.isSuccess, message: response.message });
    }

    @UseGuards(AuthGuard)
    @Get('authorize')
    async authorize(@Req() req: ExpressRequest): Promise<ResponseBase> {
        const response = await this.authService.authorizeAsync();

        return response;
    }
}

import {
    Body as BodyDecorator,
    Controller,
    Get,
    HttpCode,
    InternalServerErrorException,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SignInDto } from './types/auth-dtos';

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

        const jwtCookieName = this.configService.get<string>('JWT_COOKIE_NAME');

        if (!jwtCookieName) {
            throw new InternalServerErrorException('no jwt cookie name provided as env variable');
        }

        res.cookie(jwtCookieName, response.jwt, {
            httpOnly: true,
            maxAge: 3600000,
            // secure: true,
            sameSite: 'lax',
        });

        return res.json({ isSuccess: response.isSuccess, message: response.message });
    }

    @UseGuards(AuthGuard)
    @Get('authorize')
    async authorize(@Req() req: ExpressRequest): Promise<ResponseBase> {
        const response = await this.authService.authorizeAsync();

        return response;
    }
}

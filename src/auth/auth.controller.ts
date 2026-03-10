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
import ResponseBase from '../shared/types/response-base.interface';
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
        const response = await this.authService.signIn(signInDto);

        const jwtCookieName = this.configService.get<string>('JWT_COOKIE_NAME');

        if (!jwtCookieName) {
            throw new InternalServerErrorException('no jwt cookie name provided as env variable');
        }

        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

        res.cookie(jwtCookieName, response.jwt, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
        });

        return res.json({ isSuccess: response.isSuccess, message: response.message });
    }

    @UseGuards(AuthGuard)
    @HttpCode(200)
    @Post('sign-out')
    signOut(@Res() res: ExpressResponse): ExpressResponse<any, Record<string, any>> {
        const jwtCookieName = this.configService.get<string>('JWT_COOKIE_NAME');

        if (!jwtCookieName) {
            throw new InternalServerErrorException('no jwt cookie name provided as env variable');
        }

        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

        res.clearCookie(jwtCookieName, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
        });

        const response = this.authService.signOut();

        return res.json(response);
    }

    @UseGuards(AuthGuard)
    @Get('authorize')
    async authorize(@Req() req: ExpressRequest): Promise<ResponseBase> {
        const response = await this.authService.authorize();

        return response;
    }
}

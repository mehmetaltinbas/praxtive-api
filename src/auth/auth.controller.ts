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
import { Throttle } from '@nestjs/throttler';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthService } from 'src/auth/auth.service';
import { ForgotPasswordDto } from 'src/auth/types/dto/forgot-password.dto';
import { GoogleSignInDto } from 'src/auth/types/dto/google-sign-in.dto';
import { ResendVerificationDto } from 'src/auth/types/dto/resend-verification.dto';
import { ResetPasswordDto } from 'src/auth/types/dto/reset-password.dto';
import { SignInDto } from 'src/auth/types/dto/sign-in.dto';
import { SignUpDto } from 'src/auth/types/dto/sign-up.dto';
import { VerifyEmailDto } from 'src/auth/types/dto/verify-email.dto';
import ResponseBase from 'src/shared/types/response-base.interface';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) {}

    @Post('sign-up')
    async signUp(@BodyDecorator() dto: SignUpDto): Promise<ResponseBase> {
        return await this.authService.signUp(dto);
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @HttpCode(200)
    @Post('sign-in')
    async signIn(
        @BodyDecorator() signInDto: SignInDto,
        @Res() res: ExpressResponse
    ): Promise<ExpressResponse<any, Record<string, any>>> {
        const response = await this.authService.signIn(signInDto);

        const { jwt, userId, ...safeResponse } = response;

        if (jwt) {
            this.setJwtCookie(res, jwt);
        }

        return res.json(safeResponse);
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @HttpCode(200)
    @Post('google-sign-in')
    async signInWithGoogle(
        @BodyDecorator() dto: GoogleSignInDto,
        @Res() res: ExpressResponse
    ): Promise<ExpressResponse<any, Record<string, any>>> {
        const response = await this.authService.signInWithGoogle(dto);

        const { jwt, userId, ...safeResponse } = response;

        if (jwt) {
            this.setJwtCookie(res, jwt);
        }

        return res.json(safeResponse);
    }

    private setJwtCookie(res: ExpressResponse, jwt: string): void {
        const jwtCookieName = this.configService.get<string>('JWT_COOKIE_NAME');

        if (!jwtCookieName) {
            throw new InternalServerErrorException('no jwt cookie name provided as env variable');
        }

        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

        res.cookie(jwtCookieName, jwt, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
        });
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('verify-email')
    async verifyEmail(@BodyDecorator() dto: VerifyEmailDto): Promise<ResponseBase> {
        return await this.authService.verifyEmail(dto);
    }

    @Throttle({ default: { limit: 3, ttl: 120000 } })
    @Post('resend-verification')
    async resendVerification(@BodyDecorator() dto: ResendVerificationDto): Promise<ResponseBase> {
        return await this.authService.resendVerification(dto);
    }

    @Throttle({ default: { limit: 3, ttl: 120000 } })
    @Post('forgot-password')
    async forgotPassword(@BodyDecorator() dto: ForgotPasswordDto): Promise<ResponseBase> {
        return await this.authService.forgotPassword(dto);
    }

    @Throttle({ default: { limit: 3, ttl: 120000 } })
    @Post('reset-password')
    async resetPassword(@BodyDecorator() dto: ResetPasswordDto): Promise<ResponseBase> {
        return await this.authService.resetPassword(dto);
    }

    @UseGuards(AuthGuard)
    @Get('authorize')
    async authorize(@Req() req: ExpressRequest): Promise<ResponseBase> {
        return await this.authService.authorize();
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
}

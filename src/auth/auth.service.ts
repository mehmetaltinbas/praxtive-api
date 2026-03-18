import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { SignInDto } from 'src/auth/types/auth-dtos';
import { SignInResponse } from 'src/auth/types/auth-responses';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import ResponseBase from 'src/shared/types/response-base.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {}

    async signIn(signInUserDto: SignInDto): Promise<SignInResponse> {
        let user;

        try {
            const readSingleUserResponse = await this.userService.readPasswordHasByUserName(signInUserDto.userName);

            user = readSingleUserResponse.user;
        } catch {
            throw new UnauthorizedException('invalid userName');
        }

        const isMatch = await bcrypt.compare(signInUserDto.password, user.passwordHash);

        if (!isMatch) {
            throw new UnauthorizedException('invalid password');
        }

        const payload: JwtPayload = {
            sub: user._id,
            userName: user.userName,
        };
        const jwt = await this.jwtService.signAsync(payload);

        return {
            isSuccess: true,
            message: 'user signed in',
            jwt,
            userId: user._id,
        };
    }

    async authorize(): Promise<ResponseBase> {
        return { isSuccess: true, message: 'authorized' };
    }

    signOut(): ResponseBase {
        return { isSuccess: true, message: 'user signed out' };
    }
}

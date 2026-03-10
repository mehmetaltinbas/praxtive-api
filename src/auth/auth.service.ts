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
        let readSingleUserResponse;

        try {
            readSingleUserResponse = await this.userService.readByUserName(signInUserDto.userName);
        } catch {
            throw new UnauthorizedException('invalid credentials');
        }

        const isMatch = await bcrypt.compare(signInUserDto.password, readSingleUserResponse.user.passwordHash);

        if (!isMatch) {
            throw new UnauthorizedException('invalid credentials');
        }

        const payload: JwtPayload = {
            sub: readSingleUserResponse.user._id,
            userName: readSingleUserResponse.user.userName,
        };
        const jwt = await this.jwtService.signAsync(payload);

        return {
            isSuccess: true,
            message: 'user signed in',
            jwt,
            userId: readSingleUserResponse.user._id,
        };
    }

    async authorize(): Promise<ResponseBase> {
        return { isSuccess: true, message: 'authorized' };
    }

    signOut(): ResponseBase {
        return { isSuccess: true, message: 'user signed out' };
    }
}

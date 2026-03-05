import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { UserService } from '../user/user.service';
import { SignInDto } from './types/auth-dtos';
import { SignInResponse } from './types/auth-responses';
import JwtPayload from './types/jwt-payload.interface';

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
}

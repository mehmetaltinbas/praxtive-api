import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { SignInDto } from './types/auth-dtos';
import { SignInResponse } from './types/auth-responses';
import ResponseBase from '../shared/interfaces/response-base.interface';
import JwtPayload from './types/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {}

    async signInAsync(signInUserDto: SignInDto): Promise<SignInResponse> {
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

    async authorizeAsync(): Promise<ResponseBase> {
        return { isSuccess: true, message: 'authorized' };
    }
}

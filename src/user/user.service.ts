import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import mongoose, { Model } from 'mongoose';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SignUpUserDto } from 'src/user/types/dto/sign-up-user.dto';
import { UpdateUserPasswordDto } from 'src/user/types/dto/update-user-password.dto';
import { UpdateUserDto } from 'src/user/types/dto/update-user.dto';
import { ReadSingleUserResponse } from 'src/user/types/response/read-single-user.response';
import { UserDocument } from './types/user-document.interface';

@Injectable()
export class UserService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'User', Model<UserDocument>>,
        private configService: ConfigService
    ) {}

    async create(signUpUserDto: SignUpUserDto): Promise<ResponseBase> {
        const { password, ...restOfSignUpUserDto } = signUpUserDto;
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.db.User.create({
            passwordHash,
            ...restOfSignUpUserDto,
        });

        return { isSuccess: true, message: 'user created' };
    }

    async readById(id: string): Promise<ReadSingleUserResponse> {
        const user = await this.db.User.findById(id).exec();

        if (!user) {
            throw new NotFoundException(`user with given id not found`);
        }

        return { isSuccess: true, message: `user with given id read`, user };
    }

    async readByUserName(userName: string): Promise<ReadSingleUserResponse> {
        const user = await this.db.User.findOne({ userName });

        if (!user) {
            throw new NotFoundException(`user not found with userName: ${userName}`);
        }

        return { isSuccess: true, message: `user read with userName: ${userName}`, user };
    }

    async updateById(id: string, dto: UpdateUserDto, session?: mongoose.mongo.ClientSession): Promise<ResponseBase> {
        const user = await this.db.User.findByIdAndUpdate(id, { $set: dto }, { session, new: true });

        if (!user) {
            throw new NotFoundException('user not found');
        }

        return { isSuccess: true, message: 'user updated' };
    }

    async updatePassword(id: string, dto: UpdateUserPasswordDto): Promise<ResponseBase> {
        const user = await this.db.User.findById(id).select('+passwordHash');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);

        if (!isMatch) {
            throw new Error('Current password does not match');
        }

        const newPasswordHash = await bcrypt.hash(dto.oldPassword, 10);

        await this.db.User.updateOne({ _id: id }, { $set: { passwordHash: newPasswordHash } });

        return { isSuccess: true, message: 'Password updated successfully' };
    }

    async updateCreditBalance(
        id: string,
        amount: number,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        // We use $inc so that the balance is adjusted relative to its current value
        // Use a negative number for deductions, positive for additions
        const user = await this.db.User.findByIdAndUpdate(
            id,
            { $inc: { creditBalance: amount } },
            { session, new: true }
        );

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            isSuccess: true,
            message: `Credit balance updated by ${amount}. New balance: ${user.creditBalance}`,
        };
    }

    async deleteById(id: string): Promise<ResponseBase> {
        const user = await this.db.User.findByIdAndDelete(id);

        if (!user) {
            throw new NotFoundException('user not found');
        }

        return { isSuccess: true, message: 'user deleted' };
    }
}

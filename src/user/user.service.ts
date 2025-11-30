import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import mongoose, { Model } from 'mongoose';
import ResponseBase from 'src/shared/interfaces/response-base.interface';
import { SignUpUserDto } from 'src/user/types/dto/sign-up-user.dto';
import { UpdateUserDto } from 'src/user/types/dto/update-user.dto';
import { ReadAllUsersResponse } from 'src/user/types/response/read-all-users.response';
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

    async readAll(): Promise<ReadAllUsersResponse> {
        const users = await this.db.User.find().exec();
        return { isSuccess: true, message: 'all users read', users };
    }

    async readById(id: string): Promise<ReadSingleUserResponse> {
        const user = await this.db.User.findById(id).exec();
        if (!user) {
            return { isSuccess: false, message: `user with id ${id} couldn't read` };
        }
        return { isSuccess: true, message: `user with id ${id} read`, user };
    }

    async readByUserName(userName: string): Promise<ReadSingleUserResponse> {
        const user = await this.db.User.findOne({ userName });
        if (!user) {
            return {
                isSuccess: false,
                message: `user couldn't read with userName: ${userName}`,
            };
        }
        return { isSuccess: true, message: `user read with userName: ${userName}`, user };
    }

    async updateById(
        id: string,
        updateUserDto: UpdateUserDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        // console.log(updateUserDto);
        const { password, ...restOfUpdateUserDto } = updateUserDto;
        const updateData: Partial<UserDocument> = { ...restOfUpdateUserDto };
        if (password) {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }
        const user = await this.db.User.findByIdAndUpdate(id, updateData, { session });
        if (!user) {
            return { isSuccess: false, message: "user couldn't updated" };
        }
        return { isSuccess: true, message: 'user updated' };
    }

    async deleteById(id: string): Promise<ResponseBase> {
        const user = await this.db.User.findByIdAndDelete(id);
        if (!user) {
            return { isSuccess: false, message: "user couldn't deleted" };
        }
        return { isSuccess: true, message: 'user deleted' };
    }
}

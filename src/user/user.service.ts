import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
// eslint-disable-next-line no-redeclare
import crypto from 'crypto';
import mongoose from 'mongoose';
import { EmailService } from 'src/email/email.service';
import ResponseBase from 'src/shared/types/response-base.interface';
import { MIN_USER_NAME_LENGTH } from 'src/user/constants/min-user-name-length.constant';
import { PUBLIC_USER_FIELDS } from 'src/user/constants/public-user-fields.constant';
import { UpdateUserPasswordDto } from 'src/user/types/dto/update-user-password.dto';
import { UpdateUserDto } from 'src/user/types/dto/update-user.dto';
import { PublicUserDocument } from 'src/user/types/public-user-document.interface';
import { ReadSinglePublicUserResponse } from 'src/user/types/response/read-single-public-user.response';
import { ReadSingleUserResponse } from 'src/user/types/response/read-single-user.response';
import { SearchPublicUsersResponse } from 'src/user/types/response/search-public-users.response';
import { UpdateUserResponse } from 'src/user/types/response/update-user.response';
import { UserDocument } from 'src/user/types/user-document.interface';

@Injectable()
export class UserService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'User', mongoose.Model<UserDocument>>,
        private configService: ConfigService,
        private emailService: EmailService
    ) {}

    async readById(id: string): Promise<ReadSingleUserResponse> {
        const user = await this.db.User.findById(id)
            .select(
                '-passwordHash -googleId -pendingEmail -verificationCode -verificationCodeExpiresAt -paymentProviderCustomerId -allowsMarketing'
            )
            .exec();

        if (!user) {
            throw new NotFoundException(`user with given id not found`);
        }

        return { isSuccess: true, message: `user with given id read`, user };
    }

    async readByUserName(userName: string): Promise<ReadSingleUserResponse> {
        const user = await this.db.User.findOne({ userName }).select(
            '-passwordHash -googleId -pendingEmail -verificationCode -verificationCodeExpiresAt -paymentProviderCustomerId -allowsMarketing'
        );

        if (!user) {
            throw new NotFoundException(`user not found with userName: ${userName}`);
        }

        return { isSuccess: true, message: `user read with userName: ${userName}`, user };
    }

    async updateById(
        id: string,
        dto: UpdateUserDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<UpdateUserResponse> {
        const { userName, email } = dto;

        const currentUser = await this.db.User.findById(id).select('email googleId');

        if (!currentUser) {
            throw new NotFoundException('user not found');
        }

        if (userName) {
            const existingUser = await this.db.User.findOne({
                userName: userName,
                _id: { $ne: id },
            });

            if (existingUser) {
                throw new ConflictException('Username is already taken by another user');
            }
        }

        const isEmailChange = email && email !== currentUser.email;

        if (isEmailChange) {
            if (currentUser.googleId) {
                throw new BadRequestException('Email is managed by your Google account');
            }

            const existingEmailUser = await this.db.User.findOne({
                email,
                _id: { $ne: id },
            });

            if (existingEmailUser) {
                throw new ConflictException('Email is already taken by another user');
            }

            const code = crypto.randomInt(100000, 999999);
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            const updateFields: Record<string, any> = {
                pendingEmail: email,
                verificationCode: code,
                verificationCodeExpiresAt: expiresAt,
            };

            if (userName) {
                updateFields.userName = userName;
            }

            await this.db.User.updateOne({ _id: id }, { $set: updateFields }, { session });

            await this.emailService.sendVerificationEmail(email, code);

            return {
                isSuccess: true,
                message: 'Verification code sent to new email',
                emailVerificationRequired: true,
            };
        }

        const updateFields: Record<string, any> = {};

        if (userName) {
            updateFields.userName = userName;
        }

        if (Object.keys(updateFields).length > 0) {
            await this.db.User.updateOne({ _id: id }, { $set: updateFields }, { session });
        }

        return { isSuccess: true, message: 'user updated' };
    }

    async updatePassword(id: string, dto: UpdateUserPasswordDto): Promise<ResponseBase> {
        const user = await this.db.User.findById(id).select('+passwordHash');

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.passwordHash) {
            throw new BadRequestException('This account uses Google sign-in');
        }

        const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);

        if (!isMatch) {
            throw new Error('Current password does not match');
        }

        const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

        await this.db.User.updateOne({ _id: id }, { $set: { passwordHash: newPasswordHash } });

        return { isSuccess: true, message: 'Password updated successfully' };
    }

    async incrementCreditBalance(
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

    async deductCreditBalance(
        userId: string,
        amount: number,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const user = await this.db.User.findOneAndUpdate(
            { _id: userId, creditBalance: { $gte: amount } },
            { $inc: { creditBalance: -amount } },
            { session, new: true }
        );

        if (!user) {
            const currentUser = await this.db.User.findById(userId)
                .select('creditBalance')
                .session(session ?? null);

            const available = currentUser?.creditBalance ?? 0;

            throw new ForbiddenException(`Insufficient credits. Required: ${amount}, available: ${available}`);
        }

        return { isSuccess: true, message: 'Credit balance deducted.' };
    }

    async setPaymentProviderCustomerId(id: string, paymentProviderCustomerId: string): Promise<ResponseBase> {
        const result = await this.db.User.updateOne({ _id: id }, { $set: { paymentProviderCustomerId } });

        if (result.matchedCount === 0) {
            throw new NotFoundException('user not found');
        }

        return { isSuccess: true, message: 'stripe customer id set' };
    }

    async deleteById(id: string): Promise<ResponseBase> {
        const user = await this.db.User.findByIdAndDelete(id);

        if (!user) {
            throw new NotFoundException('user not found');
        }

        return { isSuccess: true, message: 'user deleted' };
    }

    /**
     * Reads a user's public profile by userName.
     * Only fields listed in PUBLIC_USER_FIELDS are returned.
     */
    async readPublicByUserName(userName: string): Promise<ReadSinglePublicUserResponse> {
        const user = await this.db.User.findOne({ userName }).select(PUBLIC_USER_FIELDS.join(' '));

        if (!user) {
            throw new NotFoundException(`user not found with userName: ${userName}`);
        }

        return { isSuccess: true, message: 'public user read', user: user as unknown as PublicUserDocument };
    }

    /**
     * Reads a user's public profile by userName.
     * Only fields listed in PUBLIC_USER_FIELDS are returned.
     */
    async readPublicById(id: string): Promise<ReadSinglePublicUserResponse> {
        const user = await this.db.User.findOne({ _id: id }).select(PUBLIC_USER_FIELDS.join(' '));

        if (!user) {
            throw new NotFoundException(`user not found with id: ${id}`);
        }

        return { isSuccess: true, message: 'public user read', user: user as unknown as PublicUserDocument };
    }

    async searchByUserName(userName: string): Promise<SearchPublicUsersResponse> {
        if (userName.length < MIN_USER_NAME_LENGTH) {
            throw new BadRequestException(`userName must be at least ${MIN_USER_NAME_LENGTH} characters`);
        }

        const users = await this.db.User.find({ userName: { $regex: userName, $options: 'i' } }).select(
            PUBLIC_USER_FIELDS.join(' ')
        );

        return {
            isSuccess: true,
            message: 'users searched by userName',
            users: users as unknown as PublicUserDocument[],
        };
    }
}

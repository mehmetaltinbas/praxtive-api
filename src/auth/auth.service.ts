import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
// eslint-disable-next-line no-redeclare
import crypto from 'crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import mongoose from 'mongoose';
import { ForgotPasswordDto } from 'src/auth/types/dto/forgot-password.dto';
import { GoogleSignInDto } from 'src/auth/types/dto/google-sign-in.dto';
import { ResendVerificationDto } from 'src/auth/types/dto/resend-verification.dto';
import { ResetPasswordDto } from 'src/auth/types/dto/reset-password.dto';
import { SignInDto } from 'src/auth/types/dto/sign-in.dto';
import { SignUpDto } from 'src/auth/types/dto/sign-up.dto';
import { VerifyEmailDto } from 'src/auth/types/dto/verify-email.dto';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { SignInResponse } from 'src/auth/types/response/sign-in.response';
import { EmailService } from 'src/email/email.service';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserDocument } from 'src/user/types/user-document.interface';

@Injectable()
export class AuthService {
    private readonly googleClient: OAuth2Client;

    constructor(
        @Inject('DB_MODELS') private db: Record<'User', mongoose.Model<UserDocument>>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private emailService: EmailService,
        private subscriptionService: SubscriptionService
    ) {
        this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
    }

    async signUp(dto: SignUpDto): Promise<ResponseBase> {
        const { userName, email, password, ...rest } = dto;

        const userByUserName = await this.db.User.findOne({ userName }).select('passwordHash isEmailVerified email');

        if (userByUserName) {
            if (!userByUserName.isEmailVerified && userByUserName.passwordHash) {
                const isMatch = await bcrypt.compare(password, userByUserName.passwordHash);

                if (isMatch) {
                    await this.generateAndSendVerificationCode(userByUserName);

                    return { isSuccess: true, message: 'verification email resent' };
                }
            }

            throw new ConflictException('Username is already taken');
        }

        const userByEmail = await this.db.User.findOne({ email }).select('_id isEmailVerified');

        if (userByEmail) {
            if (userByEmail.isEmailVerified) {
                throw new ConflictException('Email is already taken');
            }

            // Unverified squatter — never proved ownership. Evict so this legitimate
            // signUp can proceed. The post('findOneAndDelete') hook cleans up associated
            // Source records.
            await this.db.User.findOneAndDelete({ _id: userByEmail._id });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.db.User.create({
            userName,
            passwordHash,
            email,
            ...rest,
        });

        await this.subscriptionService.createInitialFreeSubscription(user._id.toString());
        await this.generateAndSendVerificationCode(user);

        return { isSuccess: true, message: 'user created, verification email sent' };
    }

    private async createGoogleUser(
        email: string,
        googleId: string,
        googleName: string | null
    ): Promise<mongoose.HydratedDocument<UserDocument>> {
        for (let attempt = 0; attempt < 5; attempt++) {
            const userName = await this.generateUniqueUserName(email, googleName, attempt > 0);

            try {
                const user = await this.db.User.create({
                    userName,
                    email,
                    googleId,
                    passwordHash: null,
                    isEmailVerified: true,
                });

                await this.subscriptionService.createInitialFreeSubscription(user._id.toString());

                return user;
            } catch (err) {
                if (this.isUserNameDuplicateKeyError(err)) continue;

                throw err;
            }
        }

        throw new InternalServerErrorException('could not allocate unique username');
    }

    async signIn(signInUserDto: SignInDto): Promise<SignInResponse> {
        const user = await this.db.User.findOne({ userName: signInUserDto.userName }).select(
            'passwordHash isEmailVerified userName email'
        );

        if (!user) {
            throw new UnauthorizedException('invalid userName');
        }

        if (!user.passwordHash) {
            throw new UnauthorizedException('This account uses Google sign-in');
        }

        const isMatch = await bcrypt.compare(signInUserDto.password, user.passwordHash);

        if (!isMatch) {
            throw new UnauthorizedException('invalid password');
        }

        if (!user.isEmailVerified) {
            await this.generateAndSendVerificationCode(user);

            return {
                isSuccess: false,
                message: 'Email not verified. A new verification code has been sent.',
                isEmailVerificationRequired: true,
                email: user.email,
            };
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
            isEmailVerificationRequired: false,
        };
    }

    async verifyEmail(dto: VerifyEmailDto): Promise<ResponseBase> {
        const user = await this.db.User.findOne({
            $or: [{ email: dto.email }, { pendingEmail: dto.email }],
        }).select('isEmailVerified pendingEmail verificationCode verificationCodeExpiresAt');

        if (!user) {
            throw new NotFoundException('user not found');
        }

        if (user.verificationCode !== dto.code) {
            throw new BadRequestException('invalid verification code');
        }

        if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
            throw new BadRequestException('verification code has expired');
        }

        const isPendingEmailChange = user.pendingEmail === dto.email;

        if (isPendingEmailChange) {
            await this.db.User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        email: user.pendingEmail,
                        pendingEmail: null,
                        verificationCode: null,
                        verificationCodeExpiresAt: null,
                    },
                }
            );

            return { isSuccess: true, message: 'email updated' };
        }

        if (user.isEmailVerified) {
            throw new BadRequestException('email is already verified');
        }

        await this.db.User.updateOne(
            { _id: user._id },
            {
                $set: {
                    isEmailVerified: true,
                    verificationCode: null,
                    verificationCodeExpiresAt: null,
                },
            }
        );

        return { isSuccess: true, message: 'email verified' };
    }

    async resendVerification(dto: ResendVerificationDto): Promise<ResponseBase> {
        const user = await this.db.User.findOne({
            $or: [{ email: dto.email }, { pendingEmail: dto.email }],
        }).select('isEmailVerified email pendingEmail');

        if (!user) {
            throw new NotFoundException('user not found');
        }

        const isPendingEmailChange = user.pendingEmail === dto.email;

        if (!isPendingEmailChange && user.isEmailVerified) {
            throw new BadRequestException('email is already verified');
        }

        const targetEmail = isPendingEmailChange ? user.pendingEmail! : user.email;

        await this.generateAndSendVerificationCode(user, targetEmail);

        return { isSuccess: true, message: 'verification email resent' };
    }

    async forgotPassword(dto: ForgotPasswordDto): Promise<ResponseBase> {
        const user = await this.db.User.findOne({ email: dto.email }).select('_id email googleId');

        if (!user) {
            throw new NotFoundException('no account exists with that email');
        }

        if (user.googleId) {
            throw new BadRequestException('This account uses Google sign-in');
        }

        await this.generateAndSendPasswordResetCode(user);

        return { isSuccess: true, message: 'password reset code sent' };
    }

    async signInWithGoogle(dto: GoogleSignInDto): Promise<SignInResponse> {
        const payload = await this.verifyGoogleCredential(dto.credential);

        const email = payload.email!;
        const googleId = payload.sub;
        const googleName = payload.name ?? payload.given_name ?? null;

        let user = await this.db.User.findOne({ googleId }).select('_id userName');

        if (!user) {
            const existingByEmail = await this.db.User.findOne({ email }).select(
                '_id isEmailVerified passwordHash googleId'
            );

            if (existingByEmail) {
                if (!existingByEmail.isEmailVerified) {
                    await this.db.User.findOneAndDelete({ _id: existingByEmail._id });
                } else if (existingByEmail.passwordHash) {
                    throw new ConflictException(
                        'An account with this email already exists. Sign in with your password.'
                    );
                } else {
                    throw new ConflictException('An account with this email already exists.');
                }
            }

            user = await this.createGoogleUser(email, googleId, googleName);
        }

        const jwtPayload: JwtPayload = {
            sub: user._id,
            userName: user.userName,
        };
        const jwt = await this.jwtService.signAsync(jwtPayload);

        return {
            isSuccess: true,
            message: 'signed in successfully',
            jwt,
            userId: user._id,
            isEmailVerificationRequired: false,
        };
    }

    private async verifyGoogleCredential(credential: string): Promise<TokenPayload> {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: credential,
                audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
            });
            const payload = ticket.getPayload();

            if (!payload || !payload.email || payload.email_verified !== true) {
                throw new Error('missing or unverified email');
            }

            return payload;
        } catch {
            throw new UnauthorizedException('invalid google credential');
        }
    }

    private isUserNameDuplicateKeyError(err: unknown): boolean {
        if (!(err instanceof mongoose.mongo.MongoServerError)) return false;
        if (err.code !== 11000) return false;

        const { keyPattern, keyValue } = err;

        return (
            (typeof keyPattern === 'object' && keyPattern !== null && 'userName' in keyPattern) ||
            (typeof keyValue === 'object' && keyValue !== null && 'userName' in keyValue)
        );
    }

    private async generateUniqueUserName(
        email: string,
        googleName: string | null,
        forceSuffix = false
    ): Promise<string> {
        const base =
            (googleName ?? email.split('@')[0])
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .slice(0, 20) || 'user';

        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = attempt === 0 && !forceSuffix ? base : `${base}${crypto.randomInt(1000, 9999)}`;
            const exists = await this.db.User.exists({ userName: candidate });

            if (!exists) return candidate;
        }

        return `${base}${Date.now()}`;
    }

    async resetPassword(dto: ResetPasswordDto): Promise<ResponseBase> {
        const user = await this.db.User.findOne({ email: dto.email }).select(
            'verificationCode verificationCodeExpiresAt'
        );

        if (!user) {
            throw new NotFoundException('no account exists with that email');
        }

        if (user.verificationCode !== dto.code) {
            throw new BadRequestException('invalid code');
        }

        if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
            throw new BadRequestException('code has expired');
        }

        const passwordHash = await bcrypt.hash(dto.newPassword, 10);

        await this.db.User.updateOne(
            { _id: user._id },
            {
                $set: {
                    passwordHash,
                    isEmailVerified: true,
                    verificationCode: null,
                    verificationCodeExpiresAt: null,
                    pendingEmail: null,
                },
            }
        );

        return { isSuccess: true, message: 'password reset successfully' };
    }

    async authorize(): Promise<ResponseBase> {
        return { isSuccess: true, message: 'authorized' };
    }

    signOut(): ResponseBase {
        return { isSuccess: true, message: 'user signed out' };
    }

    private async generateAndSendVerificationCode(user: UserDocument, targetEmail?: string): Promise<void> {
        const code = crypto.randomInt(100000, 999999);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.db.User.updateOne(
            { _id: user._id },
            { $set: { verificationCode: code, verificationCodeExpiresAt: expiresAt } }
        );

        await this.emailService.sendVerificationEmail(targetEmail ?? user.email, code);
    }

    private async generateAndSendPasswordResetCode(user: UserDocument): Promise<void> {
        const code = crypto.randomInt(100000, 999999);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.db.User.updateOne(
            { _id: user._id },
            { $set: { verificationCode: code, verificationCodeExpiresAt: expiresAt } }
        );

        await this.emailService.sendPasswordResetEmail(user.email, code);
    }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { APP_NAME } from 'src/shared/constants/app-name.constant';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private organizationReceiverEmail: string;

    constructor(private configService: ConfigService) {
        this.organizationReceiverEmail = this.configService.get<string>('ORGANIZATION_RECEIVER_EMAIL')!;
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: this.configService.get<number>('SMTP_PORT'),
            secure: true,
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });
    }

    async sendVerificationEmail(to: string, code: number): Promise<ResponseBase> {
        await this.transporter.sendMail({
            from: this.configService.get<string>('SMTP_FROM'),
            to,
            subject: `Your ${APP_NAME} verification code`,
            text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
        });

        return { isSuccess: true, message: 'Verification email sent.' };
    }

    async sendPasswordResetEmail(to: string, code: number): Promise<ResponseBase> {
        await this.transporter.sendMail({
            from: this.configService.get<string>('SMTP_FROM'),
            to,
            subject: `Your ${APP_NAME} password reset code`,
            text: `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
        });

        return { isSuccess: true, message: 'Password reset email sent.' };
    }

    async notifyNewFeedback(userId: string, feedback: string): Promise<ResponseBase> {
        await this.transporter.sendMail({
            from: this.configService.get<string>('SMTP_FROM'),
            to: this.organizationReceiverEmail,
            subject: `New User Feedback - ${APP_NAME}`,
            text: `User ${userId} sent feedback: ${feedback}`,
            html: `<p>User <strong>${userId}</strong> sent feedback: </p><p>${feedback}</p>`,
        });

        return { isSuccess: true, message: 'Feedback notification sent.' };
    }
}

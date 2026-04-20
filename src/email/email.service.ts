import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { APP_NAME } from 'src/shared/constants/app-name.constant';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private organizationReceiverEmails: string[];

    constructor(private configService: ConfigService) {
        const emailsRaw = this.configService.get<string>('ORGANIZATION_RECEIVER_EMAILS') || '';

        this.organizationReceiverEmails = emailsRaw
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email.length > 0);

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
        // Nodemailer's "to" field accepts an array of strings for multiple recipients
        await this.transporter.sendMail({
            from: this.configService.get<string>('SMTP_FROM'),
            to: this.organizationReceiverEmails,
            subject: `New User Feedback - ${APP_NAME}`,
            text: `User ${userId} sent feedback: ${feedback}`,
            html: `<p>User <strong>${userId}</strong> sent feedback: </p><p>${feedback}</p>`,
        });

        return { isSuccess: true, message: 'Feedback notification sent.' };
    }
}

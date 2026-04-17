import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { APP_NAME } from 'src/shared/constants/app-name.constant';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly resend: Resend;
    private readonly from: string;
    private readonly organizationReceiverEmail: string;

    constructor(private configService: ConfigService) {
        this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
        this.from = this.configService.get<string>('SMTP_FROM')!;
        this.organizationReceiverEmail = this.configService.get<string>('ORGANIZATION_RECEIVER_EMAIL')!;
    }

    async sendVerificationEmail(to: string, code: number): Promise<void> {
        await this.send({
            to,
            subject: `Your ${APP_NAME} verification code`,
            text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
        });
    }

    async sendPasswordResetEmail(to: string, code: number): Promise<void> {
        await this.send({
            to,
            subject: `Your ${APP_NAME} password reset code`,
            text: `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
        });
    }

    async notifyNewFeedback(userId: string, feedback: string): Promise<void> {
        await this.send({
            to: this.organizationReceiverEmail,
            subject: `New User Feedback - ${APP_NAME}`,
            text: `User ${userId} sent feedback: ${feedback}`,
            html: `<p>User <strong>${userId}</strong> sent feedback: </p><p>${feedback}</p>`,
        });
    }

    private async send(params: { to: string; subject: string; text: string; html: string }): Promise<void> {
        const { data, error } = await this.resend.emails.send({
            from: this.from,
            to: params.to,
            subject: params.subject,
            text: params.text,
            html: params.html,
        });

        if (error) {
            this.logger.error(`Resend send failed: ${error.name} - ${error.message}`);
            throw new InternalServerErrorException('Failed to send email.');
        }

        this.logger.log(`Resend sent ${data?.id ?? '(no id)'} to ${params.to}`);
    }
}

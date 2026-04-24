import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { APP_NAME } from 'src/shared/constants/app-name.constant';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend;
    private organizationReceiverEmails: string[];

    constructor(private configService: ConfigService) {
        const emailsRaw = this.configService.get<string>('ORGANIZATION_RECEIVER_EMAILS') || '';

        this.organizationReceiverEmails = emailsRaw
            .split(',')
            .map((email) => email.trim())
            .filter((email) => email.length > 0);

        this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    }

    async sendVerificationEmail(to: string, code: number): Promise<ResponseBase> {
        await this.send({
            to,
            subject: `Your ${APP_NAME} verification code`,
            text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
        });

        return { isSuccess: true, message: 'Verification email sent.' };
    }

    async sendPasswordResetEmail(to: string, code: number): Promise<ResponseBase> {
        await this.send({
            to,
            subject: `Your ${APP_NAME} password reset code`,
            text: `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
        });

        return { isSuccess: true, message: 'Password reset email sent.' };
    }

    async notifyNewFeedback(userId: string, feedback: string): Promise<ResponseBase> {
        await this.send({
            to: this.organizationReceiverEmails,
            subject: `New User Feedback - ${APP_NAME}`,
            text: `User ${userId} sent feedback: ${feedback}`,
            html: `<p>User <strong>${userId}</strong> sent feedback: </p><p>${feedback}</p>`,
        });

        return { isSuccess: true, message: 'Feedback notification sent.' };
    }

    private async send(options: { to: string | string[]; subject: string; text: string; html: string }): Promise<void> {
        const from = this.configService.get<string>('SMTP_FROM');

        if (!from) {
            const msg = 'SMTP_FROM is not configured';

            this.logger.error(msg);
            throw new Error(msg);
        }

        let result: Awaited<ReturnType<typeof this.resend.emails.send>>;

        try {
            result = await this.resend.emails.send({ from, ...options });
        } catch (err) {
            this.logger.error(
                `Email send threw for recipients ${JSON.stringify(options.to)}`,
                err instanceof Error ? err.stack : String(err)
            );
            throw err;
        }

        const { data, error } = result;

        if (error) {
            this.logger.error(
                `Resend API rejected email to ${JSON.stringify(options.to)}: ` +
                    `${error.name} (status ${error.statusCode}) - ${error.message}`
            );
            throw new Error(`Resend ${error.name}: ${error.message}`);
        }

        this.logger.log(`Email sent (id=${data?.id}) to ${JSON.stringify(options.to)}`);
    }
}

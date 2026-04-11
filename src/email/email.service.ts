import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { APP_NAME } from 'src/shared/constants/app-name.constant';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
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

    async sendVerificationEmail(to: string, code: string): Promise<void> {
        await this.transporter.sendMail({
            from: this.configService.get<string>('SMTP_FROM'),
            to,
            subject: `Your ${APP_NAME} verification code`,
            text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
            html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
        });
    }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { EmailService } from 'src/email/email.service';
import { CreateFeedbackDto } from 'src/feedback/types/dto/create-feedback.dto';
import { FeedbackDocument } from 'src/feedback/types/feedback-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class FeedbackService {
    private readonly logger = new Logger(FeedbackService.name);

    constructor(
        @Inject('DB_MODELS') private db: Record<'Feedback', mongoose.Model<FeedbackDocument>>,
        private configService: ConfigService,
        private emailService: EmailService
    ) {}

    async create(userId: string, dto: CreateFeedbackDto): Promise<ResponseBase> {
        const feedback = await this.db.Feedback.create({
            userId,
            content: dto.content,
        });

        try {
            await this.emailService.notifyNewFeedback(userId, dto.content);
        } catch (err) {
            this.logger.error(
                `Feedback ${feedback._id} saved but email notification failed`,
                err instanceof Error ? err.stack : String(err)
            );
        }

        return {
            isSuccess: true,
            message: 'Feedback created.',
        };
    }
}

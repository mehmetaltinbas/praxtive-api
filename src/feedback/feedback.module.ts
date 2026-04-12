import { Module } from '@nestjs/common';
import { FeedbackController } from 'src/feedback/feedback.controller';
import { FeedbackService } from 'src/feedback/feedback.service';

@Module({
    imports: [],
    controllers: [FeedbackController],
    providers: [FeedbackService],
    exports: [],
})
export class FeedbackModule {}

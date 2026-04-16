// eslint-disable-next-line no-redeclare
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { FeedbackService } from 'src/feedback/feedback.service';
import { CreateFeedbackDto } from 'src/feedback/types/dto/create-feedback.dto';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';

@Controller('feedback')
export class FeedbackController {
    constructor(private feedbackService: FeedbackService) {}

    @UseGuards(AuthGuard)
    @Post('create')
    async create(@User() user: JwtPayload, @Body() dto: CreateFeedbackDto): Promise<ResponseBase> {
        return this.feedbackService.create(user.sub, dto);
    }
}

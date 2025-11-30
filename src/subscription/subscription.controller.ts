// eslint-disable-next-line no-redeclare
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/interfaces/response-base.interface';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateSubscriptionDto } from 'src/subscription/types/dto/create-subscription.dto';

@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
    constructor(private subscriptionService: SubscriptionService) {}

    @Post('create')
    async create(
        @User() user: JwtPayload,
        @Body() createSubscriptionDto: CreateSubscriptionDto
    ): Promise<ResponseBase> {
        const response = await this.subscriptionService.create(
            user.sub,
            createSubscriptionDto
        );
        return response;
    }
}

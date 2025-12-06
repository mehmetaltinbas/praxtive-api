// eslint-disable-next-line no-redeclare
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/interfaces/response-base.interface';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateSubscriptionDto } from 'src/subscription/types/dto/create-subscription.dto';
import { DowngradeSubscriptionDto } from 'src/subscription/types/dto/downgrade-subscription.dto';
import { UpgradeSubscriptionDto } from 'src/subscription/types/dto/upgrade-subscription.dto';

@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
    constructor(private subscriptionService: SubscriptionService) {}

    @Post('upgrade')
    async upgrade(
        @User() user: JwtPayload,
        @Body() upgradeSubscriptionDto: UpgradeSubscriptionDto
    ): Promise<ResponseBase> {
        const response = await this.subscriptionService.upgrade(
            user.sub,
            upgradeSubscriptionDto
        );
        return response;
    }

    @Post('check-price-to-pay-on-upgrade')
    async checkPriceToPayOnUpgrade(
        @User() user: JwtPayload,
        @Body() upgradeSubscriptionDto: UpgradeSubscriptionDto
    ): Promise<ResponseBase> {
        const response = await this.subscriptionService.checkPriceToPayOnUpgrade(
            user.sub,
            upgradeSubscriptionDto
        );
        return response;
    }

    @Post('downgrade')
    async downgrade(
        @User() user: JwtPayload,
        @Body() downgradeSubscriptionDto: DowngradeSubscriptionDto
    ): Promise<ResponseBase> {
        const response = await this.subscriptionService.downgrade(
            user.sub,
            downgradeSubscriptionDto
        );
        return response;
    }
}

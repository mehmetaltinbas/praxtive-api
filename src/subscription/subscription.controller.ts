// eslint-disable-next-line no-redeclare
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { DowngradeSubscriptionDto } from 'src/subscription/types/dto/downgrade-subscription.dto';
import { UpgradeSubscriptionDto } from 'src/subscription/types/dto/upgrade-subscription.dto';
import { CheckPriceToPayOnUpgradeSubscriptionResponse } from 'src/subscription/types/response/check-price-to-pay-on-upgrade-subscription.response';

@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
    constructor(private subscriptionService: SubscriptionService) {}

    @Get('test')
    async test(): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return await this.subscriptionService.test();
    }

    @Post('upgrade')
    async upgrade(
        @User() user: JwtPayload,
        @Body() upgradeSubscriptionDto: UpgradeSubscriptionDto
    ): Promise<ResponseBase> {
        return await this.subscriptionService.upgrade(user.sub, upgradeSubscriptionDto);
    }

    @Post('check-price-to-pay-on-upgrade')
    async checkPriceToPayOnUpgrade(
        @User() user: JwtPayload,
        @Body() upgradeSubscriptionDto: UpgradeSubscriptionDto
    ): Promise<CheckPriceToPayOnUpgradeSubscriptionResponse> {
        return await this.subscriptionService.checkPriceToPayOnUpgrade(user.sub, upgradeSubscriptionDto);
    }

    @Post('downgrade')
    async downgrade(
        @User() user: JwtPayload,
        @Body() downgradeSubscriptionDto: DowngradeSubscriptionDto
    ): Promise<ResponseBase> {
        return await this.subscriptionService.downgrade(user.sub, downgradeSubscriptionDto);
    }

    @Post('cancel-downgrade')
    async cancelDowngrade(@User() user: JwtPayload): Promise<ResponseBase> {
        return await this.subscriptionService.cancelDowngrade(user.sub);
    }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalculateProrationResponse } from 'src/billing/response/calculate-proration.response';
import { UserService } from 'src/user/user.service';

@Injectable()
export class BillingService {
    // handle payment processings, invoice generation, payment webhooks, refunds/chargebacks
    constructor(
        private configService: ConfigService,
        private userService: UserService
    ) {}

    calculateProrationOnUpgrade(
        nextBillingDate: Date,
        currentPlanMonthlyPrice: number,
        newPlanMonthlyPrice: number
    ): CalculateProrationResponse {
        const diffMs = nextBillingDate.getTime() - new Date().getTime();
        const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const extractedPrice = currentPlanMonthlyPrice * (remainingDays / 30);
        const priceToPay = Number((newPlanMonthlyPrice - extractedPrice).toFixed(2));
        return {
            isSuccess: true,
            message: 'prorationed price calculated',
            prorationedPriceToPay: priceToPay,
            extractedPrice,
            remainingDays,
        };
    }

    // async processPayment(): Promise<ResponseBase> {

    // }
}

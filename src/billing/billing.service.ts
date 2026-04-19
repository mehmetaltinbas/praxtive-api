import { Injectable } from '@nestjs/common';
import { CalculateProrationResponse } from 'src/billing/types/response/calculate-proration.response';

@Injectable()
export class BillingService {

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

}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';

@Injectable()
export class BillingService {
    // handle payment processings, invoice generation, payment webhooks, refunds/chargebacks
    constructor(
        private configService: ConfigService,
        private userService: UserService
    ) {}

    // async consumeCredits() {}

    // async purchaseCredits() {}

    // async readCreditTransactionHistory() {}
}

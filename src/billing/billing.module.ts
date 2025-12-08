import { forwardRef, Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { BillingService } from './billing.service';

@Module({
    imports: [UserModule, forwardRef(() => SubscriptionModule)],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule {}

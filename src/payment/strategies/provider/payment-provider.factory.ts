import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentProviderStrategiesBarrel } from 'src/payment/strategies/provider/payment-provider-strategies.barrel';
import { PaymentProviderStrategy } from 'src/payment/strategies/provider/payment-provider-strategy.interface';

@Injectable()
export class PaymentProviderFactory implements OnModuleInit {
    private readonly strategyMap: Map<PaymentProviderName, PaymentProviderStrategy> = new Map();

    constructor(private readonly moduleRef: ModuleRef) {}

    onModuleInit(): void {
        for (const strategy of PaymentProviderStrategiesBarrel) {
            const instance = this.moduleRef.get(strategy, { strict: false });

            this.strategyMap.set(instance.type, instance);
        }
    }

    resolveStrategy(type: PaymentProviderName): PaymentProviderStrategy {
        const strategy = this.strategyMap.get(type);

        if (!strategy) {
            throw new BadRequestException(`no strategy found for payment provider: ${type}`);
        }

        return strategy;
    }
}

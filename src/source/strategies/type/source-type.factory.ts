import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceTypeStrategiesBarrel } from 'src/source/strategies/type/source-type-strategies.barrel';
import { SourceTypeStrategy } from 'src/source/strategies/type/source-type-strategy.interface';

@Injectable()
export class SourceTypeFactory implements OnModuleInit {
    private readonly strategyMap: Map<SourceType, SourceTypeStrategy> = new Map();

    constructor(private readonly moduleRef: ModuleRef) {}

    onModuleInit(): void {
        for (const strategy of SourceTypeStrategiesBarrel) {
            const instance = this.moduleRef.get(strategy, { strict: false });

            this.strategyMap.set(instance.type, instance);
        }
    }

    resolveStrategy(type: SourceType): SourceTypeStrategy {
        const strategy = this.strategyMap.get(type);

        if (!strategy) {
            throw new BadRequestException(`no strategy found for source type: ${type}`);
        }

        return strategy;
    }
}

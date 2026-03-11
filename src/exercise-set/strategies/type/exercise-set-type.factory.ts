import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetTypeStrategiesBarrel } from 'src/exercise-set/strategies/type/exercise-set-type-strategies.barrel';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/exercise-set-type-strategy.interface';

@Injectable()
export class ExerciseSetTypeFactory implements OnModuleInit {
    private readonly strategyMap: Map<ExerciseSetType, ExerciseSetTypeStrategy> = new Map();

    constructor(private readonly moduleRef: ModuleRef) {}

    onModuleInit(): void {
        for (const strategy of ExerciseSetTypeStrategiesBarrel) {
            const instance = this.moduleRef.get(strategy, { strict: false });

            this.strategyMap.set(instance.type, instance);
        }
    }

    resolveStrategy(type: ExerciseSetType): ExerciseSetTypeStrategy {
        const strategy = this.strategyMap.get(type);

        if (!strategy) {
            throw new BadRequestException(`no strategy found for exercise type: ${type}`);
        }

        return strategy;
    }
}

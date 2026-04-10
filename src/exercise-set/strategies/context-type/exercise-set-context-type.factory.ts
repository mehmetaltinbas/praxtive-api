import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import { ExerciseSetContextTypeStrategiesBarrel } from 'src/exercise-set/strategies/context-type/exercise-set-context-type-strategies.barrel';
import { ExerciseSetContextTypeStrategy } from 'src/exercise-set/strategies/context-type/exercise-set-context-type-strategy.interface';

@Injectable()
export class ExerciseSetContextTypeFactory implements OnModuleInit {
    private readonly strategyMap: Map<ExerciseSetContextType, ExerciseSetContextTypeStrategy> = new Map();

    constructor(private readonly moduleRef: ModuleRef) {}

    onModuleInit(): void {
        for (const strategy of ExerciseSetContextTypeStrategiesBarrel) {
            const instance = this.moduleRef.get(strategy, { strict: false });

            this.strategyMap.set(instance.type, instance);
        }
    }

    resolveStrategy(type: ExerciseSetContextType): ExerciseSetContextTypeStrategy {
        const strategy = this.strategyMap.get(type);

        if (!strategy) {
            throw new BadRequestException(`no strategy found for exercise set context type: ${type}`);
        }

        return strategy;
    }
}

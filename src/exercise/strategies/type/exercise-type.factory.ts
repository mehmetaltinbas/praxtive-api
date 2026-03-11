import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseTypeStrategiesBarrel } from 'src/exercise/strategies/type/exercise-type-strategies.barrel';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';

@Injectable()
export class ExerciseTypeFactory implements OnModuleInit {
    private readonly strategyMap: Map<ExerciseType, ExerciseTypeStrategy> = new Map();

    constructor(private readonly moduleRef: ModuleRef) {}

    onModuleInit(): void {
        for (const strategy of ExerciseTypeStrategiesBarrel) {
            const instance = this.moduleRef.get(strategy, { strict: false });

            this.strategyMap.set(instance.type, instance);
        }
    }

    resolveStrategy(type: ExerciseType): ExerciseTypeStrategy {
        const strategy = this.strategyMap.get(type);

        if (!strategy) {
            throw new BadRequestException(`no strategy found for exercise type: ${type}`);
        }

        return strategy;
    }
}

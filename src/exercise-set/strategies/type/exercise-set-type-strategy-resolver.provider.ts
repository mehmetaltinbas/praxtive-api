import { BadRequestException, Injectable } from '@nestjs/common';
import { MCQTypeStrategyProvider } from 'src/exercise-set/strategies/type/mcq-type.strategy.provider';
import { OpenEndedTypeStrategyProvider } from 'src/exercise-set/strategies/type/open-ended-type.strategy.provider';
import { TrueFalseTypeStrategyProvider } from 'src/exercise-set/strategies/type/true-false-type.strategy.provider';
import { ResolveTypeStrategyProviderResponse } from 'src/exercise-set/types/response/resolve-type-strategy-provider.response';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/types/strategy/exercise-set-type.strategy.interface';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

@Injectable()
export class ExerciseSetTypeStrategyResolverProvider {
    private readonly strategyMap: Map<string, ExerciseSetTypeStrategy>;

    constructor(
        private mcqTypeStrategy: MCQTypeStrategyProvider,
        private trueFalseTypeStrategy: TrueFalseTypeStrategyProvider,
        private openEndedTypeStrategy: OpenEndedTypeStrategyProvider
    ) {
        this.strategyMap = new Map<string, ExerciseSetTypeStrategy>([
            [ExerciseType.MCQ, this.mcqTypeStrategy],
            [ExerciseType.TRUE_FALSE, this.trueFalseTypeStrategy],
            [ExerciseType.OPEN_ENDED, this.openEndedTypeStrategy],
        ]);
    }

    resolveTypeStrategyProvider(type: string): ResolveTypeStrategyProviderResponse {
        const strategy = this.strategyMap.get(type);

        if (!strategy) {
            throw new BadRequestException(`no strategy found for exercise type: ${type}`);
        }

        return { isSuccess: true, message: 'strategy is resolved', strategy };
    }
}

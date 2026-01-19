import { forwardRef, Module } from '@nestjs/common';
import { exerciseSetReadAllFilterProviders } from 'src/exercise-set/composites/read-all-filter/read-all-filter-providers.barrel';
import { ExerciseSetTypeStrategyResolverProvider } from 'src/exercise-set/strategies/type/exercise-set-type-strategy-resolver.provider';
import { MCQTypeStrategyProvider } from 'src/exercise-set/strategies/type/mcq-type.strategy.provider';
import { OpenEndedTypeStrategyProvider } from 'src/exercise-set/strategies/type/open-ended-type.strategy.provider';
import { ShortTypeStrategyProvider } from 'src/exercise-set/strategies/type/short-type.strategy.provider';
import { TrueFalseTypeStrategyProvider } from 'src/exercise-set/strategies/type/true-false-type.strategy.provider';
import { ExerciseModule } from '../exercise/exercise.module';
import { OpenaiModule } from '../openai/openai.module';
import { ProcessedSourceModule } from '../processed-source/processed-source.module';
import { SourceModule } from '../source/source.module';
import { ExerciseSetController } from './exercise-set.controller';
import { ExerciseSetService } from './exercise-set.service';

@Module({
    imports: [forwardRef(() => ExerciseModule), OpenaiModule, SourceModule, ProcessedSourceModule],
    controllers: [ExerciseSetController],
    providers: [
        ExerciseSetService,
        ExerciseSetTypeStrategyResolverProvider,
        MCQTypeStrategyProvider,
        TrueFalseTypeStrategyProvider,
        OpenEndedTypeStrategyProvider,
        ShortTypeStrategyProvider,
        ...exerciseSetReadAllFilterProviders,
    ],
    exports: [ExerciseSetService],
})
export class ExerciseSetModule {}

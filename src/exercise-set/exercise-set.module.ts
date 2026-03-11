import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { exerciseSetReadAllFilterProviders } from 'src/exercise-set/composites/read-all-filter/read-all-filter-providers.barrel';
import { ExerciseSetController } from 'src/exercise-set/exercise-set.controller';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { ExerciseSetTypeStrategiesBarrel } from 'src/exercise-set/strategies/type/exercise-set-type-strategies.barrel';
import { ExerciseSetTypeFactory } from 'src/exercise-set/strategies/type/exercise-set-type.factory';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { SourceModule } from 'src/source/source.module';

@Module({
    imports: [forwardRef(() => ExerciseModule), AiModule, SourceModule],
    controllers: [ExerciseSetController],
    providers: [
        ExerciseSetService,
        ExerciseSetTypeFactory,
        ...ExerciseSetTypeStrategiesBarrel,
        ...exerciseSetReadAllFilterProviders,
    ],
    exports: [ExerciseSetService],
})
export class ExerciseSetModule {}

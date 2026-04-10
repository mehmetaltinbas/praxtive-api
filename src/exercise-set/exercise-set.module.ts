import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { exerciseSetReadAllFilterProviders } from 'src/exercise-set/composites/read-all-filter/read-all-filter-providers.barrel';
import { ExerciseSetController } from 'src/exercise-set/exercise-set.controller';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { PublicExerciseSetController } from 'src/exercise-set/public-exercise-set.controller';
import { ExerciseSetTypeStrategiesBarrel } from 'src/exercise-set/strategies/type/exercise-set-type-strategies.barrel';
import { ExerciseSetTypeFactory } from 'src/exercise-set/strategies/type/exercise-set-type.factory';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { ExerciseSetGroupModule } from 'src/exercise-set-group/exercise-set-group.module';
import { SourceModule } from 'src/source/source.module';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [forwardRef(() => ExerciseModule), AiModule, SourceModule, ExerciseSetGroupModule, UserModule],
    controllers: [ExerciseSetController, PublicExerciseSetController],
    providers: [
        ExerciseSetService,
        ExerciseSetTypeFactory,
        ...ExerciseSetTypeStrategiesBarrel,
        ...exerciseSetReadAllFilterProviders,
    ],
    exports: [ExerciseSetService],
})
export class ExerciseSetModule {}

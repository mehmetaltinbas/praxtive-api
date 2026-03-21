import { forwardRef, Module } from '@nestjs/common';
import { ExerciseSetModule } from 'src/exercise-set/exercise-set.module';
import { PublicExerciseController } from 'src/exercise/public-exercise.controller';
import { ExerciseTypeStrategiesBarrel } from 'src/exercise/strategies/type/exercise-type-strategies.barrel';
import { ExerciseTypeFactory } from 'src/exercise/strategies/type/exercise-type.factory';
import { AiModule } from '../ai/ai.module';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';

@Module({
    imports: [forwardRef(() => AiModule), forwardRef(() => ExerciseSetModule)],
    controllers: [ExerciseController, PublicExerciseController],
    providers: [ExerciseService, ExerciseTypeFactory, ...ExerciseTypeStrategiesBarrel],
    exports: [ExerciseService],
})
export class ExerciseModule {}

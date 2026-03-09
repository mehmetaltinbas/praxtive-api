import { forwardRef, Module } from '@nestjs/common';
import { ExerciseSetModule } from 'src/exercise-set/exercise-set.module';
import { AiModule } from '../ai/ai.module';
import { SourceModule } from '../source/source.module';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';

@Module({
    imports: [AiModule, SourceModule, forwardRef(() => ExerciseSetModule)],
    controllers: [ExerciseController],
    providers: [ExerciseService],
    exports: [ExerciseService],
})
export class ExerciseModule {}

import { forwardRef, Module } from '@nestjs/common';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';
import { OpenaiModule } from '../openai/openai.module';
import { SourceModule } from '../source/source.module';
import { ExerciseSetModule } from 'src/exercise-set/exercise-set.module';

@Module({
    imports: [OpenaiModule, SourceModule, forwardRef(() => ExerciseSetModule)],
    controllers: [ExerciseController],
    providers: [ExerciseService],
    exports: [ExerciseService],
})
export class ExerciseModule {}

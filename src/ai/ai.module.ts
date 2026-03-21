import { forwardRef, Module } from '@nestjs/common';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
    imports: [forwardRef(() => ExerciseModule)],
    providers: [AiService],
    exports: [AiService],
    controllers: [AiController],
})
export class AiModule {}

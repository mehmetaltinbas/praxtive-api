import { forwardRef, Module } from '@nestjs/common';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { AiController } from 'src/ai/ai.controller';
import { AiService } from 'src/ai/ai.service';

@Module({
    imports: [forwardRef(() => ExerciseModule)],
    providers: [AiService],
    exports: [AiService],
    controllers: [AiController],
})
export class AiModule {}

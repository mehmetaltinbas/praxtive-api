import { forwardRef, Module } from '@nestjs/common';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { AiController } from 'src/ai/ai.controller';
import { AiService } from 'src/ai/ai.service';
import { TokenCounterService } from 'src/ai/services/token-counter.service';

@Module({
    imports: [forwardRef(() => ExerciseModule)],
    controllers: [AiController],
    providers: [AiService, TokenCounterService],
    exports: [AiService, TokenCounterService],
})
export class AiModule {}

import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { SourceController } from 'src/source/source.controller';
import { SourceService } from 'src/source/source.service';
import { SourceTypeStrategiesBarrel } from 'src/source/strategies/type/source-type-strategies.barrel';
import { SourceTypeFactory } from 'src/source/strategies/type/source-type.factory';

@Module({
    imports: [forwardRef(() => AiModule)],
    providers: [SourceService, SourceTypeFactory, ...SourceTypeStrategiesBarrel],
    controllers: [SourceController],
    exports: [SourceService],
})
export class SourceModule {}

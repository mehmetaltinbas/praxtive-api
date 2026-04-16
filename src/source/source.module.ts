import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { PublicSourceController } from 'src/source/public-source.controller';
import { SourceController } from 'src/source/source.controller';
import { SourceService } from 'src/source/source.service';
import { SourceTypeStrategiesBarrel } from 'src/source/strategies/type/source-type-strategies.barrel';
import { SourceTypeFactory } from 'src/source/strategies/type/source-type.factory';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [forwardRef(() => AiModule), UserModule],
    providers: [SourceService, SourceTypeFactory, ...SourceTypeStrategiesBarrel],
    controllers: [SourceController, PublicSourceController],
    exports: [SourceService],
})
export class SourceModule {}

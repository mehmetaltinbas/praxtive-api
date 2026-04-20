import { Global, Module } from '@nestjs/common';
import { DbConnectionModule } from 'src/db/db-connection.module';
import { dbModelsProvider } from 'src/db/db-models.provider';

@Global()
@Module({
    imports: [DbConnectionModule],
    providers: [dbModelsProvider],
    exports: [dbModelsProvider],
})
export class DbModelsModule {}

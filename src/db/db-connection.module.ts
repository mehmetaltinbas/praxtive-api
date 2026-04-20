import { Module } from '@nestjs/common';
import { dbConnectionProvider } from 'src/db/db-connection.provider';

@Module({
    providers: [dbConnectionProvider],
    exports: [dbConnectionProvider],
})
export class DbConnectionModule {}

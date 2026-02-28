import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

export const dbConnectionProvider = {
    provide: 'DB_CONNECTION',
    useFactory: async (configService: ConfigService): Promise<typeof mongoose> => {
        const dbConnection = configService.get<string>('DB_CONNECTION');

        if (!dbConnection) {
            throw new Error('db connection is undefined');
        }

        console.log('connecting to mongodb...');
        const connection = await mongoose.connect(dbConnection, {
            dbName: configService.get<string>('DB_NAME'),
        });

        return connection;
    },
    inject: [ConfigService],
};

import { Mongoose } from 'mongoose';
import { cleanDb } from 'src/db/db-models.provider';
import { createTheApp } from 'test/app-setup';
import testData from 'test/data/test-data.util';

export default async function globalSetup(): Promise<void> {
    const app = await createTheApp();

    const mongoose = app.get<Mongoose>('DB_CONNECTION');

    await cleanDb(mongoose);
    testData.reset();
}

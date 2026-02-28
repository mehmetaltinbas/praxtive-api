import { createTheApp } from './app-setup';
import { cleanDb } from '../src/db/db-models.provider';
import testData from './data/test-data.util';
import { Mongoose } from 'mongoose';

export default async function globalSetup(): Promise<void> {
    const app = await createTheApp();

    const mongoose = app.get<Mongoose>('DB_CONNECTION');

    await cleanDb(mongoose);
    testData.reset();
}

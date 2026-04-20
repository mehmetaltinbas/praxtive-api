import { closeApp } from 'test/app-setup';
import testData from 'test/data/test-data.util';

export default async function globalTeardown(): Promise<void> {
    await closeApp();
    testData.reset();
}

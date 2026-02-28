import { TestDataKeys } from '../data/test-data-keys.enum';
import { TestData } from '../data/test-data.interface';
import testData from '../data/test-data.util';

export async function readJwt(): Promise<string> {
    const checkInterval = 100;

    return new Promise((resolve) => {
        const waitForJwt = (): void => {
            const jwt = testData.read(TestDataKeys.JWT);
            const isJwtReady = testData.read(TestDataKeys.IS_JWT_READY);

            if (isJwtReady) {
                resolve(jwt as string);
            } else {
                setTimeout(waitForJwt, checkInterval);
            }
        };

        waitForJwt();
    });
}

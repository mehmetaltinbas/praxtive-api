import { TestDataKeys } from 'test/data/test-data-keys.enum';
import testDataUtils from 'test/data/test-data.util';

export async function readJwt(): Promise<string> {
    const checkInterval = 100;

    return new Promise((resolve) => {
        const waitForJwt = (): void => {
            const jwt = testDataUtils.read(TestDataKeys.JWT);
            const isJwtReady = testDataUtils.read(TestDataKeys.IS_JWT_READY);

            if (isJwtReady) {
                resolve(jwt as string);
            } else {
                setTimeout(waitForJwt, checkInterval);
            }
        };

        waitForJwt();
    });
}

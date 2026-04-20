import { TestDataKeys } from 'test/data/test-data-keys.enum';
import testData from 'test/data/test-data.util';

export async function waitForSignUp(): Promise<void> {
    const checkInterval = 100;

    return new Promise((resolve) => {
        const wait = (): void => {
            const isUserSignedUp = testData.read(TestDataKeys.IS_USER_SIGNED_UP);

            if (isUserSignedUp) {
                resolve();
            } else {
                setTimeout(wait, checkInterval);
            }
        };

        wait();
    });
}

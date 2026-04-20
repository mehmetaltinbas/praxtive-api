import fs from 'fs';
import { TestDataKeys } from 'test/data/test-data-keys.enum';
import { TestData } from 'test/data/test-data.interface';

const testDataJsonFilePath = 'test/data/test-data.json';

function readAndParse(): TestData {
    const rawGlobalTestData = fs.readFileSync(testDataJsonFilePath).toString();
    const parsedGlobalTestData = JSON.parse(rawGlobalTestData) as TestData;

    return parsedGlobalTestData;
}

function stringifyAndWrite(testData: TestData): void {
    const stringifiedTestData = JSON.stringify(testData, null, 4);

    fs.writeFileSync(testDataJsonFilePath, stringifiedTestData);
}

function read(key: TestDataKeys): TestData[TestDataKeys] {
    const testData = readAndParse();

    return testData[key];
}

function write<K extends keyof TestData>(key: K, value: TestData[K]): void {
    const testData = readAndParse();

    testData[key] = value;
    stringifyAndWrite(testData);
}

function reset(): void {
    let testData = readAndParse();

    testData = {
        isUserSignedUp: false,
        jwt: '',
        isJwtReady: false,
    };
    stringifyAndWrite(testData);
}

export default {
    read,
    write,
    reset,
};

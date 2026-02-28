import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SignInResponse } from '../src/auth/types/auth-responses';
import { createTheApp } from './app-setup';
import { userCredentials } from './mocks/shared.mock';
import { waitForSignUp } from './utilities/user.utility';
import { TestDataKeys } from './data/test-data-keys.enum';
import { TestData } from './data/test-data.interface';
import testData from './data/test-data.util';

describe('Auth', () => {
    let app: INestApplication<App>;
    let jwt: string;

    beforeAll(async () => {
        app = await createTheApp();
    });

    afterAll(async () => {});

    describe('signin', () => {
        beforeAll(async () => {
            await waitForSignUp();
        });

        it('should signin', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/signin')
                .send({
                    userName: userCredentials.userName,
                    password: userCredentials.password,
                })
                .expect(200)
                .expect(function (res) {
                    const resBody = res.body as SignInResponse;

                    if (!resBody.isSuccess) {
                        throw new Error(resBody.message);
                    }
                });
            const responseBody = response.body as SignInResponse;

            jwt = responseBody.jwt!;
            testData.write(TestDataKeys.JWT, jwt);
            testData.write(TestDataKeys.IS_JWT_READY, true);
        });
    });

    it('should test a protected route', () => {
        return request(app.getHttpServer())
            .get('/auth/authorize')
            .set({ authorization: `Bearer ${jwt}` })
            .send()
            .expect(200);
    });
});

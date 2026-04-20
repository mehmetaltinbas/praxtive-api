import { INestApplication } from '@nestjs/common';
import { SignInResponse } from 'src/auth/types/response/sign-in.response';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTheApp } from 'test/app-setup';
import { TestDataKeys } from 'test/data/test-data-keys.enum';
import testDataUtil from 'test/data/test-data.util';
import { userCredentials } from 'test/mocks/shared.mock';
import { waitForSignUp } from 'test/utilities/user.utility';

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
            testDataUtil.write(TestDataKeys.JWT, jwt);
            testDataUtil.write(TestDataKeys.IS_JWT_READY, true);
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

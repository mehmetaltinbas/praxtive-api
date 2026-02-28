import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReadSingleUserResponse, SignUpResponse } from '../src/user/types/user-responses';
import { readJwt } from './utilities/auth.utility';
import { createTheApp } from './app-setup';
import { userCredentials } from './mocks/shared.mock';
import testData from './data/test-data.util';
import { TestDataKeys } from './data/test-data-keys.enum';

describe('User', () => {
    let app: INestApplication<App>;
    let userId: string;

    beforeAll(async () => {
        app = await createTheApp();
    });

    afterAll(async () => {});

    describe('signup', () => {
        it('should throw a bad request error due to the missing userName field', () => {
            return request(app.getHttpServer())
                .post('/user/signup')
                .send({ email: userCredentials.email, password: userCredentials.password })
                .expect(400);
        });

        it('should throw a bad request error due to the missing email field', () => {
            return request(app.getHttpServer())
                .post('/user/signup')
                .send({
                    userName: userCredentials.userName,
                    password: userCredentials.password,
                })
                .expect(400);
        });

        it('should throw a bad request error due to the missing password field', () => {
            return request(app.getHttpServer())
                .post('/user/signup')
                .send({ userName: userCredentials.userName, email: userCredentials.email })
                .expect(400);
        });

        it('should throw a bad request error due to the invalid email format', () => {
            return request(app.getHttpServer())
                .post('/user/signup')
                .send({
                    userName: userCredentials.userName,
                    email: 'altinbasmehmet.41gmail.com',
                    password: userCredentials.password,
                })
                .expect(400);
        });

        it('should throw a bad request error due to the invalid email format', () => {
            return request(app.getHttpServer())
                .post('/user/signup')
                .send({
                    userName: userCredentials.userName,
                    email: 'altinbasmehmet.41@gmail',
                    password: userCredentials.password,
                })
                .expect(400);
        });

        it('should signup successfully', () => {
            return request(app.getHttpServer())
                .post('/user/signup')
                .send(userCredentials)
                .expect(201)
                .expect((res) => {
                    const resBody = res.body as SignUpResponse;

                    userId = resBody.user._id;
                    testData.write(TestDataKeys.IS_USER_SIGNED_UP, true);
                });
        });
    });

    it('should read all users ', () => {
        return request(app.getHttpServer()).get('/user/readall').expect(200);
    });

    describe('readById', () => {
        it('should successfully read user by id', () => {
            return request(app.getHttpServer())
                .get(`/user/read-by-id/${userId}`)
                .expect(200)
                .expect((res) => {
                    const resBody = res.body as ReadSingleUserResponse;

                    if (!resBody.user) {
                        throw new Error("user couldn't be read");
                    } else if (resBody.user.userName !== userCredentials.userName) {
                        throw new Error("the userName of the user being read doesn't match the true one");
                    }
                });
        });
    });

    describe('protected endpoints', () => {
        let jwt: string;

        beforeAll(async () => {
            jwt = await readJwt();
        });

        describe('updateById', () => {
            it('should update user by id using jwt', () => {
                return request(app.getHttpServer())
                    .patch(`/user/update-by-id/${userId}`)
                    .send({ email: 'altnbsmehmet@icloud.com' })
                    .set({ authorization: `Bearer ${jwt}` });
            });
        });

        describe('deleteById', () => {
            it('should delete user by id using jwt', () => {
                return request(app.getHttpServer())
                    .delete(`/user/delete-by-id/${userId}`)
                    .set({ authorization: `Bearer ${jwt}` })
                    .expect(200);
            });
        });
    });
});

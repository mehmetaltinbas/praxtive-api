import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from 'src/app.module';
import { AllExceptionsFilter } from 'src/shared/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 4001;

    app.use(helmet());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            exceptionFactory: (errors): BadRequestException => {
                const message = errors.flatMap((err) => Object.values(err.constraints ?? {})).join(', ');

                return new BadRequestException(message);
            },
        })
    );
    app.use(cookieParser());
    app.enableCors({
        origin: [configService.get<string>('CLIENT_URL'), configService.get<string>('LOCAL_MOBILE_CLIENT_URL')],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    });
    await app.listen(port);
    console.log(`Server is running on http://localhost:${port}\n`);
}

bootstrap().catch((e) => console.log(e));

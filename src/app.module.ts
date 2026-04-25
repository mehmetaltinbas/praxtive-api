import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from 'src/ai/ai.module';
import { AuthModule } from 'src/auth/auth.module';
import { CreditTransactionModule } from 'src/credit-transaction/credit-transaction.module';
import { DbConnectionModule } from 'src/db/db-connection.module';
import { DbModelsModule } from 'src/db/db-models.module';
import { EmailModule } from 'src/email/email.module';
import { EventsModule } from 'src/events/events.module';
import { ExerciseSetGroupModule } from 'src/exercise-set-group/exercise-set-group.module';
import { ExerciseSetModule } from 'src/exercise-set/exercise-set.module';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { FeedbackModule } from 'src/feedback/feedback.module';
import { PaymentMethodModule } from 'src/payment-method/payment-method.module';
import { PaymentModule } from 'src/payment/payment.module';
import { PlanModule } from 'src/plan/plan.module';
import { SourceModule } from 'src/source/source.module';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ThrottlerModule.forRoot([
            {
                ttl: 60000,
                limit: 60,
            },
        ]),
        ScheduleModule.forRoot(),
        DbConnectionModule,
        DbModelsModule,
        EmailModule,
        UserModule,
        AuthModule,
        SourceModule,
        ExerciseSetGroupModule,
        ExerciseSetModule,
        ExerciseModule,
        AiModule,
        EventsModule,
        PaymentModule,
        PaymentMethodModule,
        PlanModule,
        CreditTransactionModule,
        FeedbackModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsModule } from 'src/events/events.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CreditTransactionModule } from './credit-transaction/credit-transaction.module';
import { DbConnectionModule } from './db/db-connection.module';
import { DbModelsModule } from './db/db-models.module';
import { ExerciseSetModule } from './exercise-set/exercise-set.module';
import { ExerciseModule } from './exercise/exercise.module';
import { PlanModule } from './plan/plan.module';
import { SourceModule } from './source/source.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        DbConnectionModule,
        DbModelsModule,
        UserModule,
        AuthModule,
        SourceModule,
        ExerciseSetModule,
        ExerciseModule,
        AiModule,
        EventsModule,
        BillingModule,
        PlanModule,
        CreditTransactionModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}

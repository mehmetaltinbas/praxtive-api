import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { BillingModule } from 'src/billing/billing.module';
import { ExerciseSetGroupModule } from 'src/exercise-set-group/exercise-set-group.module';
import { exerciseSetReadAllFilterProviders } from 'src/exercise-set/composites/read-all-filter/read-all-filter-providers.barrel';
import { ExerciseSetController } from 'src/exercise-set/exercise-set.controller';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { PublicExerciseSetController } from 'src/exercise-set/public-exercise-set.controller';
import { ExerciseSetContextTypeStrategiesBarrel } from 'src/exercise-set/strategies/context-type/exercise-set-context-type-strategies.barrel';
import { ExerciseSetContextTypeFactory } from 'src/exercise-set/strategies/context-type/exercise-set-context-type.factory';
import { ExerciseSetTypeStrategiesBarrel } from 'src/exercise-set/strategies/type/exercise-set-type-strategies.barrel';
import { ExerciseSetTypeFactory } from 'src/exercise-set/strategies/type/exercise-set-type.factory';
import { ExerciseModule } from 'src/exercise/exercise.module';
import { PlanFeatureGuard } from 'src/plan/guards/plan-feature.guard';
import { SourceModule } from 'src/source/source.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        forwardRef(() => ExerciseModule),
        forwardRef(() => AiModule),
        SourceModule,
        ExerciseSetGroupModule,
        UserModule,
        BillingModule,
        SubscriptionModule,
    ],
    controllers: [ExerciseSetController, PublicExerciseSetController],
    providers: [
        ExerciseSetService,
        ExerciseSetTypeFactory,
        ...ExerciseSetTypeStrategiesBarrel,
        ExerciseSetContextTypeFactory,
        ...ExerciseSetContextTypeStrategiesBarrel,
        ...exerciseSetReadAllFilterProviders,
        PlanFeatureGuard,
    ],
    exports: [ExerciseSetService],
})
export class ExerciseSetModule {}

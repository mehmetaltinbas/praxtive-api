import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { PlanFeature } from 'src/plan/enums/plan-feature.enum';

export const PLAN_FEATURE_KEY = 'planFeature';

export const RequiresPlanFeature = (feature: PlanFeature): CustomDecorator<string> =>
    SetMetadata(PLAN_FEATURE_KEY, feature);

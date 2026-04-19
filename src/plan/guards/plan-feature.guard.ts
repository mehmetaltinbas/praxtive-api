import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request as ExpressRequest } from 'express';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { PLAN_FEATURE_MINIMUM_TIER } from 'src/plan/constants/plan-feature-minimum-tier.constant';
import { PLAN_TIER_RANK } from 'src/plan/constants/plan-tier-rank.constant';
import { PLAN_FEATURE_KEY } from 'src/plan/decorators/requires-plan-feature.decorator';
import { PlanFeature } from 'src/plan/enums/plan-feature.enum';
import { SubscriptionService } from 'src/subscription/subscription.service';

@Injectable()
export class PlanFeatureGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private subscriptionService: SubscriptionService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeature = this.reflector.get<PlanFeature | undefined>(PLAN_FEATURE_KEY, context.getHandler());

        if (!requiredFeature) return true;

        const request: ExpressRequest & { user?: JwtPayload } = context.switchToHttp().getRequest();

        const userId = request.user?.sub;

        if (!userId) {
            throw new ForbiddenException('Authentication required');
        }

        const { plan } = await this.subscriptionService.getActivePlanForUser(userId);

        const minimumTier = PLAN_FEATURE_MINIMUM_TIER[requiredFeature];

        const currentRank = PLAN_TIER_RANK[plan.name];
        const requiredRank = PLAN_TIER_RANK[minimumTier];

        if (currentRank < requiredRank) {
            throw new ForbiddenException(`This feature requires a ${minimumTier} plan or higher`);
        }

        return true;
    }
}

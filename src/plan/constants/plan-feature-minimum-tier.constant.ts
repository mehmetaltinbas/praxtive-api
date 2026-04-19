import { PlanFeature } from 'src/plan/enums/plan-feature.enum';
import { PlanName } from 'src/plan/enums/plan-name.enum';

export const PLAN_FEATURE_MINIMUM_TIER: Record<PlanFeature, PlanName> = {
    [PlanFeature.VISION_PAPER_EXTRACT]: PlanName.PLUS,
    [PlanFeature.LECTURE_NOTES_GENERATION]: PlanName.PLUS,
    [PlanFeature.MIX_TYPE_OR_DIFFICULTY]: PlanName.PLUS,
    [PlanFeature.WEAK_POINT_FOCUS_PRACTICE]: PlanName.PLUS,
};

import { PlanDocument } from 'src/billing/types/plan-document.interface';
import ResponseBase from 'src/shared/interfaces/response-base.interface';

export interface ReadSinglePlanResponse extends ResponseBase {
    plan: PlanDocument;
}

import { PlanDocument } from 'src/plan/types/plan-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface GetActivePlanResponse extends ResponseBase {
    plan: PlanDocument;
}

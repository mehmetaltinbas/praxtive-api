import { PlanDocument } from 'src/plan/types/plan-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface ReadAllPlansResponse extends ResponseBase {
    plans?: PlanDocument[];
}

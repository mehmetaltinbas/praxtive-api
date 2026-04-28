import { CreditTransactionDirection } from 'src/credit-transaction/enums/credit-transaction-direction.enum';
import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';

export const CREDIT_TRANSACTION_DIRECTIONS: Record<CreditTransactionType, CreditTransactionDirection> = {
    // increments
    [CreditTransactionType.MONTHLY_GRANT]: CreditTransactionDirection.GRANT,
    [CreditTransactionType.PLAN_UPGRADE_GRANT]: CreditTransactionDirection.GRANT,
    [CreditTransactionType.ONE_TIME_PURCHASE]: CreditTransactionDirection.GRANT,

    // deductions
    [CreditTransactionType.AUDIO_TRANSCRIPTION]: CreditTransactionDirection.DEDUCTION,
    [CreditTransactionType.EXERCISE_SET_GENERATION]: CreditTransactionDirection.DEDUCTION,
    [CreditTransactionType.EXERCISE_SET_ADDITIONAL_GENERATION]: CreditTransactionDirection.DEDUCTION,
    [CreditTransactionType.PAPER_VISION_EXTRACTION]: CreditTransactionDirection.DEDUCTION,
    [CreditTransactionType.LECTURE_NOTES_GENERATION]: CreditTransactionDirection.DEDUCTION,
};

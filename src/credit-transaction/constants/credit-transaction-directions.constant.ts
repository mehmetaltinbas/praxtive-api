import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';

export const CREDIT_TRANSACTION_DIRECTIONS: Record<CreditTransactionType, 'grant' | 'deduction'> = {
    [CreditTransactionType.SIGNUP_GRANT]: 'grant',
    [CreditTransactionType.MONTHLY_GRANT]: 'grant',
    [CreditTransactionType.PLAN_UPGRADE_GRANT]: 'grant',
    [CreditTransactionType.TOP_UP_PURCHASE]: 'grant',
    [CreditTransactionType.AUDIO_TRANSCRIPTION]: 'deduction',
    [CreditTransactionType.EXERCISE_SET_GENERATION]: 'deduction',
    [CreditTransactionType.EXERCISE_SET_ADDITIONAL_GENERATION]: 'deduction',
    [CreditTransactionType.PAPER_VISION_EXTRACTION]: 'deduction',
    [CreditTransactionType.LECTURE_NOTES_GENERATION]: 'deduction',
};

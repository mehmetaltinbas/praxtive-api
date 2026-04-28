export enum CreditTransactionType {
    // increments
    MONTHLY_GRANT = 'monthlyGrant',
    PLAN_UPGRADE_GRANT = 'planUpgradeGrant',
    ONE_TIME_PURCHASE = 'oneTimePurchase',

    // deductions
    AUDIO_TRANSCRIPTION = 'audioTranscription',
    EXERCISE_SET_GENERATION = 'exerciseSetGeneration',
    EXERCISE_SET_ADDITIONAL_GENERATION = 'exerciseSetAdditionalGeneration',
    PAPER_VISION_EXTRACTION = 'paperVisionExtraction',
    LECTURE_NOTES_GENERATION = 'lectureNotesGeneration',
}

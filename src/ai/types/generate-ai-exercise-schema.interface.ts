export interface GenerateAiExerciseSchema {
    type: string;
    properties: {
        items: {
            type: string;
            items: {
                type: string;
                properties: { [key: string]: unknown };
                required: string[];
                additionalProperties: boolean;
            };
        };
    };
    required: string[];
    additionalProperties: boolean;
}

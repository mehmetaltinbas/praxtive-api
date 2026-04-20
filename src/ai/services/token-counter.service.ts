import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CountTokensResponse } from 'src/ai/types/response/count-tokens.response';

@Injectable()
export class TokenCounterService {
    private readonly genai: GoogleGenAI;
    private readonly model = 'gemini-2.5-flash-lite';

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY')!;

        this.genai = new GoogleGenAI({ apiKey });
    }

    async countTokens(text: string): Promise<CountTokensResponse> {
        const result = await this.genai.models.countTokens({ model: this.model, contents: text });

        return { isSuccess: true, message: 'Tokens counted.', tokenCount: result.totalTokens ?? 0 };
    }
}

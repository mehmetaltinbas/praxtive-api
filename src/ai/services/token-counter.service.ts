import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CountTokensResponse } from 'src/ai/types/response/count-tokens.response';

@Injectable()
export class TokenCounterService {
    private readonly model;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY')!;
        const genAi = new GoogleGenerativeAI(apiKey);

        this.model = genAi.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    async countTokens(text: string): Promise<CountTokensResponse> {
        const result = await this.model.countTokens(text);

        return { isSuccess: true, message: 'Tokens counted.', tokenCount: result.totalTokens };
    }
}

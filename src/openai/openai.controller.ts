import { Controller, Get } from '@nestjs/common';
import { OpenaiService } from 'src/openai/openai.service';
import { OpenaiCompletionResponse } from 'src/openai/types/openai-responses';

@Controller('openai')
export class OpenaiController {
    constructor(private openaiService: OpenaiService) {}

    @Get('test')
    async test(): Promise<OpenaiCompletionResponse> {
        const response = await this.openaiService.test();
        return response;
    }
}

import { Controller, Get } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';

@Controller('ai')
export class AiController {
    constructor(private openaiService: AiService) {}

    @Get('test')
    async test(): Promise<object> {
        const response = await this.openaiService.test();

        return response;
    }
}

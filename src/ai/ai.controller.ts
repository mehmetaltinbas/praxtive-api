import { Controller } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';

@Controller('ai')
export class AiController {
    constructor(private openaiService: AiService) {}
}

import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionResult } from 'src/source/strategies/type/types/extraction-result.response';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { Express } from 'express';

export interface SourceTypeStrategy {
    readonly type: SourceType;

    extract(dto: CreateSourceDto, file?: Express.Multer.File): Promise<ExtractionResult>;
}

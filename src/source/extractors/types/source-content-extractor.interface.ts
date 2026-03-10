import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import type { Express } from 'express';

export interface SourceContentExtractor {
    readonly sourceType: SourceType;
    input?: ExtractionInput;
    buildInput(dto: CreateSourceDto, file?: Express.Multer.File): SourceContentExtractor;
    resolveTitle(dto: CreateSourceDto, file?: Express.Multer.File, result?: ExtractionResult): string;
    extract(): Promise<ExtractionResult>;
}

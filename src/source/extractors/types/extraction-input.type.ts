import { SourceType } from 'src/source/enums/source-type.enum';

export type ExtractionInput =
    | { type: SourceType.RAW_TEXT; text: string }
    | { type: SourceType.DOCUMENT; fileBuffer: Buffer }
    | { type: SourceType.YOUTUBE_VIDEO; url: string }
    | { type: SourceType.AUDIO; fileBuffer: Buffer; mimetype: string };

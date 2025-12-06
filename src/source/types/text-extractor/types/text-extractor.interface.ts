export interface TextExtractor {
    extractText(fileBuffer: Buffer): Promise<string>;
}

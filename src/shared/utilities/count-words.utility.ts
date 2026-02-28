export function countWords(text: string): number {
    const normalizedText = text.trim().toLowerCase();
    const cleanedText = normalizedText.replace(/[^\w\s]|_/g, '');
    const words = cleanedText.split(' ').filter((word) => word !== '');

    return words.length;
}

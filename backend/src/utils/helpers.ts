/**
 * Helper Utilities Module
 * Enterprise utility functions for text cleaning, OCR normalization, and file validation.
 */

export function cleanExtractedText(text: string): string {
    if (!text) return "";
    // Remove redundant whitespace, fix broken line breaks, and normalize tabs
    return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function validateFileExtension(filename: string): boolean {
    const validExtensions = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
    return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

export function extractBase64Data(dataUrl: string): Buffer {
    const parts = dataUrl.split(';base64,');
    const base64Str = parts.length > 1 ? parts[1] : parts[0];
    return Buffer.from(base64Str, 'base64');
}

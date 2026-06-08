"use strict";
/**
 * Helper Utilities Module
 * Enterprise utility functions for text cleaning, OCR normalization, and file validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanExtractedText = cleanExtractedText;
exports.validateFileExtension = validateFileExtension;
exports.extractBase64Data = extractBase64Data;
function cleanExtractedText(text) {
    if (!text)
        return "";
    // Remove redundant whitespace, fix broken line breaks, and normalize tabs
    return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function validateFileExtension(filename) {
    const validExtensions = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
    return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}
function extractBase64Data(dataUrl) {
    const parts = dataUrl.split(';base64,');
    const base64Str = parts.length > 1 ? parts[1] : parts[0];
    return Buffer.from(base64Str, 'base64');
}

/**
 * Text Extraction Service
 * ========================
 * Extracts text content from PDF, DOCX, and TXT files.
 * 
 * @author College Project
 */

const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const officeParser = require('officeparser');
const Tesseract = require('tesseract.js');
const { getOpenAI } = require('../config/openai.config');

/**
 * Convert MIME type to file extension
 * @param {string} mimeTypeOrExt - MIME type or file extension
 * @returns {string} Normalized file extension
 */
function normalizeFileType(mimeTypeOrExt) {
    const mimeMap = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/plain': 'txt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/vnd.ms-powerpoint': 'ppt',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav'
    };

    // Check if it's a MIME type
    if (mimeMap[mimeTypeOrExt]) {
        return mimeMap[mimeTypeOrExt];
    }

    // Otherwise assume it's already a file extension
    return mimeTypeOrExt.toLowerCase().replace('.', '');
}

/**
 * Extract text from a file based on its type
 * @param {string} filePath - Path to the file
 * @param {string} fileTypeOrMime - Type of file (pdf, docx, txt) or MIME type
 * @returns {string} Extracted text content
 */
async function extractText(filePath, fileTypeOrMime) {
    const fileType = normalizeFileType(fileTypeOrMime);
    console.log(`📄 Extracting text from ${fileType} file (input: ${fileTypeOrMime}): ${filePath}`);

    try {
        switch (fileType) {
            case 'pdf':
                return await extractFromPDF(filePath);
            case 'docx':
            case 'doc':
                return await extractFromDOCX(filePath);
            case 'txt':
                return await extractFromTXT(filePath);
            case 'pptx':
            case 'ppt':
                return await extractFromPPTX(filePath);
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'image':
                return await extractFromImage(filePath);
            case 'mp3':
            case 'wav':
            case 'audio':
                return await extractFromAudio(filePath);
            default:
                console.log(`   ⚠️ Unsupported file type: ${fileType} (original: ${fileTypeOrMime})`);
                return ''; // Return empty string instead of throwing
        }
    } catch (error) {
        console.error(`❌ Text extraction failed for ${filePath}:`, error.message);
        return ''; // Return empty string on error instead of throwing
    }
}

/**
 * Extract text from PDF file
 */
async function extractFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    const text = data.text.trim();
    console.log(`   ✅ Extracted ${text.length} characters from PDF`);

    return text;
}

/**
 * Extract text from DOCX file
 */
async function extractFromDOCX(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });

    const text = result.value.trim();
    console.log(`   ✅ Extracted ${text.length} characters from DOCX`);

    if (result.messages.length > 0) {
        console.log(`   ⚠️  Warnings:`, result.messages);
    }

    return text;
}

/**
 * Extract text from TXT file
 */
async function extractFromTXT(filePath) {
    const text = fs.readFileSync(filePath, 'utf-8').trim();
    console.log(`   ✅ Extracted ${text.length} characters from TXT`);

    return text;
}

/**
 * Extract text from PPTX/PPT file
 */
async function extractFromPPTX(filePath) {
    try {
        const data = await officeParser.parseOfficeAsync(filePath);
        const text = data ? data.trim() : '';
        console.log(`   ✅ Extracted ${text.length} characters from PPTX/PPT`);
        return text;
    } catch (error) {
        console.error('Failed to parse PPTX/PPT:', error);
        return '';
    }
}

/**
 * Extract text from Image (OCR)
 */
async function extractFromImage(filePath) {
    console.log(`   📸 Starting OCR for image...`);
    try {
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
        const result = text.trim();
        console.log(`   ✅ Extracted ${result.length} characters from Image`);
        return result;
    } catch (error) {
        console.error('Failed OCR:', error);
        return '';
    }
}

/**
 * Extract text from Audio (Whisper)
 */
async function extractFromAudio(filePath) {
    console.log(`   🎧 Starting transcription for audio...`);
    try {
        const openai = getOpenAI();
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1'
        });
        const result = transcription.text.trim();
        console.log(`   ✅ Extracted ${result.length} characters from Audio`);
        return result;
    } catch (error) {
        console.error('Failed Audio transcription:', error);
        return '';
    }
}

/**
 * Chunk text into smaller pieces for embedding
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Maximum chunk size in characters
 * @param {number} overlap - Overlap between chunks
 * @returns {Array} Array of text chunks
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
    if (!text || text.length === 0) {
        return [];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        // Try to break at a sentence or word boundary
        if (end < text.length) {
            // Look for sentence boundary
            const sentenceEnd = text.lastIndexOf('.', end);
            if (sentenceEnd > start + chunkSize / 2) {
                end = sentenceEnd + 1;
            } else {
                // Look for word boundary
                const wordEnd = text.lastIndexOf(' ', end);
                if (wordEnd > start + chunkSize / 2) {
                    end = wordEnd;
                }
            }
        }

        const chunk = text.slice(start, end).trim();
        if (chunk.length > 0) {
            chunks.push({
                text: chunk,
                startIndex: start,
                endIndex: end
            });
        }

        // Move start position with overlap
        start = end - overlap;
        if (start >= text.length - overlap) {
            break;
        }
    }

    console.log(`   📦 Created ${chunks.length} text chunks`);
    return chunks;
}

module.exports = {
    extractText,
    extractFromPDF,
    extractFromDOCX,
    extractFromTXT,
    chunkText
};

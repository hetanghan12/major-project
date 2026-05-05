/**
 * DOCX PREVIEW SERVICE
 * =====================
 * Full DOCX support for CloudAI Smart Storage.
 * 
 * Converts DOCX → HTML for preview
 * Extracts text for AI embeddings
 * 
 * ============================================================================
 * PIPELINE
 * ============================================================================
 * 
 * DOCX (binary) → mammoth → HTML (preview) + Text (AI)
 * 
 * @author CloudAI Document Processing
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { getFileBuffer } = require('./s3.service');

// Preview storage directory
const PREVIEW_DIR = path.join(__dirname, '..', 'storage', 'previews');

// Ensure preview directory exists
if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

/**
 * Convert DOCX to HTML for preview
 * 
 * @param {string|null} docxPath - Path to DOCX file (local) - Deprecated
 * @param {string} documentId - Unique document ID
 * @param {string|null} s3Key - S3 Key for the file (Preferred)
 * @returns {Object} { htmlPath, htmlContent, textContent, textPath }
 */
async function convertDocxToHtml(docxPath, documentId, s3Key) {
    console.log(`📄 Converting DOCX to HTML: ${documentId}`);

    try {
        let buffer;

        if (s3Key) {
            console.log(`   ☁️ Fetching DOCX from S3: ${s3Key}`);
            buffer = await getFileBuffer(s3Key);
        } else if (docxPath && fs.existsSync(docxPath)) {
            console.log(`   ⚠️ Falling back to local file: ${docxPath}`);
            buffer = fs.readFileSync(docxPath);
        } else {
            throw new Error('No valid file source (S3 or local) found for DOCX conversion');
        }

        // Convert DOCX to HTML using mammoth with buffer
        const result = await mammoth.convertToHtml(
            { buffer: buffer },
            {
                // Style mapping for better rendering
                styleMap: [
                    "p[style-name='Title'] => h1.document-title",
                    "p[style-name='Heading 1'] => h1",
                    "p[style-name='Heading 2'] => h2",
                    "p[style-name='Heading 3'] => h3",
                    "p[style-name='Quote'] => blockquote",
                    "p[style-name='Code'] => pre > code",
                    "r[style-name='Strong'] => strong",
                    "r[style-name='Emphasis'] => em"
                ],
                // Convert images to base64
                convertImage: mammoth.images.imgElement(function (image) {
                    return image.read("base64").then(function (imageBuffer) {
                        const mimeType = image.contentType || 'image/png';
                        return {
                            src: `data:${mimeType};base64,${imageBuffer}`
                        };
                    });
                })
            }
        );

        const rawHtml = result.value;
        console.log(`   ✅ Converted ${rawHtml.length} characters of HTML`);

        if (result.messages.length > 0) {
            console.log(`   ⚠️ Warnings:`, result.messages.map(m => m.message).join(', '));
        }

        // Wrap in full HTML document with styling
        const fullHtml = wrapInHtmlDocument(rawHtml, documentId);

        // Save HTML preview
        const htmlPath = path.join(PREVIEW_DIR, `${documentId}.html`);
        fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
        console.log(`   📁 Saved HTML preview: ${htmlPath}`);

        // Extract plain text
        const textResult = await mammoth.extractRawText({ buffer: buffer });
        const textContent = textResult.value;
        console.log(`   ✅ Extracted ${textContent.length} characters of text`);

        // Save text for AI
        const textPath = path.join(PREVIEW_DIR, `${documentId}.txt`);
        fs.writeFileSync(textPath, textContent, 'utf-8');
        console.log(`   📁 Saved text preview: ${textPath}`);

        return {
            htmlPath,
            htmlContent: fullHtml,
            textPath,
            textContent,
            warnings: result.messages
        };

    } catch (error) {
        console.error(`   ❌ DOCX conversion failed: ${error.message}`);
        throw error;
    }
}

/**
 * Wrap raw HTML content in a styled document
 * 
 * @param {string} bodyHtml - HTML content from mammoth
 * @param {string} documentId - Document ID for reference
 * @returns {string} Full HTML document
 */
function wrapInHtmlDocument(bodyHtml, documentId) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="document-id" content="${documentId}">
    <title>Document Preview</title>
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #1f2937;
            background: white;
            padding: 40px 60px;
            max-width: 900px;
            margin: 0 auto;
        }
        
        /* Typography */
        h1 {
            font-size: 2em;
            font-weight: 700;
            margin-bottom: 0.5em;
            color: #111827;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.3em;
        }
        
        h1.document-title {
            font-size: 2.5em;
            border-bottom: none;
            text-align: center;
            margin-bottom: 1em;
        }
        
        h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            color: #1f2937;
        }
        
        h3 {
            font-size: 1.25em;
            font-weight: 600;
            margin-top: 1.2em;
            margin-bottom: 0.4em;
            color: #374151;
        }
        
        h4, h5, h6 {
            font-size: 1.1em;
            font-weight: 600;
            margin-top: 1em;
            margin-bottom: 0.3em;
            color: #4b5563;
        }
        
        p {
            margin-bottom: 1em;
            text-align: justify;
        }
        
        /* Lists */
        ul, ol {
            margin-left: 2em;
            margin-bottom: 1em;
        }
        
        li {
            margin-bottom: 0.3em;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }
        
        th, td {
            border: 1px solid #d1d5db;
            padding: 10px 14px;
            text-align: left;
        }
        
        th {
            background: #f3f4f6;
            font-weight: 600;
        }
        
        tr:nth-child(even) {
            background: #f9fafb;
        }
        
        /* Blockquotes */
        blockquote {
            border-left: 4px solid #5b4ee8;
            margin: 1em 0;
            padding: 0.5em 1em;
            background: #f8f7ff;
            color: #4b5563;
            font-style: italic;
        }
        
        /* Code */
        code {
            font-family: 'Consolas', 'Monaco', monospace;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        pre {
            background: #1f2937;
            color: #e5e7eb;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1em 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        
        /* Images */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em auto;
            border-radius: 4px;
        }
        
        /* Links */
        a {
            color: #5b4ee8;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        /* Search highlight */
        .search-highlight {
            background: #fef08a;
            padding: 2px 0;
        }
        
        /* Print styles */
        @media print {
            body {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <article class="document-content">
        ${bodyHtml}
    </article>
    
    <script>
        // Enable text search highlighting
        window.highlightText = function(searchTerm) {
            if (!searchTerm) return;
            
            const content = document.querySelector('.document-content');
            const walker = document.createTreeWalker(
                content,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const textNodes = [];
            while(walker.nextNode()) textNodes.push(walker.currentNode);
            
            textNodes.forEach(node => {
                if (node.nodeValue.toLowerCase().includes(searchTerm.toLowerCase())) {
                    const span = document.createElement('span');
                    span.innerHTML = node.nodeValue.replace(
                        new RegExp('(' + searchTerm + ')', 'gi'),
                        '<mark class="search-highlight">$1</mark>'
                    );
                    node.parentNode.replaceChild(span, node);
                }
            });
        };
        
        // Scroll to element with matching text
        window.scrollToText = function(text) {
            const content = document.querySelector('.document-content');
            const marks = content.querySelectorAll('.search-highlight');
            if (marks.length > 0) {
                marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
    </script>
</body>
</html>`;
}

/**
 * Get preview HTML for a document
 * 
 * @param {string} documentId - Document ID
 * @returns {string|null} HTML content or null if not found
 */
function getDocxPreview(documentId) {
    const htmlPath = path.join(PREVIEW_DIR, `${documentId}.html`);

    if (fs.existsSync(htmlPath)) {
        return fs.readFileSync(htmlPath, 'utf-8');
    }

    return null;
}

/**
 * Get preview text for a document
 * 
 * @param {string} documentId - Document ID
 * @returns {string|null} Text content or null if not found
 */
function getDocxText(documentId) {
    const textPath = path.join(PREVIEW_DIR, `${documentId}.txt`);

    if (fs.existsSync(textPath)) {
        return fs.readFileSync(textPath, 'utf-8');
    }

    return null;
}

/**
 * Check if preview exists for a document
 * 
 * @param {string} documentId - Document ID
 * @returns {boolean} True if preview exists
 */
function hasPreview(documentId) {
    const htmlPath = path.join(PREVIEW_DIR, `${documentId}.html`);
    return fs.existsSync(htmlPath);
}

/**
 * Delete preview files for a document
 * 
 * @param {string} documentId - Document ID
 */
function deletePreview(documentId) {
    const htmlPath = path.join(PREVIEW_DIR, `${documentId}.html`);
    const textPath = path.join(PREVIEW_DIR, `${documentId}.txt`);

    if (fs.existsSync(htmlPath)) {
        fs.unlinkSync(htmlPath);
        console.log(`   🗑️ Deleted HTML preview: ${documentId}`);
    }

    if (fs.existsSync(textPath)) {
        fs.unlinkSync(textPath);
        console.log(`   🗑️ Deleted text preview: ${documentId}`);
    }
}

/**
 * Get preview file path
 * 
 * @param {string} documentId - Document ID
 * @param {string} type - 'html' or 'txt'
 * @returns {string} File path
 */
function getPreviewPath(documentId, type = 'html') {
    return path.join(PREVIEW_DIR, `${documentId}.${type}`);
}

module.exports = {
    convertDocxToHtml,
    getDocxPreview,
    getDocxText,
    hasPreview,
    deletePreview,
    getPreviewPath,
    PREVIEW_DIR
};

/**
 * THUMBNAIL GENERATION SERVICE
 * ==============================
 * Google Drive-style document thumbnails for CloudAI Smart Storage.
 * 
 * Generates preview images for:
 * - PDF: First page rendered as image
 * - DOCX: First page from HTML preview
 * - XLSX: Spreadsheet grid preview
 * - PPTX: First slide preview
 * - TXT: Styled text preview
 * 
 * ============================================================================
 * PIPELINE
 * ============================================================================
 * 
 * File uploaded → Generate thumbnail → Store locally → Store URL in DB
 * 
 * @author CloudAI Rendering Engine
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

// PDF to image conversion
let pdfPoppler;
try {
    if (process.platform === 'win32') {
        pdfPoppler = require('pdf-poppler');
    } else {
        console.log('ℹ️ pdf-poppler skipped (non-Windows platform)');
    }
} catch (e) {
    console.log('⚠️ pdf-poppler not available, will use fallback');
}

// Puppeteer for HTML rendering (optional, for high-quality DOCX)
let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (e) {
    console.log('puppeteer not available, will use canvas fallback');
}

// ExcelJS for XLSX parsing (optional)
let ExcelJS;
try {
    ExcelJS = require('exceljs');
} catch (e) {
    console.log('exceljs not available, will use styled placeholder');
}

// Thumbnail storage
const THUMBNAIL_DIR = path.join(__dirname, '..', 'storage', 'thumbnails');

// Ensure directory exists
if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

// Thumbnail dimensions (Google Drive style)
const THUMBNAIL_WIDTH = 512;
const THUMBNAIL_HEIGHT = 640;
const THUMBNAIL_QUALITY = 85;

/**
 * Generate thumbnail for any supported file type
 * 
 * @param {string} filePath - Path to source file
 * @param {string} documentId - Document ID for naming
 * @param {string} fileType - File type (pdf, docx, txt)
 * @param {string} textContent - Optional pre-extracted text content
 * @returns {Object} { thumbnailPath, thumbnailUrl }
 */
async function generateThumbnail(filePath, documentId, fileType, textContent = null) {
    console.log(`🖼️ Generating thumbnail for ${documentId} (${fileType})`);

    const thumbnailPath = path.join(THUMBNAIL_DIR, `${documentId}.png`);

    try {
        const normalizedType = normalizeFileType(fileType);

        switch (normalizedType) {
            case 'pdf':
                await generatePdfThumbnail(filePath, thumbnailPath);
                break;
            case 'docx':
            case 'doc':
                await generateDocxThumbnail(filePath, documentId, thumbnailPath, textContent);
                break;
            case 'txt':
                await generateTextThumbnail(filePath, thumbnailPath, textContent);
                break;
            case 'xlsx':
            case 'xls':
                await generateXlsxThumbnail(filePath, thumbnailPath);
                break;
            case 'pptx':
            case 'ppt':
                await generatePptxThumbnail(filePath, thumbnailPath);
                break;
            default:
                await generateGenericThumbnail(thumbnailPath, normalizedType);
        }

        console.log(`   ✅ Thumbnail generated: ${thumbnailPath}`);

        return {
            thumbnailPath,
            thumbnailUrl: `/api/thumbnails/${documentId}.png`
        };

    } catch (error) {
        console.error(`   ❌ Thumbnail generation failed: ${error.message}`);

        // Generate fallback icon-based thumbnail
        await generateFallbackThumbnail(thumbnailPath, fileType);

        return {
            thumbnailPath,
            thumbnailUrl: `/api/thumbnails/${documentId}.png`
        };
    }
}

/**
 * Normalize file type to standard extension
 */
function normalizeFileType(fileType) {
    const mimeMap = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/vnd.ms-powerpoint': 'ppt',
        'text/plain': 'txt'
    };

    return mimeMap[fileType] || fileType.toLowerCase().replace('.', '');
}

/**
 * Generate PDF thumbnail (first page)
 */
async function generatePdfThumbnail(pdfPath, outputPath) {
    console.log(`   📄 Rendering PDF first page...`);

    if (pdfPoppler) {
        // Use pdf-poppler for high-quality rendering
        const opts = {
            format: 'png',
            out_dir: path.dirname(outputPath),
            out_prefix: path.basename(outputPath, '.png'),
            page: 1,
            scale: 2048  // High resolution
        };

        await pdfPoppler.convert(pdfPath, opts);

        // Rename to expected filename
        const generatedFile = path.join(
            path.dirname(outputPath),
            `${path.basename(outputPath, '.png')}-1.png`
        );

        if (fs.existsSync(generatedFile)) {
            // Resize to standard dimensions
            await resizeImage(generatedFile, outputPath, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
            fs.unlinkSync(generatedFile);
        }
    } else {
        // Fallback: Create a styled PDF placeholder
        await generateStyledPdfPlaceholder(pdfPath, outputPath);
    }
}

/**
 * Generate DOCX thumbnail from HTML preview
 */
async function generateDocxThumbnail(docxPath, documentId, outputPath, textContent) {
    console.log(`   📝 Rendering DOCX first page...`);

    // Try to use existing HTML preview
    const { getDocxPreview, convertDocxToHtml } = require('./docx-preview.service');

    let htmlContent = getDocxPreview(documentId);

    if (!htmlContent) {
        // Generate HTML on the fly
        const result = await convertDocxToHtml(docxPath, documentId);
        htmlContent = result.htmlContent;
    }

    if (puppeteer) {
        // High-quality rendering with Puppeteer
        await renderHtmlToImage(htmlContent, outputPath);
    } else {
        // Fallback: Render text content to canvas
        const text = textContent || extractTextFromHtml(htmlContent);
        await renderTextToCanvas(text, outputPath, 'docx');
    }
}

/**
 * Generate TXT thumbnail (styled text preview)
 */
async function generateTextThumbnail(txtPath, outputPath, textContent) {
    console.log(`   📃 Rendering text preview...`);

    let text = textContent;
    if (!text && fs.existsSync(txtPath)) {
        text = fs.readFileSync(txtPath, 'utf-8');
    }

    await renderTextToCanvas(text || 'Empty file', outputPath, 'txt');
}

/**
 * Generate XLSX thumbnail (spreadsheet grid preview)
 */
async function generateXlsxThumbnail(xlsxPath, outputPath) {
    console.log(`   📊 Rendering spreadsheet preview...`);

    if (ExcelJS) {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(xlsxPath);
            const worksheet = workbook.worksheets[0];

            if (worksheet) {
                await renderSpreadsheetToCanvas(worksheet, outputPath);
                return;
            }
        } catch (error) {
            console.log(`   ⚠️ ExcelJS parsing failed: ${error.message}`);
        }
    }

    // Fallback to styled placeholder
    await generateStyledXlsxPlaceholder(outputPath);
}

/**
 * Generate PPTX thumbnail (slide preview)
 */
async function generatePptxThumbnail(pptxPath, outputPath) {
    console.log(`   📊 Rendering presentation preview...`);

    // PPTX is complex - use styled placeholder for now
    // In production, use LibreOffice or pptx2png
    await generateStyledPptxPlaceholder(outputPath);
}

/**
 * Render spreadsheet to canvas
 */
async function renderSpreadsheetToCanvas(worksheet, outputPath) {
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, THUMBNAIL_WIDTH - 2, THUMBNAIL_HEIGHT - 2);

    // Header bar with XLSX badge
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, 40);

    ctx.fillStyle = '#10b981';
    roundRect(ctx, 12, 10, 50, 20, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('XLSX', 18, 24);

    // Grid settings
    const cellWidth = 80;
    const cellHeight = 24;
    const startX = 40;
    const startY = 50;
    const cols = 5;
    const rows = Math.min(worksheet.rowCount, 20);

    // Column headers (A, B, C, ...)
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(startX, startY, cols * cellWidth, cellHeight);

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';

    for (let col = 0; col < cols; col++) {
        const letter = String.fromCharCode(65 + col);
        ctx.fillText(letter, startX + col * cellWidth + cellWidth / 2, startY + 16);
    }

    // Row numbers
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, startY + cellHeight, startX, Math.min(rows, 15) * cellHeight);

    ctx.fillStyle = '#374151';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';

    for (let row = 0; row < Math.min(rows, 15); row++) {
        ctx.fillText(String(row + 1), startX / 2, startY + cellHeight + row * cellHeight + 16);
    }

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let col = 0; col <= cols; col++) {
        ctx.beginPath();
        ctx.moveTo(startX + col * cellWidth, startY);
        ctx.lineTo(startX + col * cellWidth, startY + (Math.min(rows, 15) + 1) * cellHeight);
        ctx.stroke();
    }

    // Horizontal lines
    for (let row = 0; row <= Math.min(rows, 15) + 1; row++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + row * cellHeight);
        ctx.lineTo(startX + cols * cellWidth, startY + row * cellHeight);
        ctx.stroke();
    }

    // Cell values
    ctx.fillStyle = '#1f2937';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 15) return;

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            if (colNumber > cols) return;

            let value = cell.value?.toString() || '';
            if (value.length > 10) value = value.substring(0, 9) + '…';

            const x = startX + (colNumber - 1) * cellWidth + 4;
            const y = startY + rowNumber * cellHeight + 16;

            ctx.fillText(value, x, y);
        });
    });

    // Fade effect at bottom
    if (rows > 15) {
        const gradient = ctx.createLinearGradient(0, THUMBNAIL_HEIGHT - 60, 0, THUMBNAIL_HEIGHT - 20);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, THUMBNAIL_HEIGHT - 80, THUMBNAIL_WIDTH, 60);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`+ ${rows - 15} more rows`, THUMBNAIL_WIDTH / 2, THUMBNAIL_HEIGHT - 30);
    }

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

/**
 * Generate styled XLSX placeholder
 */
async function generateStyledXlsxPlaceholder(outputPath) {
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, THUMBNAIL_WIDTH - 2, THUMBNAIL_HEIGHT - 2);

    // Header
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, 40);

    // XLSX badge
    ctx.fillStyle = '#10b981';
    roundRect(ctx, 12, 10, 50, 20, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('XLSX', 18, 24);

    // Draw fake grid
    const cellWidth = 80;
    const cellHeight = 24;
    const startX = 40;
    const startY = 50;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Draw grid
    for (let row = 0; row <= 20; row++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + row * cellHeight);
        ctx.lineTo(startX + 5 * cellWidth, startY + row * cellHeight);
        ctx.stroke();
    }

    for (let col = 0; col <= 5; col++) {
        ctx.beginPath();
        ctx.moveTo(startX + col * cellWidth, startY);
        ctx.lineTo(startX + col * cellWidth, startY + 20 * cellHeight);
        ctx.stroke();
    }

    // Column headers
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(startX, startY, 5 * cellWidth, cellHeight);

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';

    for (let col = 0; col < 5; col++) {
        const letter = String.fromCharCode(65 + col);
        ctx.fillText(letter, startX + col * cellWidth + cellWidth / 2, startY + 16);
    }

    // Simulated cell data
    ctx.fillStyle = '#d1d5db';
    const dataWidths = [50, 30, 60, 40, 55];
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 5; col++) {
            const width = dataWidths[col] * (0.7 + Math.random() * 0.3);
            ctx.fillRect(
                startX + col * cellWidth + 4,
                startY + (row + 1) * cellHeight + 8,
                width,
                8
            );
        }
    }

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

/**
 * Generate styled PPTX placeholder (presentation slide)
 */
async function generateStyledPptxPlaceholder(outputPath) {
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Slide background with gradient
    const bgGradient = ctx.createLinearGradient(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    bgGradient.addColorStop(0, '#1e3a5f');
    bgGradient.addColorStop(1, '#0c1929');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, THUMBNAIL_WIDTH - 2, THUMBNAIL_HEIGHT - 2);

    // PPTX badge
    ctx.fillStyle = '#f97316';
    roundRect(ctx, 12, 12, 50, 20, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('PPTX', 18, 26);

    // Slide title area
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Presentation', THUMBNAIL_WIDTH / 2, 200);

    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Slide 1', THUMBNAIL_WIDTH / 2, 240);

    // Decorative shapes
    ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
    ctx.beginPath();
    ctx.arc(100, 500, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.beginPath();
    ctx.arc(400, 450, 60, 0, Math.PI * 2);
    ctx.fill();

    // Bullet points
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const bullets = ['• Point 1', '• Point 2', '• Point 3'];
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';

    bullets.forEach((bullet, i) => {
        ctx.fillText(bullet, 120, 350 + i * 30);
    });

    // Slide number
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('1 / 1', THUMBNAIL_WIDTH / 2, THUMBNAIL_HEIGHT - 20);

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

/**
 * Generate generic placeholder thumbnail
 */
async function generateGenericThumbnail(outputPath, fileType) {
    console.log(`   📁 Creating generic thumbnail...`);

    await renderPlaceholderToCanvas(outputPath, fileType);
}

/**
 * Generate fallback thumbnail when processing fails
 */
async function generateFallbackThumbnail(outputPath, fileType) {
    console.log(`   ⚠️ Creating fallback thumbnail...`);

    await renderPlaceholderToCanvas(outputPath, fileType);
}

/**
 * Render text content to canvas (Google Docs style)
 */
async function renderTextToCanvas(text, outputPath, fileType) {
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext('2d');

    // White background with subtle shadow effect
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Add subtle paper texture
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, 8);

    // Document border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, THUMBNAIL_WIDTH - 2, THUMBNAIL_HEIGHT - 2);

    // Header area (like Google Docs)
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, 40);

    // File type badge
    const badgeColors = {
        'pdf': { bg: '#ef4444', text: '#ffffff' },
        'docx': { bg: '#3b82f6', text: '#ffffff' },
        'doc': { bg: '#3b82f6', text: '#ffffff' },
        'txt': { bg: '#6b7280', text: '#ffffff' }
    };

    const badge = badgeColors[fileType] || badgeColors['txt'];

    ctx.fillStyle = badge.bg;
    roundRect(ctx, 12, 10, 50, 20, 4);
    ctx.fill();

    ctx.fillStyle = badge.text;
    ctx.font = 'bold 10px Arial';
    ctx.fillText(fileType.toUpperCase(), 20, 24);

    // Content area
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px Arial';

    const lines = wrapText(ctx, text, THUMBNAIL_WIDTH - 48);
    const lineHeight = 16;
    const startY = 60;
    const maxLines = Math.floor((THUMBNAIL_HEIGHT - startY - 20) / lineHeight);

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
        ctx.fillText(lines[i], 24, startY + i * lineHeight);
    }

    // Add fade effect at bottom if truncated
    if (lines.length > maxLines) {
        const gradient = ctx.createLinearGradient(0, THUMBNAIL_HEIGHT - 80, 0, THUMBNAIL_HEIGHT - 20);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, THUMBNAIL_HEIGHT - 80, THUMBNAIL_WIDTH, 60);

        // "More content" indicator
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Arial';
        ctx.fillText('...', THUMBNAIL_WIDTH / 2 - 6, THUMBNAIL_HEIGHT - 30);
    }

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

/**
 * Render placeholder icon to canvas
 */
async function renderPlaceholderToCanvas(outputPath, fileType) {
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, THUMBNAIL_WIDTH - 2, THUMBNAIL_HEIGHT - 2);

    // Center icon area
    const iconSize = 100;
    const iconX = (THUMBNAIL_WIDTH - iconSize) / 2;
    const iconY = (THUMBNAIL_HEIGHT - iconSize) / 2 - 30;

    // File type colors
    const colors = {
        'pdf': '#ef4444',
        'docx': '#3b82f6',
        'doc': '#3b82f6',
        'xlsx': '#10b981',
        'xls': '#10b981',
        'pptx': '#f97316',
        'ppt': '#f97316',
        'txt': '#6b7280'
    };

    const color = colors[fileType] || '#6b7280';

    // Draw document icon
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.1;
    roundRect(ctx, iconX, iconY, iconSize, iconSize * 1.2, 12);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    roundRect(ctx, iconX, iconY, iconSize, iconSize * 1.2, 12);
    ctx.stroke();

    // Draw folded corner
    ctx.beginPath();
    ctx.moveTo(iconX + iconSize - 25, iconY);
    ctx.lineTo(iconX + iconSize - 25, iconY + 25);
    ctx.lineTo(iconX + iconSize, iconY + 25);
    ctx.strokeStyle = color;
    ctx.stroke();

    // Draw lines (text representation)
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    const lineStartY = iconY + 45;
    for (let i = 0; i < 4; i++) {
        const lineWidth = i === 0 ? 60 : i === 3 ? 40 : 70;
        ctx.beginPath();
        ctx.moveTo(iconX + 15, lineStartY + i * 18);
        ctx.lineTo(iconX + 15 + lineWidth, lineStartY + i * 18);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // File type label
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(fileType.toUpperCase(), THUMBNAIL_WIDTH / 2, iconY + iconSize * 1.2 + 40);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Document', THUMBNAIL_WIDTH / 2, iconY + iconSize * 1.2 + 65);

    ctx.textAlign = 'left';

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

/**
 * Generate styled PDF placeholder (when poppler not available)
 */
async function generateStyledPdfPlaceholder(pdfPath, outputPath) {
    const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const ctx = canvas.getContext('2d');

    // White paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, THUMBNAIL_WIDTH - 2, THUMBNAIL_HEIGHT - 2);

    // PDF badge
    ctx.fillStyle = '#ef4444';
    roundRect(ctx, 12, 12, 50, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('PDF', 24, 29);

    // Simulated page content
    ctx.fillStyle = '#e5e7eb';

    // Title line
    ctx.fillRect(40, 60, 200, 16);
    ctx.fillRect(40, 82, 280, 10);

    // Paragraph lines
    const startY = 110;
    for (let i = 0; i < 12; i++) {
        const width = 280 + Math.random() * 100;
        ctx.fillRect(40, startY + i * 20, Math.min(width, THUMBNAIL_WIDTH - 80), 8);
    }

    // Image placeholder
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(40, 380, 180, 120);
    ctx.strokeStyle = '#d1d5db';
    ctx.strokeRect(40, 380, 180, 120);

    // Image icon inside
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(90, 420);
    ctx.lineTo(130, 420);
    ctx.lineTo(170, 470);
    ctx.lineTo(90, 470);
    ctx.closePath();
    ctx.fill();

    // More paragraph lines
    for (let i = 0; i < 4; i++) {
        const width = 200 + Math.random() * 80;
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(240, 390 + i * 25, Math.min(width, 180), 8);
    }

    // Footer
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Page 1', THUMBNAIL_WIDTH / 2, THUMBNAIL_HEIGHT - 20);

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

/**
 * Render HTML content to image using Puppeteer
 */
async function renderHtmlToImage(htmlContent, outputPath) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT,
            deviceScaleFactor: 2
        });

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        await page.screenshot({
            path: outputPath,
            type: 'png',
            clip: {
                x: 0,
                y: 0,
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT
            }
        });
    } finally {
        await browser.close();
    }
}

/**
 * Extract plain text from HTML
 */
function extractTextFromHtml(html) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/\n+/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
        .substring(0, 3000);
}

/**
 * Resize image to target dimensions
 */
async function resizeImage(inputPath, outputPath, width, height) {
    // Simple copy for now - in production use sharp or jimp
    if (inputPath !== outputPath) {
        fs.copyFileSync(inputPath, outputPath);
    }
}

/**
 * Wrap text to fit width
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Get thumbnail path for a document
 */
function getThumbnailPath(documentId) {
    return path.join(THUMBNAIL_DIR, `${documentId}.png`);
}

/**
 * Check if thumbnail exists
 */
function hasThumbnail(documentId) {
    return fs.existsSync(getThumbnailPath(documentId));
}

/**
 * Delete thumbnail
 */
function deleteThumbnail(documentId) {
    const thumbnailPath = getThumbnailPath(documentId);
    if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log(`   🗑️ Deleted thumbnail: ${documentId}`);
    }
}

/**
 * Get thumbnail as buffer
 */
function getThumbnailBuffer(documentId) {
    const thumbnailPath = getThumbnailPath(documentId);
    if (fs.existsSync(thumbnailPath)) {
        return fs.readFileSync(thumbnailPath);
    }
    return null;
}

module.exports = {
    generateThumbnail,
    getThumbnailPath,
    hasThumbnail,
    deleteThumbnail,
    getThumbnailBuffer,
    THUMBNAIL_DIR,
    THUMBNAIL_WIDTH,
    THUMBNAIL_HEIGHT
};

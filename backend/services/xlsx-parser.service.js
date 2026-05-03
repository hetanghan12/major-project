/**
* XLSX Parser Service - Google Drive Style Spreadsheet Preview
* ============================================================
* 
* Parses XLSX/XLS files into structured data for:
* - Interactive HTML preview
* - AI text extraction/indexing
* - Sheet navigation
* 
* PIPELINE:
* XLSX → ExcelJS → Sheets + Cells → JSON → HTML Grid → Preview
* 
* @author CloudAI Spreadsheet Engine
* @version 1.0.0
*/

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { getFileBuffer } = require('./s3.service');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    MAX_ROWS_PREVIEW: 1000,      // Max rows for preview (performance)
    MAX_COLS_PREVIEW: 50,        // Max columns for preview
    MAX_CELL_LENGTH: 500,        // Truncate long cell values
    PREVIEW_DIR: path.join(__dirname, '..', 'storage', 'previews'),
    CHUNK_SIZE_FOR_AI: 2000      // Characters per AI chunk
};

// Ensure preview directory exists
if (!fs.existsSync(CONFIG.PREVIEW_DIR)) {
    fs.mkdirSync(CONFIG.PREVIEW_DIR, { recursive: true });
}

// =============================================================================
// MAIN PARSER
// =============================================================================

/**
 * Parse an XLSX file and generate preview data
 * 
 * @param {string|null} filePath - Path to XLSX file (local)
 * @param {string} documentId - Unique document ID
 * @param {string|null} s3Key - S3 Key (Preferred)
 * @returns {Object} { sheets, preview, textContent, metadata }
 */
async function parseXlsxFile(filePath, documentId, s3Key) {
    console.log(`\n📊 PARSING XLSX: ${documentId}`);

    const startTime = Date.now();

    try {
        const workbook = new ExcelJS.Workbook();
        const isCsv = (s3Key && s3Key.toLowerCase().endsWith('.csv')) || (filePath && filePath.toLowerCase().endsWith('.csv'));

        if (s3Key) {
            const buffer = await getFileBuffer(s3Key);
            if (isCsv) {
                await workbook.csv.read(buffer); // Note: ExcelJS uses workbook.csv.read for buffers
            } else {
                await workbook.xlsx.load(buffer);
            }
        } else if (filePath && fs.existsSync(filePath)) {
            if (isCsv) {
                await workbook.csv.readFile(filePath);
            } else {
                await workbook.xlsx.readFile(filePath);
            }
        } else {
            throw new Error('No valid file source (S3 or local) found for spreadsheet parsing');
        }

        const sheets = [];
        const allTextContent = [];

        // Process each worksheet
        workbook.worksheets.forEach((worksheet, index) => {
            console.log(`   📑 Processing sheet: ${worksheet.name}`);

            const sheetData = parseWorksheet(worksheet, index);
            sheets.push(sheetData);

            // Collect text content for AI indexing
            allTextContent.push(`## Sheet: ${worksheet.name}\n`);
            allTextContent.push(sheetData.textContent);
        });

        // Generate HTML preview
        const previewHtml = generateHtmlPreview(sheets, documentId);

        // Save preview files
        const previewPath = path.join(CONFIG.PREVIEW_DIR, `${documentId}.html`);
        const sheetsPath = path.join(CONFIG.PREVIEW_DIR, `${documentId}.json`);

        fs.writeFileSync(previewPath, previewHtml);
        fs.writeFileSync(sheetsPath, JSON.stringify({ sheets }, null, 2));

        const duration = Date.now() - startTime;
        console.log(`   ✅ Parsed in ${duration}ms`);
        console.log(`   📊 Total sheets: ${sheets.length}`);
        console.log(`   📁 Preview saved: ${previewPath}`);

        return {
            sheets: sheets.map(s => ({
                name: s.name,
                index: s.index,
                rowCount: s.rowCount,
                colCount: s.colCount
            })),
            previewPath,
            sheetsPath,
            textContent: allTextContent.join('\n'),
            metadata: {
                sheetCount: sheets.length,
                totalRows: sheets.reduce((sum, s) => sum + s.rowCount, 0),
                parseDuration: duration
            }
        };

    } catch (error) {
        console.error(`   ❌ Parse error: ${error.message}`);
        throw error;
    }
}

/**
 * Parse a single worksheet into structured data
 */
function parseWorksheet(worksheet, index) {
    const rows = [];
    const textLines = [];
    let maxCol = 0;

    // Get column widths
    const colWidths = [];
    worksheet.columns.forEach((col, i) => {
        colWidths[i] = col.width || 10;
    });

    // Parse rows
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        if (rowNumber > CONFIG.MAX_ROWS_PREVIEW) return;

        const cells = [];
        const rowText = [];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber > CONFIG.MAX_COLS_PREVIEW) return;
            maxCol = Math.max(maxCol, colNumber);

            const cellData = parseCellValue(cell);
            cells[colNumber - 1] = cellData;

            if (cellData.value) {
                rowText.push(cellData.value);
            }
        });

        rows.push({
            rowNumber,
            cells,
            height: row.height || 20
        });

        if (rowText.length > 0) {
            textLines.push(`Row ${rowNumber}: ${rowText.join(' | ')}`);
        }
    });

    // Fill empty cells
    rows.forEach(row => {
        for (let i = 0; i < maxCol; i++) {
            if (!row.cells[i]) {
                row.cells[i] = { value: '', type: 'empty', style: {} };
            }
        }
    });

    return {
        name: worksheet.name,
        index,
        rowCount: rows.length,
        colCount: maxCol,
        colWidths: colWidths.slice(0, maxCol),
        rows,
        textContent: textLines.join('\n')
    };
}

/**
 * Parse cell value and styling
 */
function parseCellValue(cell) {
    let value = '';
    let type = 'text';
    let formula = null;

    // Handle different value types
    if (cell.value === null || cell.value === undefined) {
        type = 'empty';
    } else if (typeof cell.value === 'object') {
        if (cell.value.result !== undefined) {
            // Formula cell
            value = String(cell.value.result || '');
            formula = cell.value.formula;
            type = 'formula';
        } else if (cell.value.richText) {
            // Rich text
            value = cell.value.richText.map(r => r.text).join('');
            type = 'richtext';
        } else if (cell.value instanceof Date) {
            value = cell.value.toLocaleDateString();
            type = 'date';
        } else {
            value = JSON.stringify(cell.value);
        }
    } else {
        value = String(cell.value);

        // Detect type
        if (!isNaN(parseFloat(value)) && isFinite(value)) {
            type = 'number';
        }
    }

    // Truncate long values
    if (value.length > CONFIG.MAX_CELL_LENGTH) {
        value = value.substring(0, CONFIG.MAX_CELL_LENGTH) + '...';
    }

    // Extract styling
    const style = extractCellStyle(cell);

    return {
        value,
        type,
        formula,
        style
    };
}

/**
 * Extract cell styling
 */
function extractCellStyle(cell) {
    const style = {};

    if (cell.font) {
        if (cell.font.bold) style.fontWeight = 'bold';
        if (cell.font.italic) style.fontStyle = 'italic';
        if (cell.font.color?.argb) {
            style.color = '#' + cell.font.color.argb.substring(2);
        }
        if (cell.font.size) style.fontSize = cell.font.size + 'px';
    }

    if (cell.fill?.fgColor?.argb) {
        style.backgroundColor = '#' + cell.fill.fgColor.argb.substring(2);
    }

    if (cell.alignment) {
        if (cell.alignment.horizontal) style.textAlign = cell.alignment.horizontal;
        if (cell.alignment.vertical) style.verticalAlign = cell.alignment.vertical;
    }

    if (cell.border) {
        // Simplified border handling
        if (cell.border.top || cell.border.bottom || cell.border.left || cell.border.right) {
            style.border = '1px solid #d1d5db';
        }
    }

    return style;
}

// =============================================================================
// HTML PREVIEW GENERATOR
// =============================================================================

/**
 * Generate interactive HTML preview for spreadsheet
 */
function generateHtmlPreview(sheets, documentId) {
    const sheetTabsHtml = sheets.map((sheet, i) => `
        <button class="sheet-tab ${i === 0 ? 'active' : ''}" 
                onclick="switchSheet(${i})"
                data-sheet="${i}">
            ${escapeHtml(sheet.name)}
        </button>
    `).join('');

    const sheetsHtml = sheets.map((sheet, i) => `
        <div class="sheet-content ${i === 0 ? 'active' : ''}" data-sheet="${i}">
            <div class="grid-container">
                <table class="spreadsheet-grid">
                    <thead>
                        <tr class="header-row">
                            <th class="row-header"></th>
                            ${generateColumnHeaders(sheet.colCount)}
                        </tr>
                    </thead>
                    <tbody>
                        ${sheet.rows.map(row => generateRowHtml(row, sheet.colWidths)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spreadsheet Preview</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1e293b;
            color: #e5e7eb;
            overflow: hidden;
        }
        
        .spreadsheet-viewer {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        /* Sheet Tabs */
        .sheet-tabs {
            display: flex;
            background: #0f172a;
            border-bottom: 1px solid rgba(71, 85, 105, 0.3);
            overflow-x: auto;
            padding: 0 12px;
            gap: 2px;
        }
        
        .sheet-tabs::-webkit-scrollbar {
            height: 4px;
        }
        
        .sheet-tabs::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 2px;
        }
        
        .sheet-tab {
            padding: 10px 20px;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 13px;
            border-bottom: 2px solid transparent;
            white-space: nowrap;
            transition: all 0.2s;
            margin-bottom: -1px;
        }
        
        .sheet-tab:hover {
            color: #e2e8f0;
            background: rgba(255,255,255,0.05);
        }
        
        .sheet-tab.active {
            color: #10b981;
            border-bottom-color: #10b981;
            background: rgba(16, 185, 129, 0.1);
        }
        
        /* Grid Container */
        .sheets-container {
            flex: 1;
            overflow: hidden;
            position: relative;
        }
        
        .sheet-content {
            display: none;
            height: 100%;
        }
        
        .sheet-content.active {
            display: block;
        }
        
        .grid-container {
            height: 100%;
            overflow: auto;
            background: #1e293b;
        }
        
        /* Spreadsheet Grid */
        .spreadsheet-grid {
            border-collapse: collapse;
            font-size: 13px;
            transform-origin: top left;
        }
        
        .spreadsheet-grid th,
        .spreadsheet-grid td {
            border: 1px solid rgba(71, 85, 105, 0.25);
            padding: 8px 12px;
            min-width: 80px;
            max-width: 300px;
            height: 36px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .spreadsheet-grid th {
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            position: sticky;
            top: 0;
            z-index: 2;
        }
        
        .row-header {
            background: linear-gradient(90deg, #1e293b 0%, #0f172a 100%) !important;
            color: #64748b;
            text-align: center;
            font-weight: 500;
            font-size: 11px;
            min-width: 50px !important;
            max-width: 50px !important;
            position: sticky;
            left: 0;
            z-index: 1;
        }
        
        .header-row th:first-child {
            z-index: 3;
            background: #0f172a;
        }
        
        .spreadsheet-grid td {
            background: #1e293b;
            color: #e2e8f0;
        }
        
        .spreadsheet-grid tr:nth-child(even) td:not(.row-header) {
            background: rgba(30, 41, 59, 0.7);
        }
        
        .spreadsheet-grid tr:hover td:not(.row-header) {
            background: rgba(59, 130, 246, 0.1);
        }
        
        .spreadsheet-grid td:hover {
            background: rgba(16, 185, 129, 0.15) !important;
            outline: 2px solid #10b981;
            outline-offset: -2px;
        }
        
        /* Cell Types */
        .cell-number {
            text-align: right;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            color: #60a5fa;
        }
        
        .cell-date {
            color: #a78bfa;
        }
        
        .cell-formula {
            color: #34d399;
            font-style: italic;
        }
        
        .cell-empty {
            color: #475569;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .spreadsheet-grid th,
            .spreadsheet-grid td {
                min-width: 60px;
                font-size: 11px;
                padding: 6px 8px;
            }
        }
        
        /* Scrollbar */
        .grid-container::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }
        
        .grid-container::-webkit-scrollbar-track {
            background: #0f172a;
        }
        
        .grid-container::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 6px;
            border: 3px solid #0f172a;
        }
        
        .grid-container::-webkit-scrollbar-thumb:hover {
            background: #64748b;
        }
        
        .grid-container::-webkit-scrollbar-corner {
            background: #0f172a;
        }
    </style>
</head>
<body>
    <div class="spreadsheet-viewer">
        <div class="sheet-tabs">
            ${sheetTabsHtml}
        </div>
        
        <div class="sheets-container">
            ${sheetsHtml}
        </div>
    </div>
    
    <script>
        function switchSheet(index) {
            document.querySelectorAll('.sheet-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.sheet == index);
            });
            document.querySelectorAll('.sheet-content').forEach(content => {
                content.classList.toggle('active', content.dataset.sheet == index);
            });
        }
    </script>
</body>
</html>`;
}

/**
 * Generate column headers (A, B, C, ... AA, AB, ...)
 */
function generateColumnHeaders(colCount) {
    const headers = [];
    for (let i = 0; i < colCount; i++) {
        headers.push(`<th>${getColumnLabel(i)}</th>`);
    }
    return headers.join('');
}

/**
 * Convert column index to letter (0 = A, 25 = Z, 26 = AA)
 */
function getColumnLabel(index) {
    let label = '';
    let num = index;

    while (num >= 0) {
        label = String.fromCharCode(65 + (num % 26)) + label;
        num = Math.floor(num / 26) - 1;
    }

    return label;
}

/**
 * Generate row HTML
 */
function generateRowHtml(row, colWidths) {
    const cellsHtml = row.cells.map((cell, i) => {
        const style = Object.entries(cell.style || {})
            .map(([k, v]) => `${k}:${v}`)
            .join(';');

        const typeClass = `cell-${cell.type}`;
        const width = colWidths[i] ? `width:${colWidths[i] * 8}px;` : '';

        return `<td class="${typeClass}" style="${width}${style}" title="${escapeHtml(cell.value)}">${escapeHtml(cell.value)}</td>`;
    }).join('');

    return `<tr>
        <td class="row-header">${row.rowNumber}</td>
        ${cellsHtml}
    </tr>`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =============================================================================
// TEXT EXTRACTION FOR AI
// =============================================================================

/**
 * Extract all text content for AI indexing
 */
function extractTextForAI(sheets) {
    const chunks = [];

    sheets.forEach(sheet => {
        let currentChunk = `Sheet: ${sheet.name}\n\n`;

        sheet.rows.forEach(row => {
            const rowText = row.cells
                .filter(c => c.value)
                .map((c, i) => `${getColumnLabel(i)}: ${c.value}`)
                .join(', ');

            if (rowText) {
                const line = `Row ${row.rowNumber}: ${rowText}\n`;

                if (currentChunk.length + line.length > CONFIG.CHUNK_SIZE_FOR_AI) {
                    chunks.push(currentChunk);
                    currentChunk = `Sheet: ${sheet.name} (continued)\n\n`;
                }

                currentChunk += line;
            }
        });

        if (currentChunk.length > 50) {
            chunks.push(currentChunk);
        }
    });

    return chunks;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    parseXlsxFile,
    parseWorksheet,
    generateHtmlPreview,
    extractTextForAI,
    CONFIG
};

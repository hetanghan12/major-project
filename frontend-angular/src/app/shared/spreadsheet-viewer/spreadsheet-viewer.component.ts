/**
 * Spreadsheet Viewer Component - Google Sheets Style
 * ===================================================
 * 
 * Native XLSX/XLS viewer with:
 * - Sheet tabs with count indicator
 * - Search & filter functionality
 * - Column resizing with drag handles
 * - Zoom controls
 * - Smooth scrolling
 * - Mobile responsive
 * 
 * @author CloudAI Spreadsheet Viewer
 */

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener, OnDestroy, ChangeDetectorRef, NgZone, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import * as XLSX from 'xlsx';

interface Sheet {
    name: string;
    index: number;
    rowCount: number;
    colCount: number;
    rows?: any[];
}

interface SpreadsheetFile {
    documentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
}

interface ColumnWidth {
    [key: number]: number;
}

@Component({
    selector: 'app-spreadsheet-viewer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="spreadsheet-viewer" *ngIf="file">
            <!-- Compact Toolbar (no duplicate title - parent has it) -->
            <div class="viewer-toolbar">
                <!-- Left: Sheet info & Search -->
                <div class="toolbar-left">
                    <div class="sheet-info" *ngIf="sheets.length > 0">
                        <span class="sheet-badge">{{ sheets.length }} {{ sheets.length === 1 ? 'sheet' : 'sheets' }}</span>
                    </div>
                    
                    <!-- Search Box -->
                    <div class="search-box" [class.active]="isSearchOpen">
                        <button class="icon-btn" (click)="toggleSearch()" title="Search (Ctrl+F)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="m21 21-4.35-4.35"/>
                            </svg>
                        </button>
                        <input 
                            #searchInput
                            *ngIf="isSearchOpen"
                            type="text" 
                            [(ngModel)]="searchQuery"
                            (input)="onSearchChange()"
                            (keydown.escape)="closeSearch()"
                            (keydown.enter)="findNext()"
                            placeholder="Search..."
                            class="search-input"
                        />
                        <span *ngIf="isSearchOpen && searchResults.length > 0" class="search-count">
                            {{ currentSearchIndex + 1 }}/{{ searchResults.length }}
                        </span>
                        <button *ngIf="isSearchOpen && searchResults.length > 0" class="icon-btn small" (click)="findPrevious()" title="Previous">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="m18 15-6-6-6 6"/>
                            </svg>
                        </button>
                        <button *ngIf="isSearchOpen && searchResults.length > 0" class="icon-btn small" (click)="findNext()" title="Next">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Right: Zoom Controls -->
                <div class="toolbar-right">
                    <div class="zoom-controls">
                        <button class="icon-btn" (click)="zoomOut()" [disabled]="zoomLevel <= 50" title="Zoom out">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                        <span class="zoom-level">{{ zoomLevel }}%</span>
                        <button class="icon-btn" (click)="zoomIn()" [disabled]="zoomLevel >= 200" title="Zoom in">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Loading State -->
            <div class="loading-container" *ngIf="isLoading">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <p class="loading-text">Loading spreadsheet...</p>
            </div>
            
            <!-- Error State -->
            <div class="error-container" *ngIf="loadError && !isLoading">
                <div class="error-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                </div>
                <h3>Preview Not Available</h3>
                <p>{{ loadError }}</p>
                <div class="error-actions">
                    <button class="btn-secondary" (click)="loadPreview()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                            <path d="M3 21v-5h5"/>
                        </svg>
                        Retry
                    </button>
                    <button class="btn-primary" (click)="onDownload()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                    </button>
                </div>
            </div>
            
            <!-- Iframe Viewer (uses generated HTML preview) -->
            <div class="preview-container" *ngIf="!isLoading && !loadError && previewUrl">
                <iframe 
                    [src]="previewUrl" 
                    class="preview-iframe"
                    frameborder="0"
                    (load)="onIframeLoad()"
                    (error)="onIframeError()">
                </iframe>
            </div>
            
            <!-- Native Grid Viewer -->
            <div class="native-viewer" *ngIf="!isLoading && !loadError && !previewUrl && sheets.length > 0">
                <!-- Sheet Tabs -->
                <div class="sheet-tabs-container">
                    <div class="sheet-tabs">
                        <button *ngFor="let sheet of sheets; let i = index"
                                class="sheet-tab"
                                [class.active]="activeSheetIndex === i"
                                (click)="switchSheet(i)">
                            <span class="sheet-tab-name">{{ sheet.name }}</span>
                            <span class="sheet-tab-count" *ngIf="sheet.rowCount">{{ sheet.rowCount }} rows</span>
                        </button>
                    </div>
                </div>
                
                <!-- Grid Container with Zoom -->
                <div class="grid-wrapper">
                    <div class="grid-container" 
                         #gridContainer
                         (scroll)="onScroll($event)">
                        <table class="spreadsheet-grid" 
                               *ngIf="activeSheet"
                               [style.transform]="'scale(' + (zoomLevel / 100) + ')'"
                               [style.transformOrigin]="'top left'">
                            <thead>
                                <tr class="header-row">
                                    <th class="row-header corner-cell">#</th>
                                    <th *ngFor="let col of visibleColumns; let i = index"
                                        class="column-header"
                                        [style.width.px]="getColumnWidth(i)"
                                        [style.minWidth.px]="getColumnWidth(i)">
                                        <div class="header-content">
                                            <span>{{ getColumnLabel(col) }}</span>
                                            <!-- Column Filter -->
                                            <button class="filter-btn" 
                                                    (click)="toggleColumnFilter(i, $event)"
                                                    [class.active]="columnFilters[i]"
                                                    title="Filter">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                                </svg>
                                            </button>
                                        </div>
                                        <!-- Resize Handle -->
                                        <div class="resize-handle" 
                                             (mousedown)="startResize($event, i)"
                                             (dblclick)="autoFitColumn(i)">
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let row of getFilteredRows(); let rowIdx = index"
                                    [class.highlight-row]="isRowHighlighted(rowIdx)"
                                    [class.search-match-row]="isSearchMatchRow(rowIdx)">
                                    <td class="row-header">{{ row.rowNumber }}</td>
                                    <td *ngFor="let cell of row.cells; let colIdx = index"
                                        [class]="getCellClass(cell, rowIdx, colIdx)"
                                        [style.width.px]="getColumnWidth(colIdx)"
                                        [title]="cell.value"
                                        (click)="selectCell(rowIdx, colIdx)">
                                        <span [innerHTML]="highlightSearchMatch(cell.value, rowIdx, colIdx)"></span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Status Bar -->
                <div class="status-bar">
                    <div class="status-left">
                        <span *ngIf="selectedCell">
                            Cell: {{ getColumnLabel(selectedCell.col) }}{{ selectedCell.row + 1 }}
                        </span>
                        <span *ngIf="!selectedCell">Ready</span>
                    </div>
                    <div class="status-right">
                        <span>{{ getFilteredRows().length }} rows</span>
                        <span class="separator">•</span>
                        <span>{{ visibleColumns.length }} columns</span>
                    </div>
                </div>
            </div>
            
            <!-- Column Filter Dropdown -->
            <div class="filter-dropdown" 
                 *ngIf="activeFilterColumn !== null"
                 [style.left.px]="filterDropdownPosition.x"
                 [style.top.px]="filterDropdownPosition.y">
                <div class="filter-header">
                    <span>Filter Column {{ getColumnLabel(activeFilterColumn) }}</span>
                    <button class="close-filter" (click)="closeColumnFilter()">×</button>
                </div>
                <input type="text" 
                       [(ngModel)]="columnFilters[activeFilterColumn]"
                       (input)="applyFilters()"
                       placeholder="Type to filter..."
                       class="filter-input"/>
                <button class="clear-filter" (click)="clearColumnFilter(activeFilterColumn)">Clear Filter</button>
            </div>
        </div>
    `,
    styles: [`
        .spreadsheet-viewer {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            position: relative;
        }
        
        /* ==================== TOOLBAR ==================== */
        .viewer-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            background: rgba(15, 23, 42, 0.95);
            border-bottom: 1px solid rgba(71, 85, 105, 0.4);
            backdrop-filter: blur(8px);
            gap: 16px;
        }
        
        .toolbar-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
        }
        
        .toolbar-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .sheet-info {
            display: flex;
            align-items: center;
        }
        
        .sheet-badge {
            font-size: 12px;
            font-weight: 500;
            color: #10b981;
            background: rgba(16, 185, 129, 0.15);
            padding: 4px 10px;
            border-radius: 12px;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        /* Search Box */
        .search-box {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 4px 8px;
            transition: all 0.2s;
        }
        
        .search-box.active {
            background: rgba(255, 255, 255, 0.1);
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
        }
        
        .search-input {
            background: transparent;
            border: none;
            color: #e2e8f0;
            font-size: 13px;
            width: 150px;
            outline: none;
        }
        
        .search-input::placeholder {
            color: #64748b;
        }
        
        .search-count {
            font-size: 11px;
            color: #94a3b8;
            padding: 2px 6px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
        }
        
        .icon-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.15s;
        }
        
        .icon-btn:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
        }
        
        .icon-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        
        .icon-btn.small {
            width: 22px;
            height: 22px;
        }
        
        /* Zoom Controls */
        .zoom-controls {
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 8px;
            border-radius: 8px;
        }
        
        .zoom-level {
            font-size: 12px;
            font-weight: 500;
            color: #94a3b8;
            min-width: 42px;
            text-align: center;
        }
        
        /* ==================== LOADING STATE ==================== */
        .loading-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 24px;
        }
        
        .loading-spinner {
            position: relative;
            width: 50px;
            height: 50px;
        }
        
        .spinner-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 3px solid transparent;
            border-radius: 50%;
            animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }
        
        .spinner-ring:nth-child(1) {
            border-top-color: #10b981;
            animation-delay: -0.45s;
        }
        
        .spinner-ring:nth-child(2) {
            border-top-color: #3b82f6;
            animation-delay: -0.3s;
            width: 80%;
            height: 80%;
            top: 10%;
            left: 10%;
        }
        
        .spinner-ring:nth-child(3) {
            border-top-color: #8b5cf6;
            animation-delay: -0.15s;
            width: 60%;
            height: 60%;
            top: 20%;
            left: 20%;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading-text {
            color: #94a3b8;
            font-size: 14px;
            font-weight: 500;
        }
        
        /* ==================== ERROR STATE ==================== */
        .error-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            text-align: center;
            padding: 48px;
        }
        
        .error-icon {
            color: #64748b;
            opacity: 0.6;
        }
        
        .error-container h3 {
            font-size: 18px;
            font-weight: 600;
            color: #e2e8f0;
            margin: 0;
        }
        
        .error-container p {
            color: #94a3b8;
            font-size: 14px;
            max-width: 300px;
            margin: 0;
        }
        
        .error-actions {
            display: flex;
            gap: 12px;
            margin-top: 8px;
        }
        
        .btn-primary, .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        
        /* ==================== PREVIEW CONTAINER ==================== */
        .preview-container {
            flex: 1;
            overflow: hidden;
        }
        
        .preview-iframe {
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        }
        
        /* ==================== NATIVE VIEWER ==================== */
        .native-viewer {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        /* Sheet Tabs */
        .sheet-tabs-container {
            background: #0f172a;
            border-bottom: 1px solid rgba(71, 85, 105, 0.3);
        }
        
        .sheet-tabs {
            display: flex;
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
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 8px 16px;
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 13px;
            white-space: nowrap;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
        }
        
        .sheet-tab:hover {
            color: #e2e8f0;
            background: rgba(255, 255, 255, 0.05);
        }
        
        .sheet-tab.active {
            color: #10b981;
            border-bottom-color: #10b981;
            background: rgba(16, 185, 129, 0.1);
        }
        
        .sheet-tab-name {
            font-weight: 500;
        }
        
        .sheet-tab-count {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
        }
        
        .sheet-tab.active .sheet-tab-count {
            color: rgba(16, 185, 129, 0.7);
        }
        
        /* Grid */
        .grid-wrapper {
            flex: 1;
            overflow: hidden;
            position: relative;
        }
        
        .grid-container {
            width: 100%;
            height: 100%;
            overflow: auto;
            background: #1e293b;
        }
        
        .spreadsheet-grid {
            border-collapse: collapse;
            font-size: 13px;
            table-layout: fixed;
        }
        
        /* Headers */
        .column-header {
            position: relative;
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            border: 1px solid rgba(71, 85, 105, 0.3);
            padding: 0;
            position: sticky;
            top: 0;
            z-index: 10;
            user-select: none;
        }
        
        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            gap: 8px;
        }
        
        .header-content span {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .filter-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            background: transparent;
            border: none;
            color: #475569;
            cursor: pointer;
            opacity: 0;
            transition: all 0.15s;
        }
        
        .column-header:hover .filter-btn {
            opacity: 1;
        }
        
        .filter-btn:hover, .filter-btn.active {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            opacity: 1;
        }
        
        /* Resize Handle */
        .resize-handle {
            position: absolute;
            right: 0;
            top: 0;
            width: 6px;
            height: 100%;
            cursor: col-resize;
            background: transparent;
            transition: background 0.15s;
        }
        
        .resize-handle:hover {
            background: #10b981;
        }
        
        .row-header {
            background: linear-gradient(90deg, #1e293b 0%, #0f172a 100%);
            color: #64748b;
            text-align: center;
            font-weight: 500;
            font-size: 11px;
            min-width: 50px !important;
            max-width: 50px !important;
            width: 50px !important;
            position: sticky;
            left: 0;
            z-index: 5;
            border: 1px solid rgba(71, 85, 105, 0.3);
            padding: 8px 4px;
        }
        
        .corner-cell {
            z-index: 15;
            background: #0f172a;
        }
        
        /* Cells */
        .spreadsheet-grid td {
            background: #1e293b;
            color: #e2e8f0;
            border: 1px solid rgba(71, 85, 105, 0.25);
            padding: 8px 12px;
            height: 36px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: background 0.1s;
        }
        
        .spreadsheet-grid tr:nth-child(even) td:not(.row-header) {
            background: rgba(30, 41, 59, 0.7);
        }
        
        .spreadsheet-grid tr:hover td:not(.row-header) {
            background: rgba(59, 130, 246, 0.1);
        }
        
        .spreadsheet-grid td:focus,
        .spreadsheet-grid td.selected {
            background: rgba(16, 185, 129, 0.15) !important;
            outline: 2px solid #10b981;
            outline-offset: -2px;
        }
        
        .highlight-row td:not(.row-header) {
            background: rgba(16, 185, 129, 0.08) !important;
        }
        
        .search-match-row td:not(.row-header) {
            background: rgba(251, 191, 36, 0.1) !important;
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
        
        .search-highlight {
            background: rgba(251, 191, 36, 0.4);
            color: #fbbf24;
            padding: 1px 2px;
            border-radius: 2px;
        }
        
        .current-search-match {
            background: #fbbf24;
            color: #1e293b;
            font-weight: 600;
        }
        
        /* ==================== STATUS BAR ==================== */
        .status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 16px;
            background: #0f172a;
            border-top: 1px solid rgba(71, 85, 105, 0.3);
            font-size: 11px;
            color: #64748b;
        }
        
        .status-left, .status-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .separator {
            color: #475569;
        }
        
        /* ==================== FILTER DROPDOWN ==================== */
        .filter-dropdown {
            position: fixed;
            background: #1e293b;
            border: 1px solid rgba(71, 85, 105, 0.4);
            border-radius: 8px;
            padding: 12px;
            min-width: 200px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }
        
        .filter-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 12px;
            font-weight: 500;
            color: #94a3b8;
        }
        
        .close-filter {
            background: none;
            border: none;
            color: #64748b;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        
        .close-filter:hover {
            color: #e2e8f0;
        }
        
        .filter-input {
            width: 100%;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 6px;
            color: #e2e8f0;
            font-size: 13px;
            outline: none;
            margin-bottom: 8px;
        }
        
        .filter-input:focus {
            border-color: #10b981;
        }
        
        .clear-filter {
            width: 100%;
            padding: 8px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 6px;
            color: #f87171;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
        }
        
        .clear-filter:hover {
            background: rgba(239, 68, 68, 0.2);
        }
        
        /* ==================== SCROLLBARS ==================== */
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
        
        /* ==================== RESPONSIVE ==================== */
        @media (max-width: 768px) {
            .viewer-toolbar {
                padding: 8px 12px;
                flex-wrap: wrap;
            }
            
            .search-input {
                width: 100px;
            }
            
            .sheet-tab {
                padding: 6px 12px;
                font-size: 12px;
            }
            
            .spreadsheet-grid td {
                padding: 6px 8px;
                font-size: 12px;
            }
        }
    `]
})
export class SpreadsheetViewerComponent implements OnInit, OnChanges, OnDestroy {
    @Input() file: SpreadsheetFile | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() download = new EventEmitter<SpreadsheetFile>();

    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
    @ViewChild('gridContainer') gridContainer!: ElementRef<HTMLDivElement>;

    // State
    isLoading: boolean = true;
    loadError: string = '';
    previewUrl: SafeResourceUrl | null = null;

    // Sheet data
    sheets: Sheet[] = [];
    activeSheetIndex: number = 0;
    activeSheet: Sheet | null = null;

    // Virtual scrolling
    visibleRows: any[] = [];
    visibleColumns: number[] = [];
    scrollTop: number = 0;
    scrollLeft: number = 0;

    // Zoom
    zoomLevel: number = 100;

    // Search functionality
    isSearchOpen: boolean = false;
    searchQuery: string = '';
    searchResults: { row: number; col: number }[] = [];
    currentSearchIndex: number = 0;

    // Column filtering
    columnFilters: { [key: number]: string } = {};
    activeFilterColumn: number | null = null;
    filterDropdownPosition = { x: 0, y: 0 };

    // Column resizing
    columnWidths: ColumnWidth = {};
    private isResizing: boolean = false;
    private resizeColumnIndex: number = -1;
    private resizeStartX: number = 0;
    private resizeStartWidth: number = 0;
    private readonly DEFAULT_COLUMN_WIDTH = 120;
    private readonly MIN_COLUMN_WIDTH = 50;
    private readonly MAX_COLUMN_WIDTH = 400;

    // Cell selection
    selectedCell: { row: number; col: number } | null = null;

    private apiUrl = environment.apiUrl;

    constructor(
        private sanitizer: DomSanitizer,
        private cdr: ChangeDetectorRef,
        private ngZone: NgZone,
        private authService: AuthService
    ) { }

    // Prevent multiple simultaneous loadPreview calls
    private isLoadingInProgress = false;
    private currentDocumentId: string | null = null;

    ngOnInit() {
        // Only load if file is already set (rare edge case)
        if (this.file?.documentId && this.file.documentId !== this.currentDocumentId) {
            this.loadPreviewSafe();
        }

        // Add global mouse event listeners for column resizing
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    ngOnChanges(changes: SimpleChanges) {
        // Only reload if the file actually changed to a different document
        if (changes['file'] && this.file?.documentId) {
            if (this.file.documentId !== this.currentDocumentId) {
                this.loadPreviewSafe();
            }
        }
    }

    private loadPreviewSafe() {
        // Prevent duplicate/concurrent calls
        if (this.isLoadingInProgress) {
            console.log('[SpreadsheetViewer] Load already in progress, skipping');
            return;
        }
        this.currentDocumentId = this.file?.documentId || null;
        this.loadPreview();
    }

    ngOnDestroy() {
        // Mark as destroyed to prevent further updates
        this.isLoadingInProgress = false;
        this.currentDocumentId = null;

        // Clean up event listeners
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }

    @HostListener('document:keydown.escape')
    onEscapeKey() {
        if (this.isSearchOpen) {
            this.closeSearch();
        } else if (this.activeFilterColumn !== null) {
            this.closeColumnFilter();
        } else {
            this.onClose();
        }
    }

    @HostListener('document:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        // Ctrl+F to open search
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            this.toggleSearch();
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            if (event.key === '=' || event.key === '+') {
                event.preventDefault();
                this.zoomIn();
            } else if (event.key === '-') {
                event.preventDefault();
                this.zoomOut();
            }
        }
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        // Close filter dropdown if clicking outside
        if (this.activeFilterColumn !== null) {
            const target = event.target as HTMLElement;
            if (!target.closest('.filter-dropdown') && !target.closest('.filter-btn')) {
                this.closeColumnFilter();
            }
        }
    }

    // ==================== SEARCH FUNCTIONALITY ====================

    toggleSearch() {
        this.isSearchOpen = !this.isSearchOpen;
        if (this.isSearchOpen) {
            setTimeout(() => {
                this.searchInput?.nativeElement?.focus();
            }, 100);
        } else {
            this.searchQuery = '';
            this.searchResults = [];
            this.currentSearchIndex = 0;
        }
    }

    closeSearch() {
        this.isSearchOpen = false;
        this.searchQuery = '';
        this.searchResults = [];
        this.currentSearchIndex = 0;
    }

    onSearchChange() {
        this.searchResults = [];
        this.currentSearchIndex = 0;

        if (!this.searchQuery.trim() || !this.activeSheet?.rows) {
            this.cdr.detectChanges();
            return;
        }

        const query = this.searchQuery.toLowerCase();
        const rows = this.activeSheet.rows;

        rows.forEach((row: any, rowIdx: number) => {
            if (row.cells) {
                row.cells.forEach((cell: any, colIdx: number) => {
                    const value = String(cell.value || '').toLowerCase();
                    if (value.includes(query)) {
                        this.searchResults.push({ row: rowIdx, col: colIdx });
                    }
                });
            }
        });

        if (this.searchResults.length > 0) {
            this.scrollToSearchResult(0);
        }

        this.cdr.detectChanges();
    }

    findNext() {
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        this.scrollToSearchResult(this.currentSearchIndex);
    }

    findPrevious() {
        if (this.searchResults.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
        this.scrollToSearchResult(this.currentSearchIndex);
    }

    private scrollToSearchResult(index: number) {
        const result = this.searchResults[index];
        if (result && this.gridContainer?.nativeElement) {
            // Approximate scroll position
            const rowHeight = 36;
            const colWidth = this.getColumnWidth(result.col);
            const scrollTop = result.row * rowHeight;
            const scrollLeft = result.col * colWidth;

            this.gridContainer.nativeElement.scrollTo({
                top: Math.max(0, scrollTop - 100),
                left: Math.max(0, scrollLeft - 100),
                behavior: 'smooth'
            });
        }
    }

    highlightSearchMatch(value: string, rowIdx: number, colIdx: number): string {
        if (!this.searchQuery.trim() || !value) {
            return value || '';
        }

        const query = this.searchQuery.toLowerCase();
        const lowerValue = String(value).toLowerCase();
        const index = lowerValue.indexOf(query);

        if (index === -1) {
            return value;
        }

        const isCurrentMatch = this.searchResults[this.currentSearchIndex]?.row === rowIdx &&
            this.searchResults[this.currentSearchIndex]?.col === colIdx;

        const before = String(value).substring(0, index);
        const match = String(value).substring(index, index + query.length);
        const after = String(value).substring(index + query.length);

        const highlightClass = isCurrentMatch ? 'current-search-match' : 'search-highlight';
        return `${before}<span class="${highlightClass}">${match}</span>${after}`;
    }

    isSearchMatchRow(rowIdx: number): boolean {
        return this.searchResults.some(r => r.row === rowIdx);
    }

    // ==================== COLUMN FILTERING ====================

    toggleColumnFilter(colIndex: number, event: MouseEvent) {
        event.stopPropagation();

        if (this.activeFilterColumn === colIndex) {
            this.closeColumnFilter();
            return;
        }

        const rect = (event.target as HTMLElement).getBoundingClientRect();
        this.filterDropdownPosition = {
            x: rect.left,
            y: rect.bottom + 5
        };
        this.activeFilterColumn = colIndex;
    }

    closeColumnFilter() {
        this.activeFilterColumn = null;
    }

    clearColumnFilter(colIndex: number) {
        delete this.columnFilters[colIndex];
        this.closeColumnFilter();
        this.cdr.detectChanges();
    }

    applyFilters() {
        this.cdr.detectChanges();
    }

    getFilteredRows(): any[] {
        if (!this.visibleRows || Object.keys(this.columnFilters).length === 0) {
            return this.visibleRows;
        }

        return this.visibleRows.filter((row: any) => {
            return Object.entries(this.columnFilters).every(([colIdx, filterValue]) => {
                if (!filterValue) return true;
                const cell = row.cells?.[parseInt(colIdx)];
                const cellValue = String(cell?.value || '').toLowerCase();
                return cellValue.includes(filterValue.toLowerCase());
            });
        });
    }

    // ==================== COLUMN RESIZING ====================

    getColumnWidth(colIndex: number): number {
        return this.columnWidths[colIndex] || this.DEFAULT_COLUMN_WIDTH;
    }

    startResize(event: MouseEvent, colIndex: number) {
        event.preventDefault();
        event.stopPropagation();

        this.isResizing = true;
        this.resizeColumnIndex = colIndex;
        this.resizeStartX = event.clientX;
        this.resizeStartWidth = this.getColumnWidth(colIndex);

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    private onMouseMove(event: MouseEvent) {
        if (!this.isResizing) return;

        const diff = event.clientX - this.resizeStartX;
        let newWidth = this.resizeStartWidth + diff;

        // Clamp width
        newWidth = Math.max(this.MIN_COLUMN_WIDTH, Math.min(this.MAX_COLUMN_WIDTH, newWidth));

        this.columnWidths[this.resizeColumnIndex] = newWidth;
        this.cdr.detectChanges();
    }

    private onMouseUp() {
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeColumnIndex = -1;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    }

    autoFitColumn(colIndex: number) {
        // Auto-fit column to content (simplified - uses a reasonable width)
        // In a real implementation, you'd measure actual content
        let maxWidth = this.MIN_COLUMN_WIDTH;

        if (this.activeSheet?.rows) {
            this.activeSheet.rows.forEach((row: any) => {
                const cell = row.cells?.[colIndex];
                if (cell?.value) {
                    const estimatedWidth = String(cell.value).length * 8 + 24;
                    maxWidth = Math.max(maxWidth, estimatedWidth);
                }
            });
        }

        this.columnWidths[colIndex] = Math.min(maxWidth, this.MAX_COLUMN_WIDTH);
        this.cdr.detectChanges();
    }

    // ==================== CELL SELECTION ====================

    selectCell(rowIdx: number, colIdx: number) {
        this.selectedCell = { row: rowIdx, col: colIdx };
    }

    isRowHighlighted(rowIdx: number): boolean {
        return this.selectedCell?.row === rowIdx;
    }

    getCellClass(cell: any, rowIdx: number, colIdx: number): string {
        if (!cell) return 'cell-empty';
        const classes = ['cell-' + (cell.type || 'text')];
        if (this.selectedCell?.row === rowIdx && this.selectedCell?.col === colIdx) {
            classes.push('selected');
        }
        return classes.join(' ');
    }

    // ==================== CORE FUNCTIONALITY ====================

    async loadPreview() {
        if (!this.file?.documentId) {
            this.loadError = 'No document ID available';
            this.isLoading = false;
            this.isLoadingInProgress = false;
            return;
        }

        this.isLoadingInProgress = true;
        this.isLoading = true;
        this.loadError = '';
        this.previewUrl = null;

        try {
            console.log('[SpreadsheetViewer] Loading file for client-side parsing:', this.file.fileName);

            const docId = this.file.documentId;
            const token = await this.authService.getToken();

            // 1. Fetch document metadata first to get fresh signed URL (like PDF/Image)
            let downloadUrl = `${this.apiUrl}/secure/documents/${docId}/view`;
            let fetchHeaders: any = { 'Authorization': `Bearer ${token}` };

            try {
                const metaResponse = await fetch(`${this.apiUrl}/secure/documents/${docId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (metaResponse.ok) {
                    const metaData = await metaResponse.json();
                    if (metaData.success && metaData.document?.signedUrl) {
                        console.log('[SpreadsheetViewer] Using direct S3 signed URL');
                        downloadUrl = metaData.document.signedUrl;
                        fetchHeaders = {}; // No auth headers for S3
                    }
                }
            } catch (e) {
                console.warn('[SpreadsheetViewer] Failed to fetch metadata, falling back to proxy');
            }

            // 2. Fetch File Content as ArrayBuffer
            const response = await fetch(downloadUrl, { headers: fetchHeaders });

            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();

            // 3. Parse with XLSX
            this.parseExcelData(arrayBuffer);

        } catch (error: any) {
            console.error('[SpreadsheetViewer] Load error:', error);
            this.ngZone.run(() => {
                this.loadError = error.message || 'Failed to load spreadsheet. Try downloading instead.';
                this.isLoading = false;
                this.isLoadingInProgress = false;
                this.cdr.detectChanges();
            });
        }
    }

    private parseExcelData(buffer: ArrayBuffer) {
        try {
            console.log('[SpreadsheetViewer] Parsing data, buffer bytes:', buffer.byteLength);

            if (!XLSX) {
                throw new Error('XLSX library not loaded. Please refresh.');
            }

            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in workbook');
            }

            this.ngZone.run(() => {
                this.sheets = workbook.SheetNames.map((name: string, i: number) => {
                    const worksheet = workbook.Sheets[name];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    const rows = this.processSheetData(json);

                    // Determine max columns from the processed rows
                    const maxCols = rows.length > 0 ? rows[0].cells.length : 0;

                    return {
                        name,
                        index: i,
                        rowCount: rows.length,
                        colCount: maxCols,
                        rows: rows
                    };
                });

                if (this.sheets.length > 0) {
                    this.activeSheet = this.sheets[0];
                    this.activeSheetIndex = 0;
                    this.updateVisibleData();
                    this.isLoading = false;
                } else {
                    this.loadError = 'Empty spreadsheet.';
                    this.isLoading = false;
                }

                this.isLoadingInProgress = false;
                this.cdr.detectChanges();
            });

        } catch (error: any) {
            console.error('[SpreadsheetViewer] Parse error:', error);
            this.ngZone.run(() => {
                this.loadError = `Preview Error: ${error.message}`;
                this.isLoading = false;
                this.isLoadingInProgress = false;
                this.cdr.detectChanges();
            });
        }
    }

    private processSheetData(jsonData: any[]): any[] {
        if (!jsonData || jsonData.length === 0) return [];

        // 1. Determine maximum column count
        let maxCols = 0;
        jsonData.forEach((row: any[]) => {
            if (row && row.length > maxCols) maxCols = row.length;
        });

        // 2. Map rows and pad with empty cells to ensure uniform grid
        return jsonData.map((row: any[], rowIndex: number) => {
            const rowData = row || [];
            const cells = [];

            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const cellValue = rowData[colIndex];
                let type = 'text';

                if (typeof cellValue === 'number') type = 'number';
                else if (cellValue instanceof Date) type = 'date';

                cells.push({
                    value: cellValue !== undefined && cellValue !== null ? String(cellValue) : '',
                    type,
                    col: colIndex,
                    row: rowIndex
                });
            }

            return {
                rowNumber: rowIndex + 1,
                cells: cells
            };
        });
    }

    switchSheet(index: number) {
        if (index >= 0 && index < this.sheets.length) {
            this.activeSheetIndex = index;
            this.activeSheet = this.sheets[index];
            this.updateVisibleData();
            // Reset search and filters when switching sheets
            this.searchResults = [];
            this.currentSearchIndex = 0;
            this.columnFilters = {};
            this.selectedCell = null;
        }
    }

    updateVisibleData() {
        if (!this.activeSheet) return;

        // For simplicity, show all rows/cols (real virtual scrolling would slice based on scroll position)
        this.visibleRows = this.activeSheet.rows || [];
        this.visibleColumns = Array.from({ length: this.activeSheet.colCount || 10 }, (_, i) => i);
    }

    onScroll(event: any) {
        this.scrollTop = event.target.scrollTop;
        this.scrollLeft = event.target.scrollLeft;
        // Could trigger virtual scrolling update here
    }

    getColumnLabel(index: number): string {
        let label = '';
        let num = index;

        while (num >= 0) {
            label = String.fromCharCode(65 + (num % 26)) + label;
            num = Math.floor(num / 26) - 1;
        }

        return label;
    }

    zoomIn() {
        if (this.zoomLevel < 200) {
            this.zoomLevel += 10;
        }
    }

    zoomOut() {
        if (this.zoomLevel > 50) {
            this.zoomLevel -= 10;
        }
    }

    onIframeLoad() {
        console.log('[SpreadsheetViewer] Preview iframe loaded');
        this.isLoading = false;
    }

    onIframeError() {
        console.error('[SpreadsheetViewer] Preview iframe failed');
        this.loadError = 'Failed to load spreadsheet preview';
        this.previewUrl = null;
        this.isLoading = false;
    }

    onClose() {
        this.close.emit();
    }

    onDownload() {
        if (this.file) {
            this.download.emit(this.file);
        }
    }
}

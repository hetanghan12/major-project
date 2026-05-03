import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Document } from './document.service';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private selectedFilesSubject = new BehaviorSubject<Document[]>([]);
  selectedFiles$ = this.selectedFilesSubject.asObservable();
  
  // Selection Metadata
  selectedCount$ = this.selectedFiles$.pipe(map(files => files.length));

  constructor() {}

  /**
   * Get current selected files synchronously
   */
  get currentSelection(): Document[] {
    return this.selectedFilesSubject.getValue();
  }

  private lastSelectedIndex: number = -1;

  /**
   * Toggle document selection
   */
  toggleSelection(doc: Document, index: number = -1): void {
    const current = this.currentSelection;
    const exists = current.some(d => d.documentId === doc.documentId);
    
    if (exists) {
      this.selectedFilesSubject.next(current.filter(d => d.documentId !== doc.documentId));
    } else {
      this.selectedFilesSubject.next([...current, doc]);
    }
    this.lastSelectedIndex = index;
  }

  /**
   * Handle Shift + Click range selection
   */
  selectRange(docs: Document[], startIndex: number, endIndex: number): void {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const range = docs.slice(start, end + 1);
    
    const current = this.currentSelection;
    const combined = [...current];
    
    range.forEach(doc => {
      if (!combined.some(d => d.documentId === doc.documentId)) {
        combined.push(doc);
      }
    });
    
    this.selectedFilesSubject.next(combined);
    this.lastSelectedIndex = endIndex;
  }

  getLastSelectedIndex(): number {
    return this.lastSelectedIndex;
  }

  setLastSelectedIndex(index: number): void {
    this.lastSelectedIndex = index;
  }

  /**
   * Check if a document is selected
   */
  isSelected(documentId: string): boolean {
    return this.currentSelection.some(d => d.documentId === documentId);
  }

  /**
   * Select all provided documents
   */
  selectAll(docs: Document[]): void {
    this.selectedFilesSubject.next([...docs]);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedFilesSubject.next([]);
  }

  /**
   * Update selection after an operation (remove deleted items)
   */
  removeItems(ids: string[]): void {
    const current = this.currentSelection;
    const updated = current.filter(d => !ids.includes(d.documentId));
    this.selectedFilesSubject.next(updated);
  }

  /**
   * Only keep failed items selected for retry
   */
  keepOnlyFailedItems(failedIds: string[]): void {
    const current = this.currentSelection;
    const updated = current.filter(d => failedIds.includes(d.documentId));
    this.selectedFilesSubject.next(updated);
  }
}

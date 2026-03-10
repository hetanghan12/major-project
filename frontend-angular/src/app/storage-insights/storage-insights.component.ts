import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../core/services/document.service';

@Component({
  selector: 'app-storage-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in bg-[#f4f7f6] min-h-[calc(100vh-64px)] pb-12">
      <!-- Header -->
      <div class="px-8 mt-6 mb-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 mb-2">Storage Insights</h1>
        <p class="text-gray-500 text-[15px]">Analyze how your storage is used and find ways to optimize it.</p>
      </div>

      <!-- Main Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 px-8">
        
        <!-- Left Column: File Type Breakdown -->
        <div class="bg-white rounded-[20px] p-7 shadow-sm border border-gray-100/80">
          <div class="flex items-center gap-3 mb-8">
            <svg class="w-6 h-6 text-yellow-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
            </svg>
            <h3 class="font-bold text-gray-900 text-[17px] m-0">File Type Breakdown</h3>
          </div>

          <div class="flex flex-col gap-6">
            <!-- Videos -->
            <div>
              <div class="flex justify-between items-end mb-2 cursor-pointer group" (click)="toggleCategory('videos')">
                <div class="flex items-center gap-2">
                  <span class="text-[14px] text-gray-700 font-medium group-hover:text-purple-600 transition-colors">Videos</span>
                  <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" [class.rotate-180]="expandedCategory() === 'videos'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                <span class="text-[14px] text-gray-500 font-medium">{{ formatFileSize(videosBreakdown().total) }}</span>
              </div>
              <div class="h-[6px] w-full bg-gray-100 rounded-full overflow-hidden cursor-pointer" (click)="toggleCategory('videos')">
                 <div class="h-full bg-purple-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(videosBreakdown().total)"></div>
              </div>
              <!-- Detailed Breakdown -->
              <div class="overflow-hidden transition-all duration-300" [style.maxHeight]="expandedCategory() === 'videos' ? '300px' : '0'">
                 <div class="pt-3 pl-2 pb-1">
                   <div *ngIf="videosBreakdown().details.length === 0" class="text-[13px] text-gray-400 italic">No video files found.</div>
                   <div *ngFor="let item of videosBreakdown().details" class="flex justify-between text-[13px] py-1.5">
                     <span class="text-gray-600 font-medium flex items-center gap-2.5">
                       <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span> {{ item.format }}
                     </span>
                     <span class="text-gray-500">{{ formatFileSize(item.size) }}</span>
                   </div>
                 </div>
              </div>
            </div>

            <!-- Images -->
            <div>
              <div class="flex justify-between items-end mb-2 cursor-pointer group" (click)="toggleCategory('images')">
                <div class="flex items-center gap-2">
                  <span class="text-[14px] text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">Images</span>
                  <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" [class.rotate-180]="expandedCategory() === 'images'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                <span class="text-[14px] text-gray-500 font-medium">{{ formatFileSize(imagesBreakdown().total) }}</span>
              </div>
              <div class="h-[6px] w-full bg-gray-100 rounded-full overflow-hidden cursor-pointer" (click)="toggleCategory('images')">
                 <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(imagesBreakdown().total)"></div>
              </div>
              <!-- Detailed Breakdown -->
              <div class="overflow-hidden transition-all duration-300" [style.maxHeight]="expandedCategory() === 'images' ? '300px' : '0'">
                 <div class="pt-3 pl-2 pb-1">
                   <div *ngIf="imagesBreakdown().details.length === 0" class="text-[13px] text-gray-400 italic">No image files found.</div>
                   <div *ngFor="let item of imagesBreakdown().details" class="flex justify-between text-[13px] py-1.5">
                     <span class="text-gray-600 font-medium flex items-center gap-2.5">
                       <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> {{ item.format }}
                     </span>
                     <span class="text-gray-500">{{ formatFileSize(item.size) }}</span>
                   </div>
                 </div>
              </div>
            </div>

            <!-- Documents -->
            <div>
              <div class="flex justify-between items-end mb-2 cursor-pointer group" (click)="toggleCategory('documents')">
                <div class="flex items-center gap-2">
                  <span class="text-[14px] text-gray-700 font-medium group-hover:text-green-600 transition-colors">Documents</span>
                  <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" [class.rotate-180]="expandedCategory() === 'documents'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                <span class="text-[14px] text-gray-500 font-medium">{{ formatFileSize(documentsBreakdown().total) }}</span>
              </div>
              <div class="h-[6px] w-full bg-gray-100 rounded-full overflow-hidden cursor-pointer" (click)="toggleCategory('documents')">
                 <div class="h-full bg-green-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(documentsBreakdown().total)"></div>
              </div>
              <!-- Detailed Breakdown -->
              <div class="overflow-hidden transition-all duration-300" [style.maxHeight]="expandedCategory() === 'documents' ? '400px' : '0'">
                 <div class="pt-3 pl-2 pb-1">
                   <div *ngIf="documentsBreakdown().details.length === 0" class="text-[13px] text-gray-400 italic">No document files found.</div>
                   <div *ngFor="let item of documentsBreakdown().details" class="flex justify-between text-[13px] py-1.5">
                     <span class="text-gray-600 font-medium flex items-center gap-2.5">
                       <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> {{ item.format }}
                     </span>
                     <span class="text-gray-500">{{ formatFileSize(item.size) }}</span>
                   </div>
                 </div>
              </div>
            </div>
            
          </div>
        </div>

        <!-- Right Column: Quick Actions -->
        <div class="bg-white rounded-[20px] p-7 shadow-sm border border-gray-100/80">
          <div class="flex items-center gap-3 mb-6">
            <svg class="w-6 h-6 text-orange-400 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <h3 class="font-bold text-gray-900 text-[17px] m-0">Quick Actions</h3>
          </div>

          <!-- Deep Clean Recommended Card -->
          <div class="bg-[#f5f3ff] border border-purple-100 rounded-[16px] p-5 relative overflow-hidden group">
            <h4 class="font-bold text-gray-900 text-[15px] mb-1 relative z-10">Deep Clean Recommended</h4>
            <p class="text-[13.5px] text-gray-600 mb-5 relative z-10 leading-relaxed">
              We found {{ trashedCount() }} items currently sitting in your trash bin. Emptying it can instantly free up space.
            </p>
            
            <button class="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-2.5 px-4 rounded-[10px] text-sm transition-all shadow-sm flex items-center justify-center gap-2 relative z-10"
                    (click)="emptyTrash()"
                    [disabled]="trashedSize() === 0">
               <span *ngIf="trashedSize() === 0">Your trash is empty</span>
               <span *ngIf="trashedSize() > 0">Clean {{ formatFileSize(trashedSize()) }}</span>
            </button>
            <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-200/50 rounded-full blur-xl group-hover:bg-purple-300/50 transition-colors pointer-events-none"></div>
          </div>

          <!-- Large Files Card -->
          <div class="mt-6 border border-gray-100 rounded-[16px] p-5">
             <h4 class="font-bold text-gray-900 text-[15px] mb-3">Large Documents</h4>
             <div class="flex flex-col gap-3">
               <div *ngIf="largeFiles().length === 0" class="text-[13px] text-gray-500 italic">No large files found.</div>
               <div *ngFor="let file of largeFiles()" class="flex justify-between items-center text-[13px] bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div class="flex flex-col min-w-0 pr-3">
                    <span class="truncate font-medium text-gray-700" [title]="file.fileName">{{ file.fileName }}</span>
                    <span class="text-gray-400 text-xs mt-0.5" *ngIf="file.uploadedAt">{{ file.uploadedAt | date:'mediumDate' }}</span>
                  </div>
                  <span class="bg-gray-200 text-gray-700 font-medium px-2 py-1 rounded-md">{{ formatFileSize(file.fileSize || 0) }}</span>
               </div>
             </div>
          </div>

          <!-- Duplicate Files Card -->
          <div class="mt-6 border border-gray-100 rounded-[16px] p-5">
             <div class="flex justify-between items-start mb-2">
               <div>
                 <h4 class="font-bold text-gray-900 text-[15px]">Duplicate Files</h4>
                 <p class="text-[12.5px] text-gray-500 mt-0.5" *ngIf="duplicateFiles().length > 0">Select duplicates to safely free up space.</p>
               </div>
               <span class="text-xs bg-red-50 border border-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold" *ngIf="duplicateFiles().length > 0">{{ duplicateFiles().length }} items</span>
             </div>
             
             <div class="text-[13px] text-gray-400 italic mb-1 mt-4" *ngIf="duplicateFiles().length === 0">No duplicates found. Great job!</div>
             
             <div class="flex flex-col gap-2 max-h-[160px] overflow-y-auto mb-4 mt-4 pr-1" *ngIf="duplicateFiles().length > 0">
               <label *ngFor="let file of duplicateFiles()" class="flex items-start gap-3 p-2.5 bg-[#fcfcfc] hover:bg-white rounded-xl cursor-pointer border border-gray-200 transition-all shadow-sm">
                 <input type="checkbox" [checked]="selectedDuplicates().has(file.documentId)" (change)="toggleDuplicateSelection(file.documentId)" class="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300">
                 <div class="flex-1 min-w-0">
                   <div class="text-[13px] font-medium text-gray-800 truncate" [title]="file.fileName">{{ file.fileName }}</div>
                   <div class="flex items-center gap-2 mt-0.5">
                     <span class="bg-gray-100 text-gray-500 text-[11px] font-medium px-1.5 py-0.5 rounded">{{ formatFileSize(file.fileSize || 0) }}</span>
                     <span class="text-[11px] text-gray-400" *ngIf="file.uploadedAt">Uploaded: {{ file.uploadedAt | date:'shortDate' }}</span>
                   </div>
                 </div>
               </label>
             </div>

             <button *ngIf="duplicateFiles().length > 0" 
                     class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-4 rounded-[10px] text-[13.5px] transition-all flex items-center justify-center gap-2 shadow-sm"
                     [disabled]="selectedDuplicates().size === 0 || isDeletingDuplicates()"
                     [class.opacity-50]="selectedDuplicates().size === 0 || isDeletingDuplicates()"
                     [class.cursor-not-allowed]="selectedDuplicates().size === 0 || isDeletingDuplicates()"
                     (click)="deleteSelectedDuplicates()">
                 <!-- Normal state -->
                 <ng-container *ngIf="!isDeletingDuplicates()">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                   Delete {{ selectedDuplicates().size > 0 ? selectedDuplicates().size : '' }} Selected
                 </ng-container>
                 <!-- Loading state -->
                 <ng-container *ngIf="isDeletingDuplicates()">
                   <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                     <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Deleting...
                 </ng-container>
             </button>
          </div>

        </div>

      </div>
    </div>
  `
})
export class StorageInsightsComponent implements OnInit {

  expandedCategory = signal<string | null>(null);

  constructor(public documentService: DocumentService) {
  }

  ngOnInit() {
    this.documentService.loadDocuments();
  }

  toggleCategory(category: string) {
    if (this.expandedCategory() === category) {
      this.expandedCategory.set(null);
    } else {
      this.expandedCategory.set(category);
    }
  }

  // Modern Angular Reactivity using computed signals

  videosBreakdown = computed(() => {
    const map = new Map<string, number>();
    let total = 0;
    this.documentService.documents().forEach(doc => {
      if ((doc as any).isTrashed) return;
      const type = (doc.fileType || '').toLowerCase();
      const name = (doc.fileName || '').toLowerCase();
      if (type.includes('video') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi')) {
        let ext = name.split('.').pop() || 'unknown';
        if (!name.includes('.')) ext = 'other';
        const size = doc.fileSize || 0;
        map.set(ext, (map.get(ext) || 0) + size);
        total += size;
      }
    });
    const details = Array.from(map.entries())
      .map(([format, size]) => ({ format: format.toUpperCase(), size }))
      .sort((a, b) => b.size - a.size);
    return { total, details };
  });

  imagesBreakdown = computed(() => {
    const map = new Map<string, number>();
    let total = 0;
    this.documentService.documents().forEach(doc => {
      if ((doc as any).isTrashed) return;
      const type = (doc.fileType || '').toLowerCase();
      const name = (doc.fileName || '').toLowerCase();
      if (type.includes('image') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp')) {
        let ext = name.split('.').pop() || 'unknown';
        if (!name.includes('.')) ext = 'other';
        const size = doc.fileSize || 0;
        map.set(ext, (map.get(ext) || 0) + size);
        total += size;
      }
    });
    const details = Array.from(map.entries())
      .map(([format, size]) => ({ format: format.toUpperCase(), size }))
      .sort((a, b) => b.size - a.size);
    return { total, details };
  });

  documentsBreakdown = computed(() => {
    const map = new Map<string, number>();
    let total = 0;
    this.documentService.documents().forEach(doc => {
      if ((doc as any).isTrashed) return;
      const type = (doc.fileType || '').toLowerCase();
      const name = (doc.fileName || '').toLowerCase();
      const isVideo = type.includes('video') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi');
      const isImage = type.includes('image') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp');

      if (!isVideo && !isImage) {
        let ext = name.split('.').pop() || 'unknown';
        if (!name.includes('.') || ext.length > 6) ext = 'other documents';
        const size = doc.fileSize || 0;
        map.set(ext, (map.get(ext) || 0) + size);
        total += size;
      }
    });
    const details = Array.from(map.entries())
      .map(([format, size]) => ({ format: format.toUpperCase(), size }))
      .sort((a, b) => b.size - a.size);
    return { total, details };
  });

  trashedCount = computed(() => {
    return this.documentService.documents().filter(doc => (doc as any).isTrashed).length;
  });

  trashedSize = computed(() => {
    let size = 0;
    this.documentService.documents().forEach(doc => {
      if ((doc as any).isTrashed) {
        size += (doc.fileSize || 0);
      }
    });
    return size;
  });

  totalCalculatedSize = computed(() => {
    return this.videosBreakdown().total + this.imagesBreakdown().total + this.documentsBreakdown().total;
  });

  emptyTrash() {
    if (confirm('This would permanently delete all files in the trash bin. Are you sure?')) {
      console.log('Emptying trash...');
      // Trigger actual service logic here if needed
    }
  }

  getPercentage(size: number): number {
    const total = this.totalCalculatedSize();
    if (total === 0) return 0;

    // Calculate exact percentage
    const percent = (size / total) * 100;

    // Force a minimum visual width if greater than 0 so the bar is at least visible.
    if (size > 0 && percent < 2) return 2;

    return percent;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // --- New Quick Action Computations ---

  largeFiles = computed(() => {
    const docs = this.documentService.documents().filter(d => !(d as any).isTrashed);
    return [...docs].sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0)).slice(0, 3);
  });

  duplicateFiles = computed(() => {
    const docs = this.documentService.documents().filter(d => !(d as any).isTrashed);
    const map = new Map<string, any[]>();

    docs.forEach(doc => {
      const sizeStr = (doc.fileSize || 0).toString();
      const ext = (doc.fileName || '').split('.').pop()?.toLowerCase();
      const baseName = (doc.fileName || '').split('.').slice(0, -1).join('.').toLowerCase();

      // Combine name + size as a unique key for identifying duplicates
      const key = `${baseName}_${sizeStr}_${ext}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    });

    // Extract duplicates (anything beyond the first file in a group)
    const duplicates: any[] = [];
    map.forEach(group => {
      if (group.length > 1) {
        // Assume first element is original, push rest as duplicated
        for (let i = 1; i < group.length; i++) {
          duplicates.push(group[i]);
        }
      }
    });
    return duplicates;
  });

  selectedDuplicates = signal<Set<string>>(new Set());
  isDeletingDuplicates = signal(false);

  toggleDuplicateSelection(docId: string) {
    const current = new Set(this.selectedDuplicates());
    if (current.has(docId)) current.delete(docId);
    else current.add(docId);
    this.selectedDuplicates.set(current);
  }

  async deleteSelectedDuplicates() {
    const selectedIds = Array.from(this.selectedDuplicates());
    if (selectedIds.length === 0) return;

    if (confirm(`Are you sure you want to permanently delete these ${selectedIds.length} duplicate file(s)?`)) {
      this.isDeletingDuplicates.set(true);
      try {
        // Execute all delete requests in parallel to massively speed up processing
        const deletePromises = selectedIds.map(id => this.documentService.deleteDocument(id));
        await Promise.all(deletePromises);

        this.selectedDuplicates.set(new Set());
        alert(`${selectedIds.length} duplicate file(s) permanently deleted.`);
      } catch (error) {
        console.error('Error deleting duplicates:', error);
        alert('Failed to delete some files. They may have already been removed.');
      } finally {
        this.isDeletingDuplicates.set(false);
      }
    }
  }
}

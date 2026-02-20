/**
 * File/Folder Model - Google Drive-like Structure
 * =================================================
 * Extended document model with folder support, starring, and sharing
 */

export interface CloudFile {
    documentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    publicUrl: string;
    vectorCount: number;
    status: 'processing' | 'ready' | 'failed';
    uploadedAt: string;
    modifiedAt?: string;

    // Google Drive-like features
    isFolder: boolean;
    parentFolderId: string | null;  // null = root
    isStarred: boolean;
    isTrashed: boolean;
    sharedWith?: string[];  // User IDs for sharing
    color?: string;  // Folder color
    description?: string;

    // For display
    thumbnailUrl?: string;
    error?: string;
}

export interface Folder extends CloudFile {
    isFolder: true;
    childCount?: number;
}

export interface BreadcrumbItem {
    id: string | null;
    name: string;
}

export interface ContextMenuAction {
    id: string;
    label: string;
    icon: string;
    divider?: boolean;
    danger?: boolean;
    disabled?: boolean;
}

export interface FileAction {
    type: 'open' | 'download' | 'star' | 'unstar' | 'rename' | 'move' | 'copy' | 'share' | 'delete' | 'restore' | 'preview' | 'details';
    file: CloudFile;
}

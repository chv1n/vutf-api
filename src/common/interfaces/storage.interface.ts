/**
 * Storage Service Interface
 * Following SOLID - Interface Segregation Principle
 * Allows swapping between MinIO, S3, GCS, etc.
 */
export interface IStorageService {
    /**
     * Upload a file to storage
     * @param file - Multer file object
     * @param path - Storage path/key
     * @returns Upload result with URL and metadata
     */
    uploadFile(file: Express.Multer.File, path: string): Promise<UploadResult>;

    /**
     * Delete a file from storage
     * @param path - Storage path/key to delete
     */
    deleteFile(path: string): Promise<void>;

    /**
     * Get a presigned URL for file access
     * @param path - Storage path/key
     * @param expiresIn - URL expiration time in seconds (default: 3600)
     * @returns Presigned URL string
     */
    getFileUrl(path: string, expiresIn?: number, isDownload?: boolean, fileName?: string): Promise<string>;
}

export interface UploadResult {
    url: string;
    path: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

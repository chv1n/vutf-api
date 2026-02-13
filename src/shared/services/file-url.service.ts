// src/shared/services/file-url.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { STORAGE_SERVICE } from '../../common/interfaces/storage.interface';
import type { IStorageService } from '../../common/interfaces/storage.interface';

@Injectable()
export class FileUrlService {
  private readonly logger = new Logger(FileUrlService.name);

  constructor(
    @Inject(STORAGE_SERVICE) 
    private readonly storageService: IStorageService
  ) {}

  /**
   * Generate Signed URLs
   * รองรับทั้ง storagePath ปกติ และ Full URL
   */
  async generateSignedUrls(inputPath: string, fileName: string): Promise<{ url: string; downloadUrl: string }> {
    if (!inputPath) {
      return { url: '', downloadUrl: '' };
    }

    let fileKey = inputPath;

    if (inputPath.startsWith('http')) {
      try {
        const urlObj = new URL(inputPath);
        // ถอดรหัสอักขระพิเศษใน Path
        let rawPath = decodeURIComponent(urlObj.pathname);
        if (rawPath.startsWith('/')) rawPath = rawPath.substring(1);

        // ค้นหาตำแหน่งเริ่มต้นของ Folder หลัก (เช่น reports/ หรือ submissions/)
        // เพื่อให้ได้ Key ที่ถูกต้องสำหรับ Storage
        const markers = ['reports/', 'submissions/'];
        let foundMarker = false;

        for (const marker of markers) {
          const index = rawPath.indexOf(marker);
          if (index !== -1) {
            fileKey = rawPath.substring(index);
            foundMarker = true;
            break;
          }
        }

        if (!foundMarker) fileKey = rawPath;
      } catch (e) {
        this.logger.warn(`Could not parse URL ${inputPath}, using original value.`);
      }
    }

    try {
      const [url, downloadUrl] = await Promise.all([
        this.storageService.getFileUrl(fileKey, 3600, false),
        this.storageService.getFileUrl(fileKey, 3600, true, fileName),
      ]);

      return { url, downloadUrl };
    } catch (error) {
      this.logger.error(`Failed to generate URLs for key ${fileKey}: ${error.message}`);
      return { url: '', downloadUrl: '' };
    }
  }
}
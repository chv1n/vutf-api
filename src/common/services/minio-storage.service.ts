import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { IStorageService, UploadResult } from '../interfaces/storage.interface';

/**
 * MinIO Storage Service Implementation
 * Implements IStorageService for MinIO object storage
 */
@Injectable()
export class MinioStorageService implements IStorageService {
    private readonly client: Minio.Client;
    private readonly bucket: string;
    private readonly logger = new Logger(MinioStorageService.name);

    constructor(private readonly configService: ConfigService) {
        this.client = new Minio.Client({
            endPoint: this.configService.get<string>('minio.endpoint') || 'localhost',
            port: this.configService.get<number>('minio.port') || 9000,
            useSSL: this.configService.get<boolean>('minio.useSSL') || false,
            accessKey: this.configService.get<string>('minio.accessKey') || '',
            secretKey: this.configService.get<string>('minio.secretKey') || '',
            region: this.configService.get<string>('minio.region') || 'us-east-1',
        });

        this.bucket = this.configService.get<string>('minio.bucket') || 'submissions';
        this.ensureBucket();
    }

    /**
     * Ensure the bucket exists, create if not
     */
    private async ensureBucket(): Promise<void> {
        try {
            const exists = await this.client.bucketExists(this.bucket);
            if (!exists) {
                await this.client.makeBucket(this.bucket);
                this.logger.log(`Bucket "${this.bucket}" created successfully`);
            }
        } catch (error) {
            this.logger.error(`Failed to ensure bucket: ${error.message}`);
        }
    }

    /**
     * Upload a file to MinIO
     */
    async uploadFile(file: Express.Multer.File, path: string): Promise<UploadResult> {
        const fileName = `${Date.now()}-${file.originalname}`;
        const fullPath = `${path}/${fileName}`;

        await this.client.putObject(
            this.bucket,
            fullPath,
            file.buffer,
            file.size,
            { 'Content-Type': file.mimetype },
        );

        this.logger.log(`File uploaded: ${fullPath}`);

        return {
            url: await this.getFileUrl(fullPath),
            path: fullPath,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
        };
    }

    /**
     * Delete a file from MinIO
     */
    async deleteFile(path: string): Promise<void> {
        await this.client.removeObject(this.bucket, path);
        this.logger.log(`File deleted: ${path}`);
    }

    /**
     * Get a presigned URL for file access
     * @param path - Storage path
     * @param expiresIn - Expiration time in seconds (default: 1 hour)
     */
    async getFileUrl(
        path: string,
        expiresIn: number = 3600,
        isDownload: boolean = false,
        fileName?: string
    ): Promise<string> {
        const reqParams: any = {};

        if (isDownload && fileName) {
            // encodeURIComponent เพื่อป้องกันปัญหาชื่อไฟล์ภาษาไทยหรืออักขระพิเศษ
            const encodedName = encodeURIComponent(fileName);

            /**
             * การตั้งค่า Content-Disposition:
             * filename= ใช้สำหรับ Browser รุ่นเก่า (อาจมีปัญหากับภาษาไทย)
             * filename*=UTF-8'' ใช้ตามมาตรฐาน RFC 5987 เพื่อรองรับภาษาไทย 100%
             */
            reqParams['response-content-disposition'] =
                `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`;
        } else if (isDownload) {
            reqParams['response-content-disposition'] = 'attachment';
        } else {
            reqParams['response-content-disposition'] = 'inline';
        }

        return this.client.presignedGetObject(this.bucket, path, expiresIn, reqParams);
    }
}

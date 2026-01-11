import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioStorageService } from '../services/minio-storage.service';
import { STORAGE_SERVICE } from '../interfaces/storage.interface';

/**
 * Storage Module
 * Provides storage service abstraction
 * Can easily swap MinioStorageService with S3/GCS implementations
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: STORAGE_SERVICE,
            useClass: MinioStorageService,
        },
    ],
    exports: [STORAGE_SERVICE],
})
export class StorageModule { }

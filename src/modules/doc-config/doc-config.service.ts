// src/modules/doc-config/doc-config.service.ts
import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocConfig } from './entities/doc-config.entity';
import { CreateDocConfigDto } from './dto/create-doc-config.dto';
import { UpdateDocConfigDto } from './dto/update-doc-config.dto';
import { RedisService } from '../../shared/services/redis.service';
import type { DocumentConfigData } from './interface/doc-config.interface';

const REDIS_KEY = 'doc-config';

@Injectable()
export class DocConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(DocConfig)
    private readonly docConfigRepository: Repository<DocConfig>,
    private readonly redisService: RedisService,
  ) { }

  // Sync config to Redis on startup
  async onModuleInit() {
    await this.syncToRedis();
  }

  // Sync the single config to Redis
  private async syncToRedis(): Promise<void> {
    const config = await this.docConfigRepository.findOne({ where: {} });
    if (config) {
      await this.redisService.setPermanent(REDIS_KEY, JSON.stringify(config.config));
      console.log('[DocConfig] Synced config to Redis');
    }
  }

  // Get config from Redis (fast path)
  async getFromRedis(): Promise<DocumentConfigData | null> {
    const cached = await this.redisService.get(REDIS_KEY);
    if (cached) {
      return JSON.parse(cached) as DocumentConfigData;
    }
    return null;
  }

  // Get the single config
  async get(): Promise<DocumentConfigData> {
    // Try Redis first (fast path)
    const cached = await this.getFromRedis();
    if (cached) {
      return cached;
    }

    // Fallback to database
    const docConfig = await this.docConfigRepository.findOne({ where: {} });
    if (!docConfig) {
      throw new NotFoundException('Document config not initialized');
    }

    // Sync to Redis
    await this.syncToRedis();

    return docConfig.config;
  }

  // Create or update the single config (upsert)
  async set(configData: CreateDocConfigDto): Promise<DocumentConfigData> {
    let docConfig = await this.docConfigRepository.findOne({ where: {} });

    if (docConfig) {
      // Update existing
      docConfig.config = configData as DocumentConfigData;
    } else {
      // Create new
      docConfig = this.docConfigRepository.create({
        config: configData as DocumentConfigData,
      });
    }

    const saved = await this.docConfigRepository.save(docConfig);

    // Sync to Redis
    await this.redisService.setPermanent(REDIS_KEY, JSON.stringify(saved.config));

    return saved.config;
  }

  // Partial update
  async update(updateData: UpdateDocConfigDto): Promise<DocumentConfigData> {
    const docConfig = await this.docConfigRepository.findOne({ where: {} });

    if (!docConfig) {
      throw new NotFoundException('Document config not initialized. Use PUT to create first.');
    }

    // Deep merge the update
    const merged = this.deepMerge(docConfig.config, updateData);
    docConfig.config = merged;

    const saved = await this.docConfigRepository.save(docConfig);

    // Sync to Redis
    await this.redisService.setPermanent(REDIS_KEY, JSON.stringify(saved.config));

    return saved.config;
  }

  // Deep merge helper
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] !== undefined) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  }
}

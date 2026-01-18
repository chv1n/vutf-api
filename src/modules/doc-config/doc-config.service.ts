// src/modules/doc-config/doc-config.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocConfig } from './entities/doc-config.entity';
import { CreateDocConfigDto } from './dto/create-doc-config.dto';
import { UpdateDocConfigDto } from './dto/update-doc-config.dto';

@Injectable()
export class DocConfigService {
  constructor(
    @InjectRepository(DocConfig)
    private readonly docConfigRepository: Repository<DocConfig>,
  ) { }

  async create(createDocConfigDto: CreateDocConfigDto): Promise<DocConfig> {
    // Check if name already exists
    const existing = await this.docConfigRepository.findOne({
      where: { name: createDocConfigDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Config with name "${createDocConfigDto.name}" already exists`,
      );
    }

    const docConfig = this.docConfigRepository.create(createDocConfigDto);
    return this.docConfigRepository.save(docConfig);
  }

  async findAll(): Promise<DocConfig[]> {
    return this.docConfigRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<DocConfig> {
    const docConfig = await this.docConfigRepository.findOne({
      where: { id },
    });

    if (!docConfig) {
      throw new NotFoundException(`DocConfig with ID "${id}" not found`);
    }

    return docConfig;
  }

  async findByName(name: string): Promise<DocConfig> {
    const docConfig = await this.docConfigRepository.findOne({
      where: { name },
    });

    if (!docConfig) {
      throw new NotFoundException(`DocConfig with name "${name}" not found`);
    }

    return docConfig;
  }

  async findActive(): Promise<DocConfig[]> {
    return this.docConfigRepository.find({
      where: { is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  async update(
    id: string,
    updateDocConfigDto: UpdateDocConfigDto,
  ): Promise<DocConfig> {
    const docConfig = await this.findOne(id);

    // Check if new name conflicts with existing
    if (
      updateDocConfigDto.name &&
      updateDocConfigDto.name !== docConfig.name
    ) {
      const existing = await this.docConfigRepository.findOne({
        where: { name: updateDocConfigDto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Config with name "${updateDocConfigDto.name}" already exists`,
        );
      }
    }

    Object.assign(docConfig, updateDocConfigDto);
    return this.docConfigRepository.save(docConfig);
  }

  async remove(id: string): Promise<void> {
    const docConfig = await this.findOne(id);
    await this.docConfigRepository.remove(docConfig);
  }
}

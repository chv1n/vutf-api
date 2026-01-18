// src/modules/doc-config/doc-config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocConfigService } from './doc-config.service';
import { DocConfigController } from './doc-config.controller';
import { DocConfig } from './entities/doc-config.entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocConfig]), SharedModule],
  controllers: [DocConfigController],
  providers: [DocConfigService],
  exports: [DocConfigService],
})
export class DocConfigModule { }

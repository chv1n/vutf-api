// src/modules/doc-config/doc-config.controller.ts
import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
} from '@nestjs/common';
import { DocConfigService } from './doc-config.service';
import { CreateDocConfigDto } from './dto/create-doc-config.dto';
import { UpdateDocConfigDto } from './dto/update-doc-config.dto';

@Controller('doc-config')
export class DocConfigController {
  constructor(private readonly docConfigService: DocConfigService) { }

  // GET /doc-config - Get the single config
  @Get()
  get() {
    return this.docConfigService.get();
  }

  // PUT /doc-config - Set/replace the entire config
  @Put()
  set(@Body() configData: CreateDocConfigDto) {
    return this.docConfigService.set(configData);
  }

  // PATCH /doc-config - Partial update
  @Patch()
  update(@Body() updateData: UpdateDocConfigDto) {
    return this.docConfigService.update(updateData);
  }
}

// src/modules/doc-config/doc-config.controller.ts
import {
  Controller,
  UseGuards,
  Get,
  Put,
  Patch,
  Body,
} from '@nestjs/common';
import { DocConfigService } from './doc-config.service';
import { CreateDocConfigDto } from './dto/create-doc-config.dto';
import { UpdateDocConfigDto } from './dto/update-doc-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('doc-config')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DocConfigController {
  constructor(private readonly docConfigService: DocConfigService) { }

  // GET /doc-config - Get the single config
  @Get()
  @RequirePermissions('manage:thesis_format')
  get() {
    return this.docConfigService.get();
  }

  // PUT /doc-config - Set/replace the entire config
  @Put()
  @RequirePermissions('manage:thesis_format')
  set(@Body() configData: CreateDocConfigDto) {
    return this.docConfigService.set(configData);
  }

  // PATCH /doc-config - Partial update
  @Patch()
  @RequirePermissions('manage:thesis_format')
  update(@Body() updateData: UpdateDocConfigDto) {
    return this.docConfigService.update(updateData);
  }
}

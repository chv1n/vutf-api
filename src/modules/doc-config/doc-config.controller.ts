// src/modules/doc-config/doc-config.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocConfigService } from './doc-config.service';
import { CreateDocConfigDto } from './dto/create-doc-config.dto';
import { UpdateDocConfigDto } from './dto/update-doc-config.dto';

@Controller('doc-config')
export class DocConfigController {
  constructor(private readonly docConfigService: DocConfigService) { }

  @Post()
  create(@Body() createDocConfigDto: CreateDocConfigDto) {
    return this.docConfigService.create(createDocConfigDto);
  }

  // @Get()
  // findAll() {
  //   return this.docConfigService.findAll();
  // }

  @Get('active')
  findActive() {
    return this.docConfigService.findActive();
  }

  // @Get('name/:name')
  // findByName(@Param('name') name: string) {
  //   return this.docConfigService.findByName(name);
  // }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.docConfigService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocConfigDto: UpdateDocConfigDto,
  ) {
    return this.docConfigService.update(id, updateDocConfigDto);
  }

  // @Delete(':id')
  // @HttpCode(HttpStatus.NO_CONTENT)
  // remove(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.docConfigService.remove(id);
  // }
}

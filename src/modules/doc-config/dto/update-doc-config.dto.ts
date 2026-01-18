// src/modules/doc-config/dto/update-doc-config.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDocConfigDto } from './create-doc-config.dto';

export class UpdateDocConfigDto extends PartialType(CreateDocConfigDto) { }

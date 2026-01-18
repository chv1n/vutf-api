// src/modules/doc-config/dto/create-doc-config.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsNumber,
    ValidateNested,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTOs for validation
export class MarginConfigDto {
    @IsNumber()
    @Min(0)
    top: number;

    @IsNumber()
    @Min(0)
    bottom: number;

    @IsNumber()
    @Min(0)
    left: number;

    @IsNumber()
    @Min(0)
    right: number;
}

export class FontConfigDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(1)
    size: number;

    @IsNumber()
    @Min(0)
    tolerance: number;
}

export class IndentRulesConfigDto {
    @IsNumber()
    @Min(0)
    paragraph: number;

    @IsNumber()
    @Min(0)
    sub_section_num: number;

    @IsNumber()
    @Min(0)
    sub_section_text_1: number;

    @IsNumber()
    @Min(0)
    sub_section_text_2: number;

    @IsNumber()
    @Min(0)
    bullet_point: number;

    @IsNumber()
    @Min(0)
    bullet_text: number;

    @IsNumber()
    @Min(0)
    tolerance: number;
}

export class DocumentConfigDataDto {
    @ValidateNested()
    @Type(() => MarginConfigDto)
    margin_mm: MarginConfigDto;

    @ValidateNested()
    @Type(() => FontConfigDto)
    font: FontConfigDto;

    @ValidateNested()
    @Type(() => IndentRulesConfigDto)
    indent_rules: IndentRulesConfigDto;
}

export class CreateDocConfigDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @ValidateNested()
    @Type(() => DocumentConfigDataDto)
    config: DocumentConfigDataDto;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

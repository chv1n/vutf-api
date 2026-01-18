// src/modules/doc-config/dto/update-doc-config.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsNumber,
    ValidateNested,
    Min,
    IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

// Partial nested DTOs for update
export class PartialMarginConfigDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    top?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    bottom?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    left?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    right?: number;
}

export class PartialFontConfigDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    size?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    tolerance?: number;
}

export class PartialIndentRulesConfigDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    paragraph?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sub_section_num?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sub_section_text_1?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sub_section_text_2?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    bullet_point?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    bullet_text?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    tolerance?: number;
}

export class UpdateDocConfigDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => PartialMarginConfigDto)
    margin_mm?: PartialMarginConfigDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => PartialFontConfigDto)
    font?: PartialFontConfigDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => PartialIndentRulesConfigDto)
    indent_rules?: PartialIndentRulesConfigDto;
}

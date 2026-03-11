// src/modules/doc-config/dto/update-doc-config.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsNumber,
    ValidateNested,
    Min,
    IsOptional,
    IsArray,
    IsBoolean,
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
    tolerance?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    main_heading_num?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    main_heading_text?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sub_heading_num?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sub_heading_text_1?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sub_heading_text_2?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    sub_heading_text_3?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    list_item_num?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    list_item_text_1?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    list_item_text_2?: number;

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
    para_indent?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    dash_indent?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    dash_text?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    para_min_detect?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    para_max_detect?: number;
}

export class PartialCheckListConfigDto {
    @IsOptional()
    @IsBoolean()
    check_margin?: boolean;

    @IsOptional()
    @IsBoolean()
    check_font?: boolean;

    @IsOptional()
    @IsBoolean()
    check_page_seq?: boolean;

    @IsOptional()
    @IsBoolean()
    check_section_seq?: boolean;

    @IsOptional()
    @IsBoolean()
    check_paper_size?: boolean;

    @IsOptional()
    @IsBoolean()
    check_spacing?: boolean;

    @IsOptional()
    @IsBoolean()
    check_indentation?: boolean;
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

    @IsOptional()
    @ValidateNested()
    @Type(() => PartialCheckListConfigDto)
    check_list?: PartialCheckListConfigDto;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    ignored_units?: string[];
}

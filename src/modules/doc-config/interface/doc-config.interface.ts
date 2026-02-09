// src/modules/doc-config/doc-config.types.ts

export interface MarginConfig {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface FontConfig {
    name: string;
    size: number;
    tolerance: number;
}

export interface IndentRulesConfig {
    paragraph: number;
    sub_section_num: number;
    sub_section_text_1: number;
    sub_section_text_2: number;
    bullet_point: number;
    bullet_text: number;
    tolerance: number;
}

export interface CheckListConfig {
    check_font: boolean;
    check_margin: boolean;
    check_section_seq: boolean;
    check_page_seq: boolean;
    check_indentation: boolean;
    check_spacing: boolean;
}

export interface DocumentConfigData {
    margin_mm: MarginConfig;
    font: FontConfig;
    indent_rules: IndentRulesConfig;
    check_list: CheckListConfig;
    ignored_units: string[];
}

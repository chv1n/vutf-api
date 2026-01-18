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

export interface DocumentConfigData {
    margin_mm: MarginConfig;
    font: FontConfig;
    indent_rules: IndentRulesConfig;
}

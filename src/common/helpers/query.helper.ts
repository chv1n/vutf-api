// src/common/helpers/query.helper.ts
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * Interface สำหรับ pagination options
 */
export interface PaginationOptions {
    page: number;
    limit: number;
}

/**
 * Interface สำหรับ sorting options
 */
export interface SortingOptions {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
    validFields: string[];
    defaultField: string;
    fieldMapping?: Record<string, string>; // สำหรับ map field ไปยัง alias อื่น เช่น { email: 'user.email' }
}

/**
 * Interface สำหรับ pagination metadata ใน response
 */
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

/**
 * Interface สำหรับ paginated response
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

/**
 * Query Helper Class
 * รวม utility functions สำหรับจัดการ pagination, sorting, และ response
 */
export class QueryHelper {
    /**
     * Apply pagination to query builder
     */
    static applyPagination<T extends ObjectLiteral>(
        queryBuilder: SelectQueryBuilder<T>,
        options: PaginationOptions,
    ): SelectQueryBuilder<T> {
        const { page, limit } = options;
        const skip = (page - 1) * limit;
        return queryBuilder.skip(skip).take(limit);
    }

    /**
     * Apply sorting to query builder
     */
    static applySorting<T extends ObjectLiteral>(
        queryBuilder: SelectQueryBuilder<T>,
        alias: string,
        options: SortingOptions,
    ): SelectQueryBuilder<T> {
        const { sortBy, sortOrder, validFields, defaultField, fieldMapping = {} } = options;

        const field = validFields.includes(sortBy) ? sortBy : defaultField;
        const order = sortOrder.toUpperCase() as 'ASC' | 'DESC';

        // ถ้ามี mapping ให้ใช้ mapping, ไม่งั้นใช้ alias.field
        const orderByField = fieldMapping[field] || `${alias}.${field}`;

        return queryBuilder.orderBy(orderByField, order);
    }

    /**
     * Apply search to query builder (ILIKE search)
     */
    static applySearch<T extends ObjectLiteral>(
        queryBuilder: SelectQueryBuilder<T>,
        search: string | undefined,
        searchFields: string[],
    ): SelectQueryBuilder<T> {
        if (!search || searchFields.length === 0) {
            return queryBuilder;
        }

        const conditions = searchFields.map((field) => `${field} ILIKE :search`).join(' OR ');
        return queryBuilder.andWhere(`(${conditions})`, { search: `%${search}%` });
    }

    /**
     * Create pagination metadata
     */
    static createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
        const totalPages = Math.ceil(total / limit);
        return {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };
    }

    /**
     * Create paginated response
     */
    static createPaginatedResponse<T>(
        data: T[],
        total: number,
        page: number,
        limit: number,
    ): PaginatedResponse<T> {
        return {
            data,
            meta: this.createPaginationMeta(total, page, limit),
        };
    }
}

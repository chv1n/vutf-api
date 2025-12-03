// src/database/migrations/CreateInspectionRoundTable.ts
import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateInspectionRoundTable1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "inspection_rounds",
                columns: [
                    {
                        name: "inspection_id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "title",
                        type: "varchar",
                        length: "255",
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "start_date",
                        type: "timestamp",
                    },
                    {
                        name: "end_date",
                        type: "timestamp",
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "50",
                        default: "'OPEN'",
                    },
                    {
                        name: "create_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("inspection_rounds");
    }
}
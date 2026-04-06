import { MigrationInterface, QueryRunner } from "typeorm";

export class 64261775487670518 implements MigrationInterface {
    name = '64261775487670518'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "report_file" ADD "started_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "started_at"`);
    }

}

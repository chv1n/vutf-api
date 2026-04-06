import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateReportFile1775488380387 implements MigrationInterface {
    name = 'UpdateReportFile1775488380387'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "report_file" ADD "started_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "started_at"`);
    }

}

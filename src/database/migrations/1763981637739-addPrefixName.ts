import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrefixName1763981637739 implements MigrationInterface {
    name = 'AddPrefixName1763981637739'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "student" ADD "prefix_name" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "student" DROP COLUMN "prefix_name"`);
    }

}

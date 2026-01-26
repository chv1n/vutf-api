import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDocCinfig1768723183775 implements MigrationInterface {
    name = 'CreateDocCinfig1768723183775'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "document_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "config" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4879a8181d866e0edb964ad1204" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "document_configs"`);
    }

}

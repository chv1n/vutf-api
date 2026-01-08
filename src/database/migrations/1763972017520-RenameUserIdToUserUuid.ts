import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameUserIdToUserUuid1763972017520 implements MigrationInterface {
    name = 'RenameUserIdToUserUuid1763972017520'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "student" DROP CONSTRAINT "FK_0cc43638ebcf41dfab27e62dc09"`);
        await queryRunner.query(`ALTER TABLE "instructor" DROP CONSTRAINT "FK_017e5f8348ae0b4f877c6339dff"`);
        await queryRunner.query(`ALTER TABLE "student" RENAME COLUMN "user_id" TO "user_uuid"`);
        await queryRunner.query(`ALTER TABLE "instructor" RENAME COLUMN "user_id" TO "user_uuid"`);
        await queryRunner.query(`ALTER TABLE "user_account" RENAME COLUMN "user_id" TO "user_uuid"`);
        await queryRunner.query(`ALTER TABLE "user_account" RENAME CONSTRAINT "PK_1e7af5387f4169347ddef6e8180" TO "PK_0d001657ff54291c3f9ebc1eb01"`);
        await queryRunner.query(`ALTER TABLE "student" ADD CONSTRAINT "FK_a6519e3d91413b2842bd8cd5ee0" FOREIGN KEY ("user_uuid") REFERENCES "user_account"("user_uuid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "instructor" ADD CONSTRAINT "FK_e3d094a71736ab7bd6facfba4c7" FOREIGN KEY ("user_uuid") REFERENCES "user_account"("user_uuid") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "instructor" DROP CONSTRAINT "FK_e3d094a71736ab7bd6facfba4c7"`);
        await queryRunner.query(`ALTER TABLE "student" DROP CONSTRAINT "FK_a6519e3d91413b2842bd8cd5ee0"`);
        await queryRunner.query(`ALTER TABLE "user_account" RENAME CONSTRAINT "PK_0d001657ff54291c3f9ebc1eb01" TO "PK_1e7af5387f4169347ddef6e8180"`);
        await queryRunner.query(`ALTER TABLE "user_account" RENAME COLUMN "user_uuid" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "instructor" RENAME COLUMN "user_uuid" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "student" RENAME COLUMN "user_uuid" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "instructor" ADD CONSTRAINT "FK_017e5f8348ae0b4f877c6339dff" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "student" ADD CONSTRAINT "FK_0cc43638ebcf41dfab27e62dc09" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}

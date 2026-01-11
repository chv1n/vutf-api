import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubmissionFields1767880599988 implements MigrationInterface {
    name = 'AddSubmissionFields1767880599988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "submissions" ADD "file_size" integer`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD "mime_type" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD "storage_path" character varying`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD "verified_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TYPE "public"."submissions_status_enum" RENAME TO "submissions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."submissions_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" TYPE "public"."submissions_status_enum" USING "status"::"text"::"public"."submissions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."submissions_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."submissions_status_enum_old" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" TYPE "public"."submissions_status_enum_old" USING "status"::"text"::"public"."submissions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."submissions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."submissions_status_enum_old" RENAME TO "submissions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "verified_at"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "storage_path"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "mime_type"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "file_size"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772794869115 implements MigrationInterface {
    name = 'Migration1772794869115'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "thesis" RENAME COLUMN "file_url" TO "approved_submission_id"`);
        await queryRunner.query(`CREATE TYPE "public"."thesis_documents_document_type_enum" AS ENUM('PDF', 'WORD', 'CODE', 'POSTER', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."thesis_documents_course_type_enum" AS ENUM('PRE_PROJECT', 'PROJECT', 'ALL')`);
        await queryRunner.query(`CREATE TABLE "thesis_documents" ("id" SERIAL NOT NULL, "document_type" "public"."thesis_documents_document_type_enum" NOT NULL DEFAULT 'PDF', "course_type" "public"."thesis_documents_course_type_enum" NOT NULL DEFAULT 'PRE_PROJECT', "file_url" text NOT NULL, "file_name" character varying(255) NOT NULL, "file_size" integer, "mime_type" character varying(100), "storage_path" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "thesis_id" uuid, CONSTRAINT "PK_042ca04212b2c2ba19a44dbcec3" PRIMARY KEY ("id")); COMMENT ON COLUMN "thesis_documents"."file_size" IS 'Size in bytes'`);
        await queryRunner.query(`CREATE TABLE "permissions" ("permissions_id" SERIAL NOT NULL, "action" character varying(100) NOT NULL, "resource" character varying(100) NOT NULL, CONSTRAINT "PK_8374d09e3f982a75565cd55111e" PRIMARY KEY ("permissions_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('submission_status', 'group_invite', 'new_comment', 'system_announce', 'group_status')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text, "data" jsonb, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("log_id" SERIAL NOT NULL, "action" character varying NOT NULL, "description" text, "target_type" character varying, "target_id" character varying, "ip_address" character varying, "time_stamp" TIMESTAMP NOT NULL DEFAULT now(), "user_uuid" uuid, CONSTRAINT "PK_cf5aa90f5cf01b22aacd6d5a997" PRIMARY KEY ("log_id"))`);
        await queryRunner.query(`CREATE TABLE "user_permissions" ("user_id" uuid NOT NULL, "permissions_id" integer NOT NULL, CONSTRAINT "PK_f392943998b55e65fef7297a578" PRIMARY KEY ("user_id", "permissions_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3495bd31f1862d02931e8e8d2e" ON "user_permissions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bead51779ff0427fd83ad672ef" ON "user_permissions" ("permissions_id") `);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "attempt_number" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "csv_url" text`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "file_size" integer`);
        await queryRunner.query(`CREATE TYPE "public"."report_file_verification_status_enum" AS ENUM('PASS', 'FAIL', 'ERROR')`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "verification_status" "public"."report_file_verification_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."report_file_review_status_enum" AS ENUM('PENDING', 'NEEDS_REVISION', 'PASSED', 'NOT_PASSED')`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "review_status" "public"."report_file_review_status_enum" NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "comment_by"`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "comment_by" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."submissions_status_enum" RENAME TO "submissions_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."submissions_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" TYPE "public"."submissions_status_enum" USING "status"::"text"::"public"."submissions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."submissions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "thesis" DROP COLUMN "approved_submission_id"`);
        await queryRunner.query(`ALTER TABLE "thesis" ADD "approved_submission_id" integer`);
        await queryRunner.query(`ALTER TABLE "thesis" ADD CONSTRAINT "UQ_387b248da7bc1e75062f49c948e" UNIQUE ("approved_submission_id")`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD CONSTRAINT "FK_aba946656673e66db2807dfbf22" FOREIGN KEY ("comment_by") REFERENCES "user_account"("user_uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "thesis_documents" ADD CONSTRAINT "FK_816241e7d904bf14c4d7cb46ad7" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("thesis_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "thesis" ADD CONSTRAINT "FK_387b248da7bc1e75062f49c948e" FOREIGN KEY ("approved_submission_id") REFERENCES "submissions"("submission_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_uuid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_4c676c03c3b699e7ad045d2e2fd" FOREIGN KEY ("user_uuid") REFERENCES "user_account"("user_uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_uuid") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_bead51779ff0427fd83ad672ef9" FOREIGN KEY ("permissions_id") REFERENCES "permissions"("permissions_id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_bead51779ff0427fd83ad672ef9"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_4c676c03c3b699e7ad045d2e2fd"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "thesis" DROP CONSTRAINT "FK_387b248da7bc1e75062f49c948e"`);
        await queryRunner.query(`ALTER TABLE "thesis_documents" DROP CONSTRAINT "FK_816241e7d904bf14c4d7cb46ad7"`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP CONSTRAINT "FK_aba946656673e66db2807dfbf22"`);
        await queryRunner.query(`ALTER TABLE "thesis" DROP CONSTRAINT "UQ_387b248da7bc1e75062f49c948e"`);
        await queryRunner.query(`ALTER TABLE "thesis" DROP COLUMN "approved_submission_id"`);
        await queryRunner.query(`ALTER TABLE "thesis" ADD "approved_submission_id" text`);
        await queryRunner.query(`CREATE TYPE "public"."submissions_status_enum_old" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" TYPE "public"."submissions_status_enum_old" USING "status"::"text"::"public"."submissions_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."submissions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."submissions_status_enum_old" RENAME TO "submissions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "comment_by"`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "comment_by" integer`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "review_status"`);
        await queryRunner.query(`DROP TYPE "public"."report_file_review_status_enum"`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "verification_status"`);
        await queryRunner.query(`DROP TYPE "public"."report_file_verification_status_enum"`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "file_size"`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "csv_url"`);
        await queryRunner.query(`ALTER TABLE "report_file" DROP COLUMN "attempt_number"`);
        await queryRunner.query(`ALTER TABLE "report_file" ADD "status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bead51779ff0427fd83ad672ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3495bd31f1862d02931e8e8d2e"`);
        await queryRunner.query(`DROP TABLE "user_permissions"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
        await queryRunner.query(`DROP TABLE "thesis_documents"`);
        await queryRunner.query(`DROP TYPE "public"."thesis_documents_course_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."thesis_documents_document_type_enum"`);
        await queryRunner.query(`ALTER TABLE "thesis" RENAME COLUMN "approved_submission_id" TO "file_url"`);
    }

}

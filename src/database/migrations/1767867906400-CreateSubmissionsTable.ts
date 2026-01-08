import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSubmissionsTable1767867906400 implements MigrationInterface {
    name = 'CreateSubmissionsTable1767867906400'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."submissions_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "submissions" ("submission_id" SERIAL NOT NULL, "file_url" character varying, "file_name" character varying, "submitted_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."submissions_status_enum" NOT NULL DEFAULT 'PENDING', "comment" text, "thesis_id" uuid, "group_id" uuid, "submitter_id" uuid, "reviewer_id" uuid, "inspection_id" integer, CONSTRAINT "PK_9d2b514f747142635edb10c1d3d" PRIMARY KEY ("submission_id"))`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_fa11067b76b4b73a645baeed526" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("thesis_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_ccc4689abbe8819db8686ae84e5" FOREIGN KEY ("group_id") REFERENCES "thesis_group"("group_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_80bb6c5051423ca3e6c5bbbdbe2" FOREIGN KEY ("submitter_id") REFERENCES "user_account"("user_uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_ae8e0d48e6b46412a8f430752f4" FOREIGN KEY ("reviewer_id") REFERENCES "user_account"("user_uuid") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_60b56d52a05881b8b92aeb67653" FOREIGN KEY ("inspection_id") REFERENCES "inspection_rounds"("inspection_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_60b56d52a05881b8b92aeb67653"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_ae8e0d48e6b46412a8f430752f4"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_80bb6c5051423ca3e6c5bbbdbe2"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_ccc4689abbe8819db8686ae84e5"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_fa11067b76b4b73a645baeed526"`);
        await queryRunner.query(`DROP TABLE "submissions"`);
        await queryRunner.query(`DROP TYPE "public"."submissions_status_enum"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class StuCreateGroup1766387518129 implements MigrationInterface {
    name = 'StuCreateGroup1766387518129'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "thesis" ("thesis_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "thesis_code" character varying NOT NULL, "thesis_name_th" character varying NOT NULL, "thesis_name_en" character varying NOT NULL, "graduation_year" integer NOT NULL, "file_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bb03287eadcc6bfd1ce2eb20675" UNIQUE ("thesis_code"), CONSTRAINT "PK_652c483efa1f86c1aeece1e9a45" PRIMARY KEY ("thesis_id"))`);
        await queryRunner.query(`CREATE TABLE "group_members" ("member_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "student_id" character varying NOT NULL, "role" character varying NOT NULL, "invitation_status" character varying NOT NULL DEFAULT 'pending', "invited_at" TIMESTAMP NOT NULL DEFAULT now(), "approved_at" TIMESTAMP, "group_id" uuid, CONSTRAINT "PK_dd36c2f163638fffa2edd4e44f2" PRIMARY KEY ("member_id"))`);
        await queryRunner.query(`CREATE TABLE "thesis_group" ("group_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_by" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "thesis_id" uuid, CONSTRAINT "REL_23762b99928d0a121793981f83" UNIQUE ("thesis_id"), CONSTRAINT "PK_2f59cc07f44987815792ba1284a" PRIMARY KEY ("group_id"))`);
        await queryRunner.query(`CREATE TABLE "announcements" ("announce_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text NOT NULL, "img_base64" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f6416874ae9c28daab5e1ec49a1" PRIMARY KEY ("announce_id"))`);
        await queryRunner.query(`CREATE TABLE "advisor_assignment" ("advisor_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "instructor_id" character varying NOT NULL, "role" character varying NOT NULL, "assigned_at" TIMESTAMP NOT NULL DEFAULT now(), "thesis_id" uuid, CONSTRAINT "PK_026ecfe874d7b32d48cb375b218" PRIMARY KEY ("advisor_id"))`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e" FOREIGN KEY ("group_id") REFERENCES "thesis_group"("group_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "thesis_group" ADD CONSTRAINT "FK_23762b99928d0a121793981f832" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("thesis_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "advisor_assignment" ADD CONSTRAINT "FK_3fbd7b0f837004805a72584aaa5" FOREIGN KEY ("thesis_id") REFERENCES "thesis"("thesis_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "advisor_assignment" DROP CONSTRAINT "FK_3fbd7b0f837004805a72584aaa5"`);
        await queryRunner.query(`ALTER TABLE "thesis_group" DROP CONSTRAINT "FK_23762b99928d0a121793981f832"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e"`);
        await queryRunner.query(`DROP TABLE "advisor_assignment"`);
        await queryRunner.query(`DROP TABLE "announcements"`);
        await queryRunner.query(`DROP TABLE "thesis_group"`);
        await queryRunner.query(`DROP TABLE "group_members"`);
        await queryRunner.query(`DROP TABLE "thesis"`);
    }

}

// src/modules/thesis-group/thesis-group.service.ts
import { NotFoundException, Injectable, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateThesisGroupDto } from './dto/create-thesis-group.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ThesisGroup, ThesisGroupStatus } from './entities/thesis-group.entity';
import { EntityManager, Repository, IsNull, Not } from 'typeorm';
import { DataSource } from 'typeorm';
import { GroupMemberService } from '../group-member/group-member.service';
import { AdvisorAssignmentService } from '../advisor-assignment/advisor-assignment.service';
import { ThesisService } from '../thesis/thesis.service';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisStatus } from '../thesis/enums/course-type.enum';
import { CreateGroupMemberDto } from '../group-member/dto/create-group-member.dto';
import { UsersService } from '../users/users.service';
import { GroupMemberRole } from '../group-member/enum/group-member-role.enum';
import { InvitationStatus } from '../group-member/enum/invitation-status.enum';
import { UpdateThesisDto } from '../thesis/dto/update-thesis.dto';

@Injectable()
export class ThesisGroupService {
  constructor(
    @InjectRepository(ThesisGroup)
    private thesisGroupRepository: Repository<ThesisGroup>,
    private dataSource: DataSource,
    private groupMemberService: GroupMemberService,
    private advisorService: AdvisorAssignmentService,
    private thesisService: ThesisService,
    private usersService: UsersService,
  ) { }

  async createFullThesis(dto: CreateThesisGroupDto, userId: string) {

    await this.validateStudentCanCreateGroup(userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const thesis = await this.thesisService.createThesis(manager, dto.thesis);

      const group = await this.createThesisGroup(manager, thesis, userId);
      const memberRoleOwnerAdded = await this.findOwnerAndAddMembers(
        dto.group_member,
        userId,
      );

      const groupMember = await this.groupMemberService.createGroupMember(
        manager,
        group.group_id,
        memberRoleOwnerAdded,
      );

      await this.groupMemberService.updateGroupStatus(group.group_id, manager);

      const advisor = await this.advisorService.createAdvisor(
        manager,
        group.group_id,
        dto.advisor,
      );

      await queryRunner.commitTransaction();
      return { message: 'Success' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleDatabaseError(err);
    } finally {
      await queryRunner.release();
    }
  }

  // ============ Validation Methods ============

  /**
   * ตรวจสอบว่านักศึกษาสามารถสร้างกลุ่มใหม่ได้หรือไม่
   * เงื่อนไข: ต้องไม่มีกลุ่มที่สถานะวิทยานิพนธ์ไม่ใช่ FAILED และยังไม่ถูกลบ (Soft Delete)
   */
  private async validateStudentCanCreateGroup(userId: string): Promise<void> {
    // ดึงข้อมูล User เพื่อหา student_uuid
    const user = await this.usersService.findById(userId);
    if (!user || !user.student) {
      throw new NotFoundException('ไม่พบข้อมูลนักศึกษา');
    }

    const studentUuid = user.student.student_uuid;

    // ค้นหากลุ่มที่นักศึกษาคนนี้เป็นสมาชิก (Active Group)
    // เงื่อนไขกลุ่มที่ถือว่า "มีอยู่แล้ว":
    // 1. นักศึกษาเป็นสมาชิกในกลุ่มนั้น (ทุก Role) และสมาชิกภาพยังไม่ถูกลบ
    // 2. วิทยานิพนธ์ในกลุ่มนั้นยังไม่ถูกลบ (delete_at IS NULL)
    // 3. สถานะวิทยานิพนธ์ไม่ใช่ FAILED
    const existingActiveGroup = await this.thesisGroupRepository.findOne({
      where: {
        members: {
          student_uuid: studentUuid,
          deleted_at: IsNull(),
          invitation_status: InvitationStatus.APPROVED,
        },
        thesis: {
          delete_at: IsNull(),
          status: Not(ThesisStatus.FAILED),
        },
      },
      relations: ['thesis', 'members'],
    });

    if (existingActiveGroup) {
      const memberInfo = existingActiveGroup.members.find(m => m.student_uuid === studentUuid);
      const statusMsg = memberInfo?.invitation_status === InvitationStatus.PENDING 
        ? 'กำลังรอการตอบรับ' 
        : 'เป็นสมาชิกอยู่';

      throw new ConflictException(
        `คุณมีกลุ่มโครงงาน "${existingActiveGroup.thesis.thesis_name_th}" ที่${statusMsg} ไม่สามารถสร้างกลุ่มใหม่ได้`,
      );
    }
  }

  private handleDatabaseError(err: any): never {
    // PostgreSQL error codes
    const PG_UNIQUE_VIOLATION = '23505';
    const PG_FOREIGN_KEY_VIOLATION = '23503';

    if (err.code === PG_UNIQUE_VIOLATION) {
      const detail = err.detail || '';
      // Extract field name from detail like "Key (thesis_code)=(THS2024001) already exists."
      const match = detail.match(/Key \((\w+)\)=\((.+?)\)/);
      if (match) {
        const [, field, value] = match;
        throw new ConflictException(
          `${this.formatFieldName(field)} "${value}" already exists`,
        );
      }
      throw new ConflictException('Duplicate value already exists');
    }

    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      const detail = err.detail || '';
      const match = detail.match(/Key \((\w+)\)=\((.+?)\)/);
      if (match) {
        const [, field, value] = match;
        throw new BadRequestException(
          `${this.formatFieldName(field)} "${value}" not found`,
        );
      }
      throw new BadRequestException('Referenced record not found');
    }

    throw err;
  }

  private formatFieldName(field: string): string {
    // Convert snake_case to Title Case
    return field
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async createThesisGroup(
    manager: EntityManager,
    thesis: Thesis,
    userId: string,
  ): Promise<ThesisGroup> {
    const group = manager.create(ThesisGroup, {
      created_by: { user_uuid: userId },
      thesis: thesis,
      status: ThesisGroupStatus.INCOMPLETE,
    });
    const savedThesisGroup = await manager.save(group);
    return savedThesisGroup;
  }

  private async findOwnerAndAddMembers(
    group_member: CreateGroupMemberDto[],
    userId: string,
  ): Promise<CreateGroupMemberDto[]> {
    const ownerStudent = await this.usersService.findById(userId);
    if (!ownerStudent) throw new NotFoundException(`Owner id not found`);
    const ownerMember = {
      student_uuid: ownerStudent.student.student_uuid,
      role: GroupMemberRole.OWNER,
      invitation_status: InvitationStatus.APPROVED,
      approved_at: new Date(),
    };
    const addedOwner = [ownerMember, ...group_member];
    return addedOwner;
  }

  // ============ Thesis Info Update ============

  async updateThesisInfo(
    userId: string,
    groupId: string,
    dto: UpdateThesisDto,
  ): Promise<{ message: string }> {
    // ตรวจสอบสิทธิ์ความเป็นเจ้าของกลุ่ม
    await this.groupMemberService.validateIsOwner(userId, groupId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // ดึงข้อมูลกลุ่มพร้อมข้อมูลวิทยานิพนธ์
      const group = await manager.findOne(ThesisGroup, {
        where: { group_id: groupId },
        relations: ['thesis'],
      });

      if (!group || !group.thesis) {
        throw new NotFoundException('Group or thesis not found');
      }

      // อัปเดตข้อมูลรายละเอียดวิทยานิพนธ์
      Object.assign(group.thesis, dto);
      await manager.save(group.thesis);

      // บังคับล้างสถานะการปฏิเสธ และตั้งสถานะกลุ่มเป็น PENDING เพื่อรออนุมัติใหม่
      await manager.getRepository(ThesisGroup).update(groupId, {
        status: ThesisGroupStatus.PENDING,
        rejection_reason: null,
        approved_at: null,
      });

      // ตรวจสอบสถานะสมาชิกอีกครั้งเพื่อให้มั่นใจว่าสถานะกลุ่มถูกต้องตามเงื่อนไข
      await this.groupMemberService.updateGroupStatus(groupId, manager);

      await queryRunner.commitTransaction();
      return { message: 'Thesis updated and resubmitted for approval successfully' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getThesisGroupById(groupId: string): Promise<ThesisGroup> {
    const group = await this.thesisGroupRepository.findOne({
      where: { group_id: groupId },
      relations: {
        thesis: true,
        members: {
          student: true,
        },
        advisor: {
          instructor: true,
        },
        created_by: {
          student: true,
        },
      },
      select: {
        group_id: true,
        status: true,
        created_at: true,
        rejection_reason: true,
        thesis: {
          thesis_id: true,
          thesis_code: true,
          thesis_name_th: true,
          thesis_name_en: true,
          graduation_year: true,
          course_type: true,
          start_academic_year: true,
          start_term: true,
        },
        members: {
          member_id: true,
          student_uuid: true,
          role: true,
          invitation_status: true,
          student: {
            student_uuid: true,
            student_code: true,
            prefix_name: true,
            first_name: true,
            last_name: true,
          },
        },
        advisor: {
          advisor_id: true,
          role: true,
          instructor: {
            instructor_uuid: true,
            instructor_code: true,
            first_name: true,
            last_name: true,
          },
        },
        created_by: {
          user_uuid: true,
          student: {
            prefix_name: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Thesis group not found');
    }

    return group;
  }

}

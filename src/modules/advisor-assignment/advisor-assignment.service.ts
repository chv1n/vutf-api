// src/modules/advisor-assignment/advisor-assignment.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, InsertResult, IsNull, In, Not } from 'typeorm';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { AddAdvisorDto } from './dto/add-advisor.dto';
import { UpdateAdvisorDto } from './dto/update-advisor.dto';
import { AdvisorAssignment } from './entities/advisor-assignment.entity';
import { AdvisorRole } from './enum/advisor-role.enum';
import { GroupMember } from '../group-member/entities/group-member.entity';
import { GroupMemberRole } from '../group-member/enum/group-member-role.enum';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { GroupMemberService } from '../group-member/group-member.service';
import { UsersService } from '../users/users.service';
import { InspectionRound } from '../inspection_round/entities/inspection_round.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { CourseType } from '../inspection_round/entities/inspection_round.entity';


import type { IStorageService } from '../../common/interfaces/storage.interface';
import { STORAGE_SERVICE } from '../../common/interfaces/storage.interface';

@Injectable()
export class AdvisorAssignmentService {
  private readonly logger = new Logger(AdvisorAssignmentService.name);
  constructor(
    @InjectRepository(AdvisorAssignment)
    private readonly advisorRepo: Repository<AdvisorAssignment>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    @InjectRepository(ThesisGroup)
    private readonly thesisGroupRepo: Repository<ThesisGroup>,
    @InjectRepository(InspectionRound)
    private readonly inspectionRoundRepository: Repository<InspectionRound>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,

    private readonly groupMemberService: GroupMemberService,
    private readonly usersService: UsersService,

    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) { }

  // ============ Transaction-based method (used in createFullThesis) ============
  async createAdvisor(
    manager: EntityManager,
    group_id: string,
    advisors: CreateAdvisorDto[],
  ): Promise<InsertResult> {
    // Validate main advisor limit
    await this.validateMainAdvisorLimitBulk(advisors);

    const members = advisors.map((m) => ({
      ...m,
      group_id: group_id,
    }));
    return await manager.insert(AdvisorAssignment, members);
  }

  // ============ Standalone CRUD methods ============

  async addAdvisor(
    userId: string,
    groupId: string,
    dto: AddAdvisorDto,
  ): Promise<AdvisorAssignment> {
    // Validate owner permission
    await this.validateIsOwner(userId, groupId);

    // Validate main advisor limit
    if (dto.role === AdvisorRole.MAIN) {
      await this.validateMainAdvisorLimit(groupId);
    }

    // Check if instructor already assigned
    const existing = await this.advisorRepo.findOne({
      where: {
        group_id: groupId,
        instructor_uuid: dto.instructor_uuid,
        deleted_at: IsNull(),
      },
    });

    if (existing) {
      throw new BadRequestException('Instructor already assigned to this group');
    }

    const advisor = this.advisorRepo.create({
      ...dto,
      group_id: groupId,
    });

    const savedAdvisor = await this.advisorRepo.save(advisor);

    // ล้างเหตุผลการปฏิเสธและอัปเดตสถานะกลุ่ม
    await this.clearRejectionAndUpdateStatus(groupId);

    return savedAdvisor;
  }

  async updateAdvisor(
    userId: string,
    groupId: string,
    advisorId: string,
    dto: UpdateAdvisorDto,
  ): Promise<AdvisorAssignment> {
    // Validate owner permission
    await this.validateIsOwner(userId, groupId);

    const advisor = await this.advisorRepo.findOne({
      where: {
        advisor_id: advisorId,
        group_id: groupId,
        deleted_at: IsNull(),
      },
    });

    if (!advisor) {
      throw new NotFoundException('Advisor not found');
    }

    // Validate main advisor limit if changing to main
    if (dto.role === AdvisorRole.MAIN && advisor.role !== AdvisorRole.MAIN) {
      await this.validateMainAdvisorLimit(groupId);
    }

    Object.assign(advisor, dto);
    const updatedAdvisor = await this.advisorRepo.save(advisor);

    // ล้างเหตุผลการปฏิเสธและอัปเดตสถานะกลุ่ม
    await this.clearRejectionAndUpdateStatus(groupId);

    return updatedAdvisor;
  }

  async removeAdvisor(
    userId: string,
    groupId: string,
    advisorId: string,
  ): Promise<{ message: string }> {
    // Validate owner permission
    await this.validateIsOwner(userId, groupId);

    const advisor = await this.advisorRepo.findOne({
      where: {
        advisor_id: advisorId,
        group_id: groupId,
        deleted_at: IsNull(),
      },
    });

    if (!advisor) {
      throw new NotFoundException('Advisor not found');
    }

    // Soft delete
    await this.advisorRepo.softRemove(advisor);

    // ล้างเหตุผลการปฏิเสธและอัปเดตสถานะกลุ่ม
    await this.clearRejectionAndUpdateStatus(groupId);

    return { message: 'Advisor removed successfully' };
  }

  // ============ Helper methods for Rejection & Status ============

  /**
   * ล้าง rejection_reason และอัปเดตสถานะกลุ่มกลับเป็น Pending/Incomplete
   */
  private async clearRejectionAndUpdateStatus(groupId: string): Promise<void> {
    // 1. ล้างเหตุผลการปฏิเสธ และล้างวันที่อนุมัติเก่า (ถ้ามี)
    await this.thesisGroupRepo.update(groupId, {
      rejection_reason: null,
      approved_at: null,
    });

    // 2. เรียกฟังก์ชันตรวจสอบสมาชิกเพื่อเปลี่ยนสถานะกลุ่มโดยอัตโนมัติ
    await this.groupMemberService.updateGroupStatus(groupId);
  }

  // ============ Validation methods ============

  async validateMainAdvisorLimit(groupId: string): Promise<void> {
    const mainCount = await this.advisorRepo.count({
      where: {
        group_id: groupId,
        role: AdvisorRole.MAIN,
        deleted_at: IsNull(),
      },
    });

    if (mainCount >= 1) {
      throw new BadRequestException(
        'Group already has a main advisor. Only one main advisor is allowed.',
      );
    }
  }

  async validateMainAdvisorLimitBulk(advisors: CreateAdvisorDto[]): Promise<void> {
    const mainCount = advisors.filter((a) => a.role === AdvisorRole.MAIN).length;
    if (mainCount > 1) {
      throw new BadRequestException(
        'Cannot have more than one main advisor. Only one main advisor is allowed.',
      );
    }
  }

  async validateIsOwner(userId: string, groupId: string): Promise<void> {
    const owner = await this.groupMemberRepo.findOne({
      where: {
        group_id: groupId,
        role: GroupMemberRole.OWNER,
        deleted_at: IsNull(),
      },
      relations: ['student', 'student.user'],
    });

    if (!owner) {
      throw new NotFoundException('Group not found');
    }

    if (owner.student.user.user_uuid !== userId) {
      throw new ForbiddenException('Only the group owner can perform this action');
    }
  }

  /**
   * ดึงรายการกลุ่มโครงงานที่อาจารย์เป็นที่ปรึกษา (ทั้ง Main และ Co-Advisor)
   */
  async getGroupsByInstructor(userId: string) {
    // 1. หา instructor info จาก userId
    const user = await this.usersService.findById(userId);
    if (!user || !user.instructor) {
      throw new NotFoundException('ไม่พบข้อมูลอาจารย์');
    }
    const instructorUuid = user.instructor.instructor_uuid;

    // 2. Query หา AdvisorAssignment ที่ instructor_uuid ตรงกัน
    const assignments = await this.advisorRepo.find({
      where: {
        instructor_uuid: instructorUuid,
        deleted_at: IsNull(),
        group: {
          thesis: {
            // status: Not(ThesisStatus.FAILED), // (Optional) อาจจะกรองเอาเฉพาะที่ยังไม่ Failed หรือไม่ถูกลบ
            delete_at: IsNull()
          }
        }
      },
      relations: {
        group: {
          thesis: true,
          members: {
            student: true,
          },
          created_by: { student: true }
        },
      },
      order: {
        assigned_at: 'DESC',
      },
      select: {
        // เลือก field ที่จำเป็นเพื่อลด payload
        advisor_id: true,
        role: true,
        assigned_at: true,
        group: {
          group_id: true,
          status: true,
          thesis: {
            thesis_code: true,
            thesis_name_th: true,
            thesis_name_en: true,
            status: true,
            graduation_year: true,
            start_academic_year: true,
            start_term: true,
            course_type: true,
          },
          members: {
            member_id: true,
            student: {
              student_code: true,
              first_name: true,
              last_name: true
            },
            invitation_status: true,
            role: true
          }
        }
      }
    });

    return assignments.map(assignment => {
      if (assignment.group && assignment.group.members) {
        assignment.group.members = assignment.group.members.filter(
          member => member.invitation_status !== 'rejected'
        );
      }

      return {
        advisorRole: assignment.role,
        assignedAt: assignment.assigned_at,
        group: assignment.group,
      };
    });
  }

  async getAdvisedGroupsWithProgress(instructorUserId: string) {
    // 1. Get instructor
    const user = await this.usersService.findById(instructorUserId);

    if (!user || !user.instructor) {
      throw new NotFoundException('ไม่พบข้อมูลอาจารย์ที่ปรึกษาในระบบ');
    }
    const instructorId = user.instructor.instructor_uuid;

    // 2. Find groups
    const assignments = await this.advisorRepo.find({
      where: {
        instructor_uuid: instructorId,
        deleted_at: IsNull()
      },
      relations: ['group', 'group.thesis', 'group.members', 'group.members.student'],
    });

    const groupIds = assignments.map(a => a.group_id);
    if (groupIds.length === 0) return [];

    // 3. Get all inspection rounds
    const allRounds = await this.inspectionRoundRepository.find({
      where: { isActive: true },
      order: { roundNumber: 'ASC' }
    });

    // 4. Get submissions
    const submissions = await this.submissionRepo.find({
      where: { group: { group_id: In(groupIds) } },
      relations: ['inspectionRound', 'group'],
    });

    // 5. Map data
    return Promise.all(assignments.map(async (assignment) => {
      const group = assignment.group;
      const thesis = group.thesis;

      const groupCourseType = thesis.course_type;
      const groupYear = thesis.start_academic_year;
      const groupTerm = thesis.start_term;

      // Filter รอบการตรวจ
      const applicableRounds = allRounds.filter(round => {
        const isTypeMatch = round.courseType === CourseType.ALL || round.courseType === groupCourseType;
        const isYearMatch = groupYear ? round.academicYear === String(groupYear) : false;
        const isTermMatch = groupTerm ? round.term === String(groupTerm) : false;

        return isTypeMatch && isYearMatch && isTermMatch;
      });

      // Map progress
      const groupSubmissions = await Promise.all(applicableRounds.map(async (round) => {
        const submission = submissions.find(s =>
          s.group.group_id === group.group_id &&
          s.inspectionRound.inspectionId === round.inspectionId
        );

        let status = 'MISSING';
        let signedUrl: string | null = null;

        if (submission) {
          status = submission.status;

          signedUrl = submission.fileUrl; // ค่าเริ่มต้น
          if (submission.storagePath) {
            try {
              signedUrl = await this.storageService.getFileUrl(submission.storagePath);
            } catch (error) {
              this.logger.error(`Failed to generate signed url for ${submission.storagePath}`, error);
            }
          }

        } else {
          const now = new Date();
          if (now > round.endDate) status = 'OVERDUE';
          else if (now < round.startDate) status = 'UPCOMING';
          else status = 'WAITING_FOR_SUBMISSION';
        }

        return {
          roundId: round.inspectionId,
          roundTitle: round.title,
          roundNumber: round.roundNumber,
          startDate: round.startDate,
          endDate: round.endDate,
          status: status,
          submittedAt: submission?.submittedAt || null,
          submissionId: submission?.submissionId || null,
          fileUrl: signedUrl,
          fileName: submission?.fileName || null
        };
      }));

      return {
        groupId: group.group_id,
        thesisCode: thesis.thesis_code,
        thesisName: thesis.thesis_name_th,
        thesisStatus: thesis.status,
        advisorRole: assignment.role,
        courseType: groupCourseType,
        academicYear: groupYear,
        term: groupTerm,
        students: group.members
          .filter(m => m.invitation_status !== 'rejected')
          .map(m => ({
            name: `${m.student.first_name} ${m.student.last_name}`,
            code: m.student.student_code,
            role: m.role
          })),
        progress: groupSubmissions
      };
    }));
  }
}
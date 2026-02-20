// src/modules/group-member/group-member.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateGroupMemberDto } from './dto/create-group-member.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { GroupMember } from './entities/group-member.entity';
import { EntityManager, InsertResult, Repository, IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';
import { UsersService } from '../users/users.service';
import { InvitationStatus } from './enum/invitation-status.enum';
import { GroupMemberRole } from './enum/group-member-role.enum';
import { ThesisGroup, ThesisGroupStatus } from '../thesis-group/entities/thesis-group.entity';
import { Not } from 'typeorm';
import { ThesisStatus } from '../thesis/enums/course-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class GroupMemberService {
  private readonly logger = new Logger(GroupMemberService.name);
  constructor(
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    @InjectRepository(ThesisGroup)
    private readonly thesisGroupRepo: Repository<ThesisGroup>,
    private readonly userService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) { }


  async getMyInvitations(userId: any) {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new HttpException('Student not found', HttpStatus.BAD_REQUEST);
      }


      const invitations = await this.groupMemberRepo.find({
        where: {
          student_uuid: user.student.student_uuid,
          invitation_status: InvitationStatus.PENDING,
          role: GroupMemberRole.MEMBER
        },
        relations: {
          group: {
            thesis: true,
            created_by: {
              student: true,
            },
          },
        },
        select: {
          member_id: true,
          student_uuid: true,
          role: true,
          invitation_status: true,
          invited_at: true,
          group_id: true,
          group: {
            group_id: true,
            status: true,
            created_at: true,
            thesis: {
              thesis_id: true,
              thesis_code: true,
              thesis_name_th: true,
              thesis_name_en: true,
              graduation_year: true,
            },
            created_by: {
              user_uuid: true,  // จำเป็นสำหรับ join
              student: {
                prefix_name: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      });

      return invitations;
    } catch (error) {
      throw new HttpException(
        error.message || 'Get my invitations failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createGroupMember(
    manager: EntityManager,
    group_id: string,
    groupMember: CreateGroupMemberDto[],
  ): Promise<InsertResult> {
    const members = groupMember.map((m) => ({
      ...m,
      group_id: group_id,
    }));
    return await manager.insert(GroupMember, members);
  }

  async updateInvitationStatus(
    userId: string,
    memberId: string,
    dto: UpdateInvitationStatusDto,
  ): Promise<GroupMember> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new HttpException('Student not found', HttpStatus.BAD_REQUEST);
      }

      const targetMember = await this.groupMemberRepo.findOneBy({
        student_uuid: user.student.student_uuid,
        member_id: memberId,
      });

      if (!targetMember) {
        throw new HttpException('Member not found', HttpStatus.BAD_REQUEST);
      }

      if (dto.invitation_status === InvitationStatus.APPROVED) {
        // ค้นหาการเป็นสมาชิกในกลุ่มอื่นที่ "Active" อยู่
        const activeMembership = await this.groupMemberRepo.findOne({
          where: {
            student_uuid: user.student.student_uuid,
            invitation_status: InvitationStatus.APPROVED,
            deleted_at: IsNull(), // ยังไม่ถูกลบออกจากกลุ่ม
            group: {
              thesis: {
                // กลุ่มที่ถือว่า Active คือกลุ่มที่ Thesis ยังไม่ FAILED และยังไม่ถูกลบ
                status: Not(ThesisStatus.FAILED),
                delete_at: IsNull(),
              }
            }
          },
          relations: {
            group: { thesis: true }
          }
        });

        if (activeMembership) {
          throw new BadRequestException(
            `คุณเป็นสมาชิกในกลุ่ม "${activeMembership.group.thesis.thesis_name_th}" อยู่แล้ว ไม่สามารถตอบรับคำเชิญอื่นได้`
          );
        }
      }

      targetMember.invitation_status = dto.invitation_status;

      if (dto.invitation_status === InvitationStatus.APPROVED) {
        targetMember.approved_at = new Date();
      }

      await this.groupMemberRepo.save(targetMember);

      if (
        dto.invitation_status === InvitationStatus.APPROVED ||
        dto.invitation_status === InvitationStatus.REJECTED
      ) {
        await this.updateGroupStatus(targetMember.group_id);
      }

      // =========================================================
      // Notification
      // =========================================================
      try {
        const ownerMember = await this.groupMemberRepo.findOne({
          where: { group_id: targetMember.group_id, role: GroupMemberRole.OWNER },
          relations: ['student', 'student.user', 'group', 'group.thesis']
        });

        if (ownerMember?.student?.user?.user_uuid) {
          const ownerUserId = ownerMember.student.user.user_uuid;
          const actingStudentName = `${user.student.first_name} ${user.student.last_name}`;
          const thesisName = ownerMember.group?.thesis?.thesis_name_th || 'ของคุณ';

          let notiTitle = '';
          let notiMessage = '';

          if (dto.invitation_status === InvitationStatus.APPROVED) {
            notiTitle = 'มีผู้ตอบรับคำเชิญ';
            notiMessage = `"${actingStudentName}" ได้ตอบรับเข้าร่วมกลุ่มโครงงาน "${thesisName}" ของคุณแล้ว`;
          } else if (dto.invitation_status === InvitationStatus.REJECTED) {
            notiTitle = 'ปฏิเสธคำเชิญ';
            notiMessage = `"${actingStudentName}" ได้ปฏิเสธคำเชิญเข้าร่วมกลุ่มโครงงาน "${thesisName}"`;
          }

          if (notiTitle) {
            await this.notificationsService.createAndSend(
              ownerUserId,
              NotificationType.GROUP_INVITE,
              notiTitle,
              notiMessage,
              {
                groupId: targetMember.group_id,
                url: `/student/groups/${targetMember.group_id}`
              }
            );
          }
        }
      } catch (error) {
        this.logger.error(`Failed to send response notification: ${error.message}`);
      }

      return targetMember;
    } catch (error) {
      throw new HttpException(
        error.message || 'Update invitation status failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMyGroup(userId: string) {
    try {
      // หา student จาก userId
      const user = await this.userService.findById(userId);
      if (!user || !user.student) {
        throw new HttpException('Student not found', HttpStatus.BAD_REQUEST);
      }

      // หา group ทั้งหมดที่ student เป็นสมาชิกและได้รับการ approve แล้ว
      const myMemberships = await this.groupMemberRepo.find({
        where: {
          student_uuid: user.student.student_uuid,
          invitation_status: InvitationStatus.APPROVED,
        },
        relations: {
          group: {
            thesis: true,
            created_by: true,
            members: {
              student: true,
            },
            advisor: {
              instructor: true,
            },
          },
        },
        select: {
          member_id: true,
          group_id: true,
          group: {
            group_id: true,
            status: true,
            created_at: true,
            rejection_reason: true,
            created_by: {
              user_uuid: true,
            },
            thesis: {
              thesis_id: true,
              thesis_code: true,
              thesis_name_th: true,
              thesis_name_en: true,
              graduation_year: true,
              course_type: true,
              start_academic_year: true,
              start_term: true,
              status: true,
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
          },
        },
      });

      if (!myMemberships || myMemberships.length === 0) {
        return []; // ยังไม่มี group
      }

      return myMemberships.map((membership) => {
        const group = membership.group;

        // คำนวณจำนวนสมาชิก โดยตัดคนที่ Rejected ออก
        const activeMembersCount = group.members.filter(
          (m) => m.invitation_status !== InvitationStatus.REJECTED
        ).length;

        return {
          ...group,
          totalMemberCount: activeMembersCount,
        };
      });

    } catch (error) {
      throw new HttpException(
        error.message || 'Get my group failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============ Member Management Methods ============

  async addMember(
    userId: string,
    groupId: string,
    dto: AddMemberDto,
  ): Promise<GroupMember> {
    // Validate owner permission
    await this.validateIsOwner(userId, groupId);

    const group = await this.thesisGroupRepo.findOne({
      where: { group_id: groupId },
      relations: ['thesis']
    });

    if (!group) {
      throw new NotFoundException('ไม่พบกลุ่มวิทยานิพนธ์');
    }

    if (group.status === ThesisGroupStatus.APPROVED) {
      throw new BadRequestException(
        'ไม่สามารถเชิญสมาชิกเพิ่มได้ เนื่องจากกลุ่มนี้ได้รับการอนุมัติเรียบร้อยแล้ว'
      );
    }

    // Check if student already in group
    const existing = await this.groupMemberRepo.findOne({
      where: {
        group_id: groupId,
        student_uuid: dto.student_uuid,
        deleted_at: IsNull(),
      },
    });

    if (existing) {
      throw new BadRequestException('Student already in this group');
    }

    const member = this.groupMemberRepo.create({
      student_uuid: dto.student_uuid,
      group_id: groupId,
      role: GroupMemberRole.MEMBER,
      invitation_status: InvitationStatus.PENDING,
    });

    const savedMember = await this.groupMemberRepo.save(member);

    await this.updateGroupStatus(groupId);

    // =========================================================
    // Notification
    // =========================================================
    try {
      const memberInfo = await this.groupMemberRepo.findOne({
        where: { member_id: savedMember.member_id },
        relations: ['student', 'student.user']
      });

      if (memberInfo?.student?.user?.user_uuid) {
        const targetUserId = memberInfo?.student?.user?.user_uuid;
        const thesisName = group.thesis?.thesis_name_th || 'โครงงาน (ไม่ระบุชื่อ)';

        await this.notificationsService.createAndSend(
          targetUserId,
          NotificationType.GROUP_INVITE,
          '📩 คำเชิญเข้าร่วมกลุ่มใหม่',
          `คุณได้รับคำเชิญให้เข้าร่วมกลุ่มโครงงาน "${thesisName}"`,
          {
            groupId: groupId,
            url: '/student/group-management'
          }
        );
      } else {
        this.logger.warn(`แจ้งเตือนล้มเหลว: หา user_uuid ไม่เจอ สำหรับ student_uuid: ${dto.student_uuid}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send invite notification: ${error.message}`);
    }

    return savedMember;
  }

  async removeMember(
    userId: string,
    groupId: string,
    memberId: string,
  ): Promise<{ message: string }> {
    // Validate owner permission
    await this.validateIsOwner(userId, groupId);

    const group = await this.thesisGroupRepo.findOne({
      where: { group_id: groupId }
    });

    if (!group) {
      throw new NotFoundException('ไม่พบกลุ่มวิทยานิพนธ์');
    }

    if (group.status === ThesisGroupStatus.APPROVED) {
      throw new BadRequestException(
        'ไม่สามารถลบสมาชิกได้ เนื่องจากกลุ่มนี้ได้รับการอนุมัติเรียบร้อยแล้ว'
      );
    }

    const member = await this.groupMemberRepo.findOne({
      where: {
        member_id: memberId,
        group_id: groupId,
        deleted_at: IsNull(),
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove owner
    if (member.role === GroupMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove group owner');
    }

    // Soft delete
    await this.groupMemberRepo.softRemove(member);
    await this.updateGroupStatus(groupId);
    return { message: 'Member removed successfully' };
  }

  // ============ Group Status Management ============

  async updateGroupStatus(groupId: string, manager?: EntityManager): Promise<void> {
    const groupMemberRepo = manager ? manager.getRepository(GroupMember) : this.groupMemberRepo;
    const thesisGroupRepo = manager ? manager.getRepository(ThesisGroup) : this.thesisGroupRepo;

    // 1. ดึงสมาชิกทั้งหมดที่ยังไม่ถูกลบ (รวม PENDING, APPROVED, REJECTED)
    const members = await groupMemberRepo.find({
      where: {
        group_id: groupId,
        deleted_at: IsNull()
      },
    });

    if (members.length === 0) return;

    // 2. กรองเอาเฉพาะคนที่ "ไม่ได้ปฏิเสธ" (Non-rejected members)
    // เพราะคนที่ปฏิเสธไปแล้ว ถือว่าออกจากวงโคจรการสร้างกลุ่มนี้ไปแล้ว
    const activeCandidates = members.filter(
      (m) => m.invitation_status !== InvitationStatus.REJECTED
    );

    // 3. เช็คว่าคนที่เหลืออยู่ (Active Candidates) ตอบรับครบทุกคนแล้วหรือยัง?
    // เช่น ถ้ามี Owner(Approved) + นาย A(Rejected) -> activeCandidates เหลือแค่ Owner -> allApproved = true
    const allApproved = activeCandidates.length > 0 && activeCandidates.every(
      (m) => m.invitation_status === InvitationStatus.APPROVED,
    );

    const group = await thesisGroupRepo.findOne({ where: { group_id: groupId } });
    if (!group) return;

    // ห้ามเปลี่ยนสถานะถ้า Admin อนุมัติไปแล้ว
    if (group.status === ThesisGroupStatus.APPROVED) return;

    // 4. Update Status
    // ถ้าทุกคนที่เหลืออยู่ Approved หมดแล้ว -> PENDING
    // ถ้ายังมีใครสักคน Pending อยู่ -> INCOMPLETE
    const newStatus = allApproved ? ThesisGroupStatus.PENDING : ThesisGroupStatus.INCOMPLETE;

    await thesisGroupRepo.update(groupId, {
      status: newStatus,
      // ถ้าสถานะกลายเป็น Pending ให้ลบเหตุผลการปฏิเสธเก่าทิ้ง (ถ้ามี)
      rejection_reason: allApproved ? null : group.rejection_reason
    });
  }

  // ============ Validation Methods ============

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

}

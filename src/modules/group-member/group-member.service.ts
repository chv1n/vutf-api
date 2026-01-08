import {
  HttpException,
  HttpStatus,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
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
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';

@Injectable()
export class GroupMemberService {

  constructor(
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    @InjectRepository(ThesisGroup)
    private readonly thesisGroupRepo: Repository<ThesisGroup>,
    private readonly userService: UsersService,
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
      // find Student by userId 
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

      targetMember.invitation_status = dto.invitation_status;

      // Set approved_at timestamp when approved
      if (dto.invitation_status === InvitationStatus.APPROVED) {
        targetMember.approved_at = new Date();
      }

      await this.groupMemberRepo.save(targetMember);

      // Update group status if approved
      if (dto.invitation_status === InvitationStatus.APPROVED) {
        await this.updateGroupStatus(targetMember.group_id);
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
            created_by: {
              user_uuid: true,
            },
            thesis: {
              thesis_id: true,
              thesis_code: true,
              thesis_name_th: true,
              thesis_name_en: true,
              graduation_year: true,
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

      // ดึงเฉพาะ group objects ออกมา
      return myMemberships.map((membership) => membership.group);
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

    return await this.groupMemberRepo.save(member);
  }

  async removeMember(
    userId: string,
    groupId: string,
    memberId: string,
  ): Promise<{ message: string }> {
    // Validate owner permission
    await this.validateIsOwner(userId, groupId);

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
    return { message: 'Member removed successfully' };
  }

  // ============ Group Status Management ============

  async updateGroupStatus(groupId: string): Promise<void> {
    // Get all non-deleted members
    const members = await this.groupMemberRepo.find({
      where: {
        group_id: groupId,
        deleted_at: IsNull(),
      },
    });

    // Check if all members are approved
    const allApproved = members.every(
      (m) => m.invitation_status === InvitationStatus.APPROVED,
    );

    // Update group status
    await this.thesisGroupRepo.update(groupId, { status: allApproved });
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

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateGroupMemberDto } from './dto/create-group-member.dto';
import { GroupMember } from './entities/group-member.entity';
import { EntityManager, InsertResult, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';
import { UsersService } from '../users/users.service';
import { InvitationStatus } from './enum/invitation-status.enum';
import { GroupMemberRole } from './enum/group-member-role.enum';

@Injectable()
export class GroupMemberService {

  constructor(
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
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
      await this.groupMemberRepo.save(targetMember);

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

}

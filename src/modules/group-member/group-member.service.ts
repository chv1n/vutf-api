import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateGroupMemberDto } from './dto/create-group-member.dto';
import { GroupMember } from './entities/group-member.entity';
import { EntityManager, InsertResult, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class GroupMemberService {
  constructor(
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    private readonly userService: UsersService,
  ) { }

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

}

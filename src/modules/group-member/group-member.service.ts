import { Injectable } from '@nestjs/common';
import { CreateGroupMemberDto } from './dto/create-group-member.dto';
import { GroupMember } from './entities/group-member.entity';
import { EntityManager, InsertResult } from 'typeorm';

@Injectable()
export class GroupMemberService {
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
}

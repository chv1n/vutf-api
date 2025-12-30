import { Injectable } from '@nestjs/common';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { AdvisorAssignment } from './entities/advisor-assignment.entity';
import { EntityManager, InsertResult } from 'typeorm';

@Injectable()
export class AdvisorAssignmentService {
  async createAdvisor(
    manager: EntityManager,
    group_id: string,
    groupMember: CreateAdvisorDto[],
  ): Promise<InsertResult> {
    const members = groupMember.map((m) => ({
      ...m,
      group_id: group_id,
    }));
    return await manager.insert(AdvisorAssignment, members);
  }
}

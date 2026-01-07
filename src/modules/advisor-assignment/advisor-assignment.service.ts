import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, InsertResult, IsNull } from 'typeorm';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { AddAdvisorDto } from './dto/add-advisor.dto';
import { UpdateAdvisorDto } from './dto/update-advisor.dto';
import { AdvisorAssignment } from './entities/advisor-assignment.entity';
import { AdvisorRole } from './enum/advisor-role.enum';
import { GroupMember } from '../group-member/entities/group-member.entity';
import { GroupMemberRole } from '../group-member/enum/group-member-role.enum';

@Injectable()
export class AdvisorAssignmentService {
  constructor(
    @InjectRepository(AdvisorAssignment)
    private readonly advisorRepo: Repository<AdvisorAssignment>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
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

    return await this.advisorRepo.save(advisor);
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
    return await this.advisorRepo.save(advisor);
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
    return { message: 'Advisor removed successfully' };
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
}

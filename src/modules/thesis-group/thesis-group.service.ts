import { NotFoundException, Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateThesisGroupDto } from './dto/create-thesis-group.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ThesisGroup } from './entities/thesis-group.entity';
import { EntityManager, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { GroupMemberService } from '../group-member/group-member.service';
import { AdvisorAssignmentService } from '../advisor-assignment/advisor-assignment.service';
import { ThesisService } from '../thesis/thesis.service';
import { Thesis } from '../thesis/entities/thesis.entity';
import { CreateGroupMemberDto } from '../group-member/dto/create-group-member.dto';
import { UsersService } from '../users/users.service';
import { GroupMemberRole } from '../group-member/enum/group-member-role.enum';
import { InvitationStatus } from '../group-member/enum/invitation-status.enum';

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
      status: true,
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
    };
    const addedOwner = [ownerMember, ...group_member];
    return addedOwner;
  }
}

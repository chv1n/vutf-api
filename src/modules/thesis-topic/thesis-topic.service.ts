// src/modules/thesis-topic/thesis-topic.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisStatus } from '../thesis/enums/course-type.enum';
import { ThesisGroup, ThesisGroupStatus } from '../thesis-group/entities/thesis-group.entity';
import { AdminApproveGroupDto } from './dto/admin-approve-group.dto';
import { GetGroupsFilterDto } from './dto/get-groups-filter.dto';

@Injectable()
export class ThesisTopicService {
  constructor(
    @InjectRepository(Thesis)
    private readonly thesisRepo: Repository<Thesis>,
    @InjectRepository(ThesisGroup)
    private readonly thesisGroupRepo: Repository<ThesisGroup>,
  ) { }

  async removeThesis(thesisId: string): Promise<{ message: string }> {
    const thesis = await this.thesisRepo.findOneBy({ thesis_id: thesisId });

    if (!thesis) {
      throw new NotFoundException('ไม่พบข้อมูลวิทยานิพนธ์ที่ต้องการลบ');
    }

    // ใช้ softDelete เพื่อให้ข้อมูลยังอยู่ใน DB แต่มีค่าใน delete_at
    await this.thesisRepo.softDelete(thesisId);

    return { message: 'ลบข้อมูลวิทยานิพนธ์เรียบร้อยแล้ว (Soft Delete)' };
  }

  async getGroupsForAdmin(filterDto: GetGroupsFilterDto) {
    const {
      keyword,
      group_status,
      start_academic_year,
      start_term,
      graduation_year,
      thesis_status,
      page = 1,   // Default หน้า 1
      limit = 10  // Default 10 รายการต่อหน้า
    } = filterDto;

    // เริ่มสร้าง QueryBuilder
    const query = this.thesisGroupRepo.createQueryBuilder('group')
      .innerJoinAndSelect('group.thesis', 'thesis')

      .leftJoinAndSelect(
        'group.members',
        'members',
        'members.invitation_status != :rejectedStatus',
        { rejectedStatus: 'rejected' } // หรือใช้ Enum: InvitationStatus.REJECTED
      )
      .leftJoinAndSelect('members.student', 'student')
      .leftJoinAndSelect('group.advisor', 'advisor')
      .leftJoinAndSelect('advisor.instructor', 'instructor')

      // 1. กรอง Thesis ที่ถูก Soft Delete ออก
      .where('thesis.delete_at IS NULL');

    // 2. Filter: Group Status
    if (group_status) {
      query.andWhere('group.status = :group_status', { group_status });
    }

    // 3. Filter: Thesis Fields
    if (start_academic_year) {
      query.andWhere('thesis.start_academic_year = :start_academic_year', { start_academic_year });
    }
    if (start_term) {
      query.andWhere('thesis.start_term = :start_term', { start_term });
    }
    if (graduation_year) {
      query.andWhere('thesis.graduation_year = :graduation_year', { graduation_year });
    }
    if (thesis_status) {
      query.andWhere('thesis.status = :thesis_status', { thesis_status });
    }

    // 4. Search Keyword
    if (keyword) {
      query.andWhere(new Brackets((qb) => {
        qb.where('thesis.thesis_name_th LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('thesis.thesis_name_en LIKE :keyword', { keyword: `%${keyword}%` })
          .orWhere('thesis.thesis_code LIKE :keyword', { keyword: `%${keyword}%` })
        // .orWhere('student.first_name LIKE :keyword', { keyword: `%${keyword}%` })
        // .orWhere('student.last_name LIKE :keyword', { keyword: `%${keyword}%` })
        // .orWhere('student.student_code LIKE :keyword', { keyword: `%${keyword}%` });
      }));
    }

    // เรียงลำดับเอาล่าสุดขึ้นก่อน
    query.orderBy('group.created_at', 'DESC');

    // --- Pagination Logic ---
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // เปลี่ยนเป็น getManyAndCount เพื่อเอาจำนวนทั้งหมดมาคำนวณหน้า
    const [groups, total] = await query.getManyAndCount();

    // Map ข้อมูล
    const mappedGroups = groups.map(group => {
      const members = group.members || [];
      const thesis = group.thesis;

      // เช็คว่าสมาชิกตอบรับครบทุกคนหรือยัง
      const allMembersAccepted = members.length > 0 && members.every(m => m.invitation_status === 'approved');

      // นับจำนวนสมาชิกที่ตอบรับแล้ว
      const approvedCount = members.filter(m => m.invitation_status === 'approved').length;
      const totalMembers = members.length;

      // Logic: ปุ่ม Admin ควรเปิดให้กดได้เมื่อไหร่?
      const isActionable = allMembersAccepted && group.status === ThesisGroupStatus.PENDING;

      // Logic: ระบุ Stage ของกลุ่ม
      let stage = 'UNKNOWN';
      if (group.status === ThesisGroupStatus.PENDING) {
        stage = 'WAITING_FOR_APPROVAL';
      } else if (group.status === ThesisGroupStatus.INCOMPLETE) {
        stage = 'INCOMPLETE';
      } else if (group.status === ThesisGroupStatus.REJECTED) {
        stage = 'REJECTED';
      } else if (group.status === ThesisGroupStatus.APPROVED) {
        if (thesis.status === ThesisStatus.IN_PROGRESS) {
          stage = 'DOING_THESIS';
        } else if (thesis.status === ThesisStatus.PASSED) {
          stage = 'GRADUATED';
        } else if (thesis.status === ThesisStatus.FAILED) {
          stage = 'FAILED';
        }
      }

      return {
        ...group,
        stage,
        isReadyForAdminAction: isActionable,
        memberProgress: `${approvedCount}/${totalMembers}`
      };
    });

    // Return format แบบ Pagination
    return {
      data: mappedGroups,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async adminUpdateStatus(groupId: string, dto: AdminApproveGroupDto): Promise<ThesisGroup> {
    const group = await this.thesisGroupRepo.findOne({
      where: { group_id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('ไม่พบข้อมูลกลุ่ม');
    }

    // Check 1: ห้ามยุ่งกับกลุ่มที่สมาชิกยังไม่ครบ
    const hasPendingMembers = group.members.some(
      m => m.invitation_status !== 'approved' && m.invitation_status !== 'rejected'
    );

    if (hasPendingMembers) {
      throw new BadRequestException('ไม่สามารถดำเนินการได้ เนื่องจากยังมีสมาชิกที่ยังไม่ตอบรับหรือปฏิเสธคำเชิญ');
    }

    // Check 2: ห้ามยุ่งกับกลุ่มที่ Rejected ไปแล้ว (ต้องรอ นศ. แก้)
    if (group.status === ThesisGroupStatus.REJECTED) {
      throw new BadRequestException('ไม่สามารถดำเนินการได้ เนื่องจากกลุ่มถูกปฏิเสธไปแล้ว ต้องรอให้นักศึกษาแก้ไขข้อมูลใหม่');
    }

    // Check 3 (Optional): ห้าม Approve ซ้ำ
    // if (group.status === ThesisGroupStatus.APPROVED) {
    //   throw new BadRequestException('กลุ่มนี้ได้รับการอนุมัติไปแล้ว');
    // }

    // --- Process Update ---
    group.status = dto.status;

    if (dto.status === ThesisGroupStatus.APPROVED) {
      group.approved_at = new Date();
      group.rejection_reason = null;
    } else if (dto.status === ThesisGroupStatus.REJECTED) {
      group.approved_at = null;
      group.rejection_reason = dto.rejection_reason || 'ไม่ระบุเหตุผล';
    }

    return await this.thesisGroupRepo.save(group);
  }
}
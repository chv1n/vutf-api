// src/modules/track-thesis/track-thesis.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, SelectQueryBuilder } from 'typeorm';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { InspectionRound } from '../inspection_round/entities/inspection_round.entity';
import { InspectionRoundService } from '../inspection_round/inspection_round.service';
import { GetUnsubmittedFilterDto } from './dto/get-unsubmitted-filter.dto';
import { CourseType, ThesisStatus } from '../thesis/enums/course-type.enum';
import { FileUrlService } from '../../shared/services/file-url.service';
import { InvitationStatus } from '../group-member/enum/invitation-status.enum';
import { MailService } from '../../shared/services/mail.service';

@Injectable()
export class TrackThesisService {
  constructor(
    @InjectRepository(ThesisGroup)
    private readonly thesisGroupRepo: Repository<ThesisGroup>,
    private readonly inspectionRoundService: InspectionRoundService,
    private readonly fileUrlService: FileUrlService,
    private readonly mailService: MailService,
  ) { }

  // ======================================================================
  // PRIVATE HELPER: Query Builder Factory
  // ======================================================================
  private createBaseQuery(targetRound: InspectionRound, filters: GetUnsubmittedFilterDto): SelectQueryBuilder<ThesisGroup> {
    const { search, advisorName, courseType, academicYear, term } = filters;

    const query = this.thesisGroupRepo.createQueryBuilder('group')
      .innerJoinAndSelect('group.thesis', 'thesis')
      .leftJoinAndSelect(
        'group.members',
        'members',
        'members.invitation_status = :approvedStatus',
        { approvedStatus: InvitationStatus.APPROVED }
      )
      .leftJoinAndSelect('members.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('group.advisor', 'advisors')
      .leftJoinAndSelect('advisors.instructor', 'instructor')
      // Join Submission for this round
      .leftJoinAndSelect(
        'group.submissions',
        'submission',
        'submission.inspection_id = :targetRoundId',
        { targetRoundId: targetRound.inspectionId }
      )
      // .where('thesis.status = :thesisStatus', { thesisStatus: ThesisStatus.IN_PROGRESS })
      .andWhere('thesis.delete_at IS NULL');

    // --- Apply Shared Filters ---

    // 1. Strict Context (Year/Term)
    const targetYear = academicYear || targetRound.academicYear;
    query.andWhere('thesis.start_academic_year = :year', { year: Number(targetYear) });

    const targetTerm = term || targetRound.term;
    query.andWhere('thesis.start_term = :term', { term: Number(targetTerm) });

    // 2. Course Type
    if (courseType && courseType !== CourseType.ALL) {
      query.andWhere('thesis.course_type = :type', { type: courseType });
    } else if (targetRound.courseType !== CourseType.ALL) {
      query.andWhere('thesis.course_type = :roundType', { roundType: targetRound.courseType });
    }

    // 3. Search
    if (search) {
      query.andWhere(new Brackets((qb) => {
        qb.where('thesis.thesis_name_th LIKE :search', { search: `%${search}%` })
          .orWhere('thesis.thesis_name_en LIKE :search', { search: `%${search}%` })
          .orWhere('thesis.thesis_code LIKE :search', { search: `%${search}%` })
          .orWhere('student.student_code LIKE :search', { search: `%${search}%` })
          .orWhere("CONCAT(student.first_name, ' ', student.last_name) LIKE :search", { search: `%${search}%` });
      }));
    }

    // 4. Advisor
    if (advisorName) {
      query.andWhere(new Brackets((qb) => {
        qb.where('instructor.first_name LIKE :advisorName', { advisorName: `%${advisorName}%` })
          .orWhere('instructor.last_name LIKE :advisorName', { advisorName: `%${advisorName}%` });
      }));
    }

    return query;
  }

  // ======================================================================
  // PUBLIC METHOD 1: Get Unsubmitted
  // ======================================================================
  async getUnsubmittedGroups(filterDto: GetUnsubmittedFilterDto) {
    const { page = 1, limit = 10, isExport = false, sortOrder = 'DESC' } = filterDto;

    // 1. Resolve Round
    const targetRound = await this.inspectionRoundService.resolveTargetRound(filterDto);
    if (!targetRound) return this.buildEmptyResponse(page, limit, "ไม่พบข้อมูลรอบการตรวจ");

    // 2. Create Base Query
    const query = this.createBaseQuery(targetRound, filterDto);

    // 3. Calculate Stats
    const stats = await this.calculateStats(query);

    // 4. Filter Specific (Only "Unsubmitted")
    query.andWhere('submission.submission_id IS NULL');
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query.orderBy('student.student_code', order);

    // 5. Pagination
    if (!isExport) query.skip((page - 1) * limit).take(limit);

    const [groups, count] = await query.getManyAndCount();

    // 6. Format Response
    const formattedData = await Promise.all(
      groups.map(group => this.mapGroupToDto(group, targetRound))
    );

    return {
      success: true,
      data: formattedData,
      meta: {
        totalItems: count,
        itemCount: formattedData.length,
        itemsPerPage: isExport ? count : limit,
        totalPages: isExport ? 1 : Math.ceil(count / limit),
        currentPage: page,
        stats,
        filterContext: this.buildFilterContext(targetRound)
      }
    };
  }

  // ======================================================================
  // PUBLIC METHOD 2: Get Submitted
  // ======================================================================
  async getSubmittedGroups(filterDto: GetUnsubmittedFilterDto) {
    const { page = 1, limit = 10, isExport = false, status, sortOrder = 'DESC' } = filterDto;

    // 1. Resolve Round
    const targetRound = await this.inspectionRoundService.resolveTargetRound(filterDto);
    if (!targetRound) return this.buildEmptyResponse(page, limit, "ไม่พบข้อมูลรอบการตรวจ");

    // 2. Create Base Query
    const query = this.createBaseQuery(targetRound, filterDto);

    // 3. Filter Specific (Only "Submitted")
    query.andWhere('submission.submission_id IS NOT NULL');

    if (status) {
      query.andWhere('submission.status = :status', { status });
    }
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query.orderBy('submission.submittedAt', order as any);

    // 4. Pagination
    if (!isExport) query.skip((page - 1) * limit).take(limit);

    const [groups, count] = await query.getManyAndCount();

    // 5. Format Response
    const formattedData = await Promise.all(
      groups.map(group => this.mapGroupToDto(group, targetRound))
    );

    return {
      success: true,
      data: formattedData,
      meta: {
        totalItems: count,
        itemCount: formattedData.length,
        itemsPerPage: isExport ? count : limit,
        totalPages: isExport ? 1 : Math.ceil(count / limit),
        currentPage: page,
        filterContext: this.buildFilterContext(targetRound)
      }
    };
  }

  // ======================================================================
  // PRIVATE HELPERS
  // ======================================================================

  private async calculateStats(baseQuery: SelectQueryBuilder<ThesisGroup>) {
    // Clone to find Total
    const totalGroups = await baseQuery.getCount();

    // Clone to find Submitted
    const submittedCount = await baseQuery.clone()
      .andWhere('submission.submission_id IS NOT NULL')
      .getCount();

    return {
      totalGroups,
      submitted: submittedCount,
      unsubmitted: totalGroups - submittedCount
    };
  }

  private async mapGroupToDto(group: ThesisGroup, round: InspectionRound) {
    const approvedMembers = group.members || [];
    const submission = group.submissions?.[0];

    let signedFileUrl: string | null = null;
    let signedDownloadUrl: string | null = null;
    if (submission?.storagePath) {
      const { url, downloadUrl } = await this.fileUrlService.generateSignedUrls(
        submission.storagePath,
        submission.fileName
      );
      signedFileUrl = url;
      signedDownloadUrl = downloadUrl;
    }

    // สร้าง object context เตรียมไว้
    const contextData = {
      inspectionId: round.inspectionId,
      roundLabel: `ปี ${round.academicYear}/${round.term} รอบที่ ${round.roundNumber}`,
      deadline: round.endDate,
      isOverdue: new Date() > new Date(round.endDate)
    };

    return {
      groupId: group.group_id,
      thesisCode: group.thesis.thesis_code,
      thesisTitleTh: group.thesis.thesis_name_th,
      thesisTitleEn: group.thesis.thesis_name_en,
      courseType: group.thesis.course_type,
      groupMembers: approvedMembers.map(m => ({
        studentCode: m.student?.student_code,
        name: `${m.student?.first_name} ${m.student?.last_name}`,
        email: m.student?.user?.email,
        role: m.role, // 'owner' หรือ 'member'
      })),
      advisors: group.advisor?.map(adv => ({
        name: `${adv.instructor.first_name} ${adv.instructor.last_name}`,
        role: adv.role
      })) || [],

      submission: submission ? {
        id: submission.submissionId,
        status: submission.status,
        submittedAt: submission.submittedAt,
        fileName: submission.fileName,
        fileUrl: signedFileUrl || submission.fileUrl,
        downloadUrl: signedDownloadUrl || submission.fileUrl,
        fileSize: submission.fileSize, // ตัวเลข (bytes)
        mimeType: submission.mimeType
      } : null,

      missingContext: contextData, // สำหรับหน้า Unsubmitted
      context: contextData         // สำหรับหน้า Submitted
    };
  }

  private buildEmptyResponse(page: number, limit: number, message: string) {
    return { success: true, data: [], meta: { message, totalItems: 0, itemCount: 0, itemsPerPage: limit, totalPages: 0, currentPage: page } };
  }

  private buildFilterContext(round: InspectionRound) {
    return {
      academicYear: round.academicYear,
      term: round.term,
      roundNumber: round.roundNumber,
      inspectionId: round.inspectionId
    };
  }

  async remindGroup(groupId: string, inspectionId: number) {
    // 1. ดึงข้อมูลกลุ่ม สมาชิก และรอบการตรวจ
    const group = await this.thesisGroupRepo.findOne({
      where: { group_id: groupId },
      relations: ['thesis', 'members', 'members.student', 'members.student.user']
    });

    const round = await this.inspectionRoundService.findOne(inspectionId);

    if (!group || !round) throw new NotFoundException('ข้อมูลไม่ครบถ้วน');

    // 2. กรองเฉพาะอีเมลของสมาชิกที่ Approved
    const emails = group.members
      .filter(m => m.invitation_status === InvitationStatus.APPROVED)
      .map(m => m.student?.user?.email)
      .filter(Boolean);

    if (emails.length === 0) return { success: false, message: 'ไม่พบอีเมลสมาชิก' };

    // 3. เรียกใช้ MailService
    const roundLabel = `ปี ${round.academicYear}/${round.term} รอบที่ ${round.roundNumber}`;
    const deadline = new Date(round.endDate).toLocaleDateString('th-TH');

    await this.mailService.sendUnsubmittedReminder(
      emails,
      group.thesis.thesis_name_th,
      roundLabel,
      deadline
    );

    return { success: true, message: 'ส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว' };
  }

}
// src/modules/report-file/report-file.service.ts
import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In, Not } from 'typeorm';
import { ReportFile } from './entities/report-file.entity';
import { UpdateReportFileDto } from './dto/update-report-file.dto';
import { GetReportsFilterDto } from './dto/get-reports-filter.dto';
import { ReportFileResponseDto } from './dto/report-file-response.dto';
import { VerificationResultStatus, InstructorReviewStatus } from './enum/report-status.enum';
import type { ResultMessage } from '../../shared/rabbitmq/interfaces';
import type { IStorageService } from '../../common/interfaces/storage.interface';
import { STORAGE_SERVICE } from '../../common/interfaces/storage.interface';
import { Submission } from '../submissions/entities/submission.entity';
import { InvitationStatus } from '../group-member/enum/invitation-status.enum';
import { GroupMember } from '../group-member/entities/group-member.entity';

@Injectable()
export class ReportFileService {
  private readonly logger = new Logger(ReportFileService.name);
  constructor(
    @InjectRepository(ReportFile)
    private readonly reportFileRepository: Repository<ReportFile>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) { }

  // ==========================================
  // PRIVATE HELPER: Generate URL
  // ==========================================
  private async generateSignedUrlPair(storagePath: string, fileName: string): Promise<{ url: string; downloadUrl: string }> {
    if (!storagePath) {
      return { url: '', downloadUrl: '' };
    }

    let fileKey = storagePath;

    if (storagePath.startsWith('http')) {
      try {
        const urlObj = new URL(storagePath);
        let rawPath = decodeURIComponent(urlObj.pathname);
        if (rawPath.startsWith('/')) rawPath = rawPath.substring(1);

        const marker = 'reports/';
        const index = rawPath.indexOf(marker);
        if (index !== -1) {
          fileKey = rawPath.substring(index);
        } else {
          fileKey = rawPath;
        }
      } catch (e) {
        this.logger.warn(`Could not parse URL ${storagePath}, using original value.`);
      }
    }

    try {
      const [url, downloadUrl] = await Promise.all([
        this.storageService.getFileUrl(fileKey, 3600, false), // View inline
        this.storageService.getFileUrl(fileKey, 3600, true, fileName), // Force download
      ]);
      return { url, downloadUrl };
    } catch (error) {
      this.logger.error(`Failed to generate URLs for path ${storagePath}: ${error.message}`);
      return { url: '', downloadUrl: '' };
    }
  }

  // ==========================================
  // Helper ที่เรียกใช้ DTO
  // ==========================================
  private async transformReport(item: ReportFile): Promise<ReportFileResponseDto> {
    // Generate URLs สำหรับ PDF
    const pdfUrls = await this.generateSignedUrlPair(item.file_url, item.file_name);
    
    // Generate URLs สำหรับ Original Submission PDF
    let submissionUrls: { url: string; downloadUrl: string } | null = null;
    if (item.submission && item.submission.storagePath) {
        submissionUrls = await this.generateSignedUrlPair(
            item.submission.storagePath, 
            item.submission.fileName || 'original_submission.pdf'
        );
    } 
    // Fallback: กรณีข้อมูลเก่าไม่มี storagePath ค่อยใช้ fileUrl
    else if (item.submission && item.submission.fileUrl) {
         // (Optional) อาจจะต้องแก้ generateSignedUrlPair ให้รองรับ path 'submissions/' ด้วยถ้าจำเป็น
         // แต่ถ้าระบบใหม่มี storagePath ทุกตัว ใช้ข้างบนปลอดภัยกว่าครับ
         submissionUrls = await this.generateSignedUrlPair(
            item.submission.fileUrl, 
            item.submission.fileName || 'original_submission.pdf'
        );
    }

    // Generate URLs สำหรับ CSV (ถ้ามี)
    let csvUrls: { url: string; downloadUrl: string } | null = null;
    if (item.csv_url) {
      // สร้างชื่อไฟล์ csv จากชื่อ pdf (เช่น report_abc.pdf -> report_abc.csv)
      // หรือใช้ชื่อไฟล์แบบง่ายๆ เพราะตอน downloadUrl เรากำหนดชื่อปลายทางได้
      const csvName = item.file_name.replace('.pdf', '.csv');
      csvUrls = await this.generateSignedUrlPair(item.csv_url, csvName);
    }

    return ReportFileResponseDto.fromEntity(item, pdfUrls, submissionUrls, csvUrls);
  }



  // ==========================================
  // MAIN FEATURE: Get All Reports
  // ==========================================
  async getAllReports(filterDto: GetReportsFilterDto) {
    const {
      search,
      submissionId,
      round,
      term,
      academicYear,
      courseType,
      verificationStatus,
      reviewStatus,
      page = 1,
      limit = 10
    } = filterDto;

    const skip = (page - 1) * limit;

    const query = this.reportFileRepository.createQueryBuilder('report');

    query
      .leftJoinAndSelect('report.submission', 'submission')
      .leftJoinAndSelect('submission.thesis', 'thesis')
      .leftJoinAndSelect('submission.inspectionRound', 'inspectionRound')
      .leftJoinAndSelect('submission.reviewer', 'reviewerUser')
      .leftJoinAndSelect('reviewerUser.instructor', 'reviewerProfile')
      .leftJoinAndSelect('submission.submitter', 'submitterUser')
      .leftJoinAndSelect('submitterUser.student', 'student');

    if (submissionId) query.andWhere('report.submission_id = :submissionId', { submissionId });
    if (round) query.andWhere('inspectionRound.round_number = :round', { round });
    if (term) query.andWhere('inspectionRound.term = :term', { term });
    if (academicYear) query.andWhere('inspectionRound.academic_year = :year', { year: academicYear });
    if (courseType && courseType !== 'ALL') {
      query.andWhere('thesis.course_type = :courseType', { courseType });
    }
    if (verificationStatus) {
      query.andWhere('report.verification_status = :vStatus', { vStatus: verificationStatus });
    }
    if (reviewStatus) {
      query.andWhere('report.review_status = :rStatus', { rStatus: reviewStatus });
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('thesis.thesis_name_th LIKE :search', { search: `%${search}%` })
            .orWhere('thesis.thesis_name_en LIKE :search', { search: `%${search}%` })
            .orWhere('thesis.thesis_code LIKE :search', { search: `%${search}%` })
            .orWhere('student.first_name LIKE :search', { search: `%${search}%` })
            .orWhere('student.last_name LIKE :search', { search: `%${search}%` })
            .orWhere('reviewerProfile.first_name LIKE :search', { search: `%${search}%` })
            .orWhere('reviewerProfile.last_name LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    query.orderBy('report.reported_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [result, total] = await query.getManyAndCount();

    const data = await Promise.all(result.map((item) => this.transformReport(item)));

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }

  // ==========================================
  // BASIC CRUD
  // ==========================================
  async findAll(): Promise<ReportFile[]> {
    return this.reportFileRepository.find({
      order: { reported_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ReportFileResponseDto> {
    const reportFile = await this.reportFileRepository.findOne({
      where: { report_file_id: id },
      relations: [
        'submission',
        'submission.thesis',
        'submission.inspectionRound',
        'submission.reviewer',
        'submission.reviewer.instructor',
        'submission.group',
        'submission.group.advisor',
        'submission.group.advisor.instructor',
        'commenter',
        'commenter.instructor',
      ],
    });

    if (!reportFile) {
      throw new NotFoundException(`ReportFile with ID ${id} not found`);
    }

    if (reportFile.submission && reportFile.submission.group) {
      reportFile.submission.group.members = await this.groupMemberRepository.find({
        where: {
          group_id: reportFile.submission.group.group_id,
          invitation_status: Not(InvitationStatus.REJECTED), // กรอง Rejected ออก
        },
        relations: ['student'],
      });
    }

    return this.transformReport(reportFile);
  }

  async findBySubmissionId(submissionId: number): Promise<ReportFileResponseDto[]> {

    // ---------------------------------------------------------
    // STEP 1: ดึงข้อมูลส่วนกลาง (Submission Details) มา "ครั้งเดียว"
    // ---------------------------------------------------------
    const submission = await this.submissionRepository.findOne({
      where: { submissionId },
      relations: [
        'thesis',
        'inspectionRound',
        'reviewer',
        'reviewer.instructor',
        'group',
        'group.advisor',           // Data ก้อนใหญ่
        'group.advisor.instructor',
      ],
    });

    if (!submission) {
      // ถ้าไม่มี Submission ก็ไม่ต้องหา Report ต่อ
      return [];
      // หรือ throw new NotFoundException('Submission not found');
    }

    if (submission.group) {
      submission.group.members = await this.groupMemberRepository.find({
        where: {
          group_id: submission.group.group_id,
          invitation_status: Not(InvitationStatus.REJECTED), // กรอง Rejected ออก
        },
        relations: ['student'],
      });
    }

    // ---------------------------------------------------------
    // STEP 2: ดึงรายการ Report (เฉพาะตาราง report_file)
    // ---------------------------------------------------------
    const reports = await this.reportFileRepository.find({
      where: { submission_id: submissionId },
      order: { reported_at: 'DESC' },
    });

    // ---------------------------------------------------------
    // STEP 3: จับคู่และแปลงข้อมูล (Merge & Transform)
    // ---------------------------------------------------------
    return Promise.all(reports.map(async (report) => {
      // "แปะ" submission ก้อนเดียวกัน ใส่เข้าไปใน report ทุกตัว
      // (เป็นการ Pass Reference ไม่กิน Memory เพิ่ม)
      report.submission = submission;

      return this.transformReport(report);
    }));
  }

  async submitReview(
    reportFileId: number,
    status: InstructorReviewStatus,
    comment: string,
    instructorId: string
  ): Promise<ReportFile> {

    const reportFile = await this.reportFileRepository.findOne({
      where: { report_file_id: reportFileId },
    });

    if (!reportFile) {
      throw new NotFoundException(`ReportFile with ID ${reportFileId} not found`);
    }

    reportFile.review_status = status;
    reportFile.comment = comment;
    reportFile.comment_by = instructorId;

    return this.reportFileRepository.save(reportFile);
  }

  async update(
    id: number,
    updateReportFileDto: UpdateReportFileDto,
  ): Promise<ReportFile> {
    const reportFile = await this.reportFileRepository.findOne({
      where: { report_file_id: id },
    });
    if (!reportFile) {
      throw new NotFoundException(`ReportFile with ID ${id} not found`);
    }
    Object.assign(reportFile, updateReportFileDto);
    return this.reportFileRepository.save(reportFile);
  }

  // ==========================================
  // CALLED BY CONSUMER
  // ==========================================

  async createFromResult(
    result: ResultMessage,
    verificationStatus: VerificationResultStatus
  ): Promise<ReportFile> {

    const reportFile = this.reportFileRepository.create({
      submission_id: result.submission_id,
      file_url: result.result_file_url || '',
      csv_url: result.result_csv_url ?? null,
      file_name: result.result_file_name || '',
      file_type: 'pdf',
      file_size: result.result_file_size || 0,

      verification_status: verificationStatus,

      review_status: InstructorReviewStatus.PENDING,
    });

    return this.reportFileRepository.save(reportFile);
  }

  async markAsFailed(
    submissionId: number,
    errorMessage: string,
    status: VerificationResultStatus = VerificationResultStatus.ERROR
  ): Promise<ReportFile> {
    const reportFile = this.reportFileRepository.create({
      submission_id: submissionId,
      file_url: '',
      file_name: '',
      file_type: 'error',
      comment: errorMessage,

      verification_status: status,

      review_status: InstructorReviewStatus.PENDING,
    });

    return this.reportFileRepository.save(reportFile);
  }

  // ==========================================
  // FOR STUDENT: Get only reviewed reports
  // ==========================================
  async findStudentReports(submissionId: number) {
    const reports = await this.reportFileRepository.find({
      where: {
        submission_id: submissionId,
        review_status: Not(InstructorReviewStatus.PENDING)
      },
      relations: ['commenter', 'commenter.instructor'],
      order: { reported_at: 'DESC' },
    });

    return Promise.all(reports.map(async (item) => {
      const pdfUrls = await this.generateSignedUrlPair(item.file_url, item.file_name);
      let csvUrls: { url: string; downloadUrl: string } | null = null;
      if (item.csv_url) {
        const csvName = item.file_name.replace('.pdf', '.csv');
        csvUrls = await this.generateSignedUrlPair(item.csv_url, csvName);
      }

      // ดึงชื่ออาจารย์จาก Relation ที่ Join มา
      const instructorProfile = item.commenter?.instructor;
      const instructorName = instructorProfile
        ? `${instructorProfile.first_name} ${instructorProfile.last_name}`.trim()
        : 'Unknown'; // กรณีหาไม่เจอ

      return {
        id: item.report_file_id,
        file_name: item.file_name,
        file_type: item.file_type,
        file_size: item.file_size,
        verification_status: item.verification_status,
        review_status: item.review_status,
        reported_at: item.reported_at,

        comment: item.comment,
        comment_by_id: item.comment_by,
        comment_by_name: instructorName,

        urls: {
          pdf: pdfUrls,
          csv: csvUrls
        }
      };
    }));
  }

  // ==========================================
  // Helper for Internal Service Communication
  // ==========================================
  /**
   * ฟังก์ชันนี้ทำไว้ให้ Service อื่น (เช่น AdvisorAssignmentService) เรียกใช้
   * เพื่อดึง Report ของหลายๆ กลุ่มพร้อมกันในครั้งเดียว (Bulk Fetch)
   */
  async getReportsByGroupIds(groupIds: string[]) {
    if (!groupIds.length) return [];

    // Query หา Report ที่อยู่ในกลุ่มเหล่านี้
    const reports = await this.reportFileRepository.find({
      where: {
        submission: {
          group: { group_id: In(groupIds) }
        }
      },
      relations: [
        'submission',
        'submission.group',
        'submission.inspectionRound',
        // 'submission.student',
        'commenter', // Join ผู้ตรวจเพื่อเอาชื่อ
        'commenter.instructor'
      ],
      order: { reported_at: 'DESC' }
    });

    // Transform ข้อมูล
    return Promise.all(reports.map(async (report) => {
      // Logic สร้าง Signed URL
      const pdfUrls = await this.generateSignedUrlPair(report.file_url, report.file_name);

      let csvUrls = { url: report.csv_url, downloadUrl: report.csv_url };
      if (report.csv_url && !report.csv_url.startsWith('http')) {
        const csvName = report.file_name.replace('.pdf', '.csv');
        csvUrls = await this.generateSignedUrlPair(report.csv_url, csvName);
      }

      const instructorProfile = report.commenter?.instructor;
      const instructorName = instructorProfile
        ? `${instructorProfile.first_name} ${instructorProfile.last_name}`.trim()
        : 'System';

      return {
        // Return ข้อมูลในรูปแบบที่ AdvisorService ต้องการ (GroupReportDto)
        id: report.report_file_id,
        groupId: report.submission.group.group_id, // *สำคัญ* ต้องส่ง ID กลุ่มกลับไปเพื่อใช้จับคู่
        roundNumber: report.submission.inspectionRound.roundNumber,
        attemptNumber: 1,
        submittedAt: report.reported_at,
        verificationStatus: report.verification_status,
        reviewStatus: report.review_status,
        fileName: report.file_name,
        fileSize: report.file_size,
        fileUrl: pdfUrls.url,
        downloadUrl: pdfUrls.downloadUrl,
        csvUrl: csvUrls.url,
        senderName: report.submission.student ? `${report.submission.student.first_name}` : 'Unknown'
      };
    }));
  }
}
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
import { FileUrlService } from 'src/shared/services/file-url.service';
import { InspectionRoundService } from '../inspection_round/inspection_round.service';
import { Thesis } from '../thesis/entities/thesis.entity';
import { CourseType, ThesisStatus } from '../thesis/enums/course-type.enum';
import { ThesisDocument, DocumentType } from '../thesis/entities/thesis-document.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../../shared/services/mail.service';


@Injectable()
export class ReportFileService {
  private readonly logger = new Logger(ReportFileService.name);
  constructor(
    @InjectRepository(ReportFile)
    private readonly reportFileRepository: Repository<ReportFile>,
    private readonly fileUrlService: FileUrlService,
    private readonly inspectionRoundService: InspectionRoundService,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(Thesis)
    private readonly thesisRepository: Repository<Thesis>,
    @InjectRepository(ThesisDocument)
    private readonly thesisDocumentRepository: Repository<ThesisDocument>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) { }

  private async transformReport(item: ReportFile, attemptNumber?: number): Promise<ReportFileResponseDto> {
    // ใช้ Shared Service จัดการ PDF Report
    const pdfUrls = await this.fileUrlService.generateSignedUrls(item.file_url, item.file_name);

    // ใช้ Shared Service จัดการ Original Submission
    let submissionUrls: { url: string; downloadUrl: string } | null = null;
    if (item.submission?.storagePath || item.submission?.fileUrl) {
      const path = item.submission.storagePath || item.submission.fileUrl;
      const name = item.submission.fileName || 'original_submission.pdf';
      submissionUrls = await this.fileUrlService.generateSignedUrls(path, name);
    }

    // ใช้ Shared Service จัดการ CSV
    let csvUrls: { url: string; downloadUrl: string } | null = null;
    if (item.csv_url) {
      const csvName = item.file_name.replace('.pdf', '.csv');
      csvUrls = await this.fileUrlService.generateSignedUrls(item.csv_url, csvName);
    }

    return ReportFileResponseDto.fromEntity(item, pdfUrls, submissionUrls, csvUrls, attemptNumber); //
  }



  // ==========================================
  // MAIN FEATURE: Get All Reports
  // ==========================================
  async getAllReports(filterDto: GetReportsFilterDto) {
    const {
      search, submissionId, round,
      term, academicYear, courseType,
      verificationStatus, reviewStatus,
      page = 1, limit = 10,
      inspectionId,
      sortOrder = 'DESC'
    } = filterDto;

    const skip = (page - 1) * limit;

    // const targetRound = await this.inspectionRoundService.resolveTargetRound(filterDto);

    const query = this.reportFileRepository.createQueryBuilder('report');

    query
      .leftJoinAndSelect('report.submission', 'submission')
      .leftJoinAndSelect('submission.thesis', 'thesis')
      .leftJoinAndSelect('submission.inspectionRound', 'inspectionRound')
      .leftJoinAndSelect('submission.reviewer', 'reviewerUser')
      .leftJoinAndSelect('reviewerUser.instructor', 'reviewerProfile')
      .leftJoinAndSelect('submission.submitter', 'submitterUser')
      .leftJoinAndSelect('submitterUser.student', 'submitterStudent')
      .leftJoinAndSelect('submission.group', 'group')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('members.student', 'student');

    // กรองตาม inspectionId เฉพาะเมื่อมีการส่งค่ามาเท่านั้น (หน้า Track Thesis จะเข้าเงื่อนไขนี้)
    if (inspectionId) {
      query.andWhere('submission.inspection_id = :inspectionId', { inspectionId });
    }

    // กรองประเภทวิชา
    if (courseType && courseType !== 'ALL') {
      query.andWhere('thesis.course_type = :cType', { cType: courseType });
    }

    // กรองตามเงื่อนไขที่ User เลือกมาจริงๆ (หน้า Thesis Reports จะเข้าเงื่อนไขพวกนี้เมื่อเปลี่ยน Dropdown)
    if (submissionId) query.andWhere('report.submission_id = :submissionId', { submissionId });
    if (round) query.andWhere('inspectionRound.round_number = :round', { round: Number(round) });
    if (term) query.andWhere('inspectionRound.term = :term', { term });
    if (academicYear) query.andWhere('inspectionRound.academic_year = :year', { year: academicYear });

    // กรองสถานะ
    if (verificationStatus) {
      query.andWhere('report.verification_status = :vStatus', { vStatus: verificationStatus });
    }
    if (reviewStatus) {
      query.andWhere('report.review_status = :rStatus', { rStatus: reviewStatus });
    }

    // Search Logic
    if (search) {
      query.andWhere(new Brackets((qb) => {
        qb.where('thesis.thesis_name_th LIKE :search', { search: `%${search}%` })
          .orWhere('thesis.thesis_name_en LIKE :search', { search: `%${search}%` })
          .orWhere('thesis.thesis_code LIKE :search', { search: `%${search}%` })
          .orWhere('student.student_code LIKE :search', { search: `%${search}%` })
          .orWhere('student.first_name LIKE :search', { search: `%${search}%` })
          .orWhere('student.last_name LIKE :search', { search: `%${search}%` });
      }));
    }

    // เรียงลำดับตามความล่าสุด และ Pagination
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query.orderBy('report.reported_at', order)
      .skip(skip)
      .take(limit);

    const [result, total] = await query.getManyAndCount();
    const data = await Promise.all(
      result.map((item) => this.transformReport(item, item.attempt_number))
    );

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
      order: { reported_at: 'ASC' },
    });

    // ---------------------------------------------------------
    // STEP 3: จับคู่และแปลงข้อมูล (Merge & Transform)
    // ---------------------------------------------------------
    return Promise.all(reports.map(async (report, index) => {
      report.submission = submission;
      return this.transformReport(report, index + 1);
    }));
  }

  async submitReview(
    reportFileId: number,
    status: InstructorReviewStatus,
    comment: string,
    instructorId: string
  ): Promise<ReportFile> {

    // ดึงข้อมูล 
    const reportFile = await this.reportFileRepository.findOne({
      where: { report_file_id: reportFileId },
      relations: [
        'submission',
        'submission.submitter',
        'submission.thesis',
        'submission.thesis.approved_submission'
      ]
    });

    if (!reportFile) throw new NotFoundException(`ReportFile not found`);

    // Save 
    reportFile.review_status = status;
    reportFile.comment = comment;
    reportFile.comment_by = instructorId;
    const savedReport = await this.reportFileRepository.save(reportFile);

    // =========================================================
    // Notification 
    // =========================================================
    if (reportFile.submission && reportFile.submission.submitter) {
      const student = reportFile.submission.submitter;
      const targetUserId = reportFile.submission.submitter.user_uuid;
      const studentEmail = student.email;

      let notiTitle = 'อัปเดตสถานะการตรวจสอบ';
      let notiMessage = 'อาจารย์ได้ตรวจสอบงานของคุณแล้ว';

      switch (status) {
        case InstructorReviewStatus.PASSED:
          notiTitle = 'ผลการตรวจสอบ: ผ่าน';
          notiMessage = `ยินดีด้วย! เอกสารของคุณผ่านการตรวจสอบแล้ว`;
          break;
        case InstructorReviewStatus.NEEDS_REVISION:
          notiTitle = 'ผลการตรวจสอบ: แก้ไข';
          notiMessage = `เอกสารต้องได้รับการแก้ไข กรุณาดูคอมเมนต์จากอาจารย์`;
          break;
        case InstructorReviewStatus.NOT_PASSED:
          notiTitle = 'ผลการตรวจสอบ: ไม่ผ่าน';
          notiMessage = `เอกสารไม่ผ่านการตรวจสอบ`;
          break;
      }

      if (comment) {
        const shortComment = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
        notiMessage += ` ("${shortComment}")`;
      }

      await this.notificationsService.createAndSend(
        targetUserId,
        NotificationType.SUBMISSION_STATUS,
        notiTitle,
        notiMessage,
        {
          submissionId: reportFile.submission.submissionId,
          reportFileId: reportFile.report_file_id,
          status: status,
          url: '/student/report'
        }
      ).catch(err => {
        this.logger.error(`Failed to send notification to user ${targetUserId}: ${err.message}`);
      });

      if (studentEmail) {
        this.mailService.sendReviewResult(
          studentEmail,
          reportFile.submission.thesis.thesis_name_th,
          status,
          comment
        ).catch(err => {
          this.logger.error(`Failed to send email to ${studentEmail}: ${err.message}`);
        });
      }
    }
    // =========================================================

    // Logic อัปเดต Thesis และ ThesisDocument
    if (reportFile.submission && reportFile.submission.thesis) {
      const thesis = reportFile.submission.thesis;
      const submission = reportFile.submission;

      const thesisRef = new Thesis();
      thesisRef.thesis_id = thesis.thesis_id;

      // =========================================================
      // CASE A: อาจารย์ให้ "ผ่าน" (PASSED)
      // =========================================================
      if (status === InstructorReviewStatus.PASSED) {

        await this.thesisRepository.update(thesis.thesis_id, {
          status: ThesisStatus.PASSED,
          approved_submission: submission
        });

        // Create/Update ThesisDocument
        let pdfDoc = await this.thesisDocumentRepository.findOne({
          where: {
            thesis: { thesis_id: thesis.thesis_id },
            document_type: DocumentType.FULL_THESIS_PDF,
            course_type: thesis.course_type
          }
        });

        if (!pdfDoc) {
          pdfDoc = this.thesisDocumentRepository.create({
            thesis: thesisRef,
            document_type: DocumentType.FULL_THESIS_PDF,
            course_type: thesis.course_type
          });
        }

        // อัปเดตข้อมูลไฟล์
        pdfDoc.file_url = submission.fileUrl;
        pdfDoc.file_name = submission.fileName;
        pdfDoc.file_size = submission.fileSize;
        pdfDoc.mime_type = submission.mimeType;
        pdfDoc.storagePath = submission.storagePath;

        await this.thesisDocumentRepository.save(pdfDoc);

        this.logger.log(`Synced PDF for ${thesis.course_type} - Thesis ${thesis.thesis_code}`);
      }

      // =========================================================
      // CASE B: ไม่ผ่าน
      // =========================================================
      else {
        if (thesis.approved_submission?.submissionId === submission.submissionId) {

          await this.thesisRepository.update(thesis.thesis_id, {
            status: ThesisStatus.IN_PROGRESS,
            approved_submission: null
          });

          // ลบไฟล์ (ลบเฉพาะของวิชานั้นๆ ไม่ไปยุ่งกับไฟล์วิชาอื่น)
          await this.thesisDocumentRepository.delete({
            thesis: { thesis_id: thesis.thesis_id },
            document_type: DocumentType.FULL_THESIS_PDF,
            course_type: thesis.course_type
          });
        }
      }
    }

    // ตัด Loop ก่อนส่งกลับ
    if (savedReport.submission) {
      // @ts-ignore
      delete savedReport.submission.thesis;
    }

    return savedReport;
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
    const lastAttempt = await this.reportFileRepository.count({
      where: { submission_id: result.submission_id }
    });

    const reportFile = this.reportFileRepository.create({
      submission_id: result.submission_id,
      attempt_number: lastAttempt + 1,
      file_url: result.result_file_url || '',
      csv_url: result.result_csv_url ?? null,
      file_name: result.result_file_name || '',
      file_type: 'pdf',
      file_size: result.result_file_size || 0,

      verification_status: verificationStatus,

      review_status: InstructorReviewStatus.PENDING,
      started_at: result.start_time ? new Date(result.start_time) : null,
    });

    return this.reportFileRepository.save(reportFile);
  }

  async markAsFailed(
    submissionId: number,
    errorMessage: string,
    status: VerificationResultStatus = VerificationResultStatus.ERROR,
    startTime?: string
  ): Promise<ReportFile> {
    const lastAttempt = await this.reportFileRepository.count({
      where: { submission_id: submissionId }
    });
    const reportFile = this.reportFileRepository.create({
      submission_id: submissionId,
      attempt_number: lastAttempt + 1,
      file_url: '',
      file_name: '',
      file_type: 'error',
      comment: errorMessage,

      verification_status: status,

      review_status: InstructorReviewStatus.PENDING,
      started_at: startTime ? new Date(startTime) : null,
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
      const pdfUrls = await this.fileUrlService.generateSignedUrls(item.file_url, item.file_name);
      let csvUrls: { url: string; downloadUrl: string } | null = null;
      if (item.csv_url) {
        const csvName = item.file_name.replace('.pdf', '.csv');
        csvUrls = await this.fileUrlService.generateSignedUrls(item.csv_url, csvName);
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
      const pdfUrls = await this.fileUrlService.generateSignedUrls(report.file_url, report.file_name);

      let csvUrls = { url: report.csv_url, downloadUrl: report.csv_url };
      if (report.csv_url && !report.csv_url.startsWith('http')) {
        const csvName = report.file_name.replace('.pdf', '.csv');
        csvUrls = await this.fileUrlService.generateSignedUrls(report.csv_url, csvName);
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

  // ==========================================
  // UPDATE CSV (จากหน้า Thesis Validator)
  // ==========================================
  async updateReportCsv(reportFileId: number, csvContent: string): Promise<ReportFile> {
    const reportFile = await this.reportFileRepository.findOne({
      where: { report_file_id: reportFileId }
    });

    if (!reportFile) {
      throw new NotFoundException(`ReportFile with ID ${reportFileId} not found`);
    }

    // 1. แปลง String เป็น Buffer พร้อมใส่ BOM (\ufeff) เพื่อให้ Excel อ่านภาษาไทยได้
    const buffer = Buffer.from('\ufeff' + csvContent, 'utf-8');

    // 2. สร้างไฟล์จำลอง (Mock) ให้ตรงกับ Interface ของ Express.Multer.File
    const originalName = reportFile.file_name ? reportFile.file_name.replace('.pdf', '.csv') : 'report.csv';
    const mockFile = {
      originalname: originalName,
      buffer: buffer,
      size: buffer.length,
      mimetype: 'text/csv',
    } as Express.Multer.File;

    try {
      let uploadFolder = 'reports/csv'; // ตั้งค่าเริ่มต้นเผื่อไว้

      if (reportFile.csv_url) {
        let oldFileKey = reportFile.csv_url;

        // แกะ URL เต็มให้เหลือแค่ Object Key
        if (oldFileKey.startsWith('http')) {
          try {
            const urlObj = new URL(oldFileKey);
            let rawPath = decodeURIComponent(urlObj.pathname);
            if (rawPath.startsWith('/')) rawPath = rawPath.substring(1);

            const markers = ['reports/', 'submissions/'];
            for (const marker of markers) {
              const index = rawPath.indexOf(marker);
              if (index !== -1) {
                oldFileKey = rawPath.substring(index);
                break;
              }
            }
          } catch (e) {
            this.logger.warn(`Could not parse old CSV URL: ${oldFileKey}`);
          }
        }

        // หาโฟลเดอร์ของไฟล์เดิม (ตัดชื่อไฟล์ทิ้ง เอาแค่ Path)
        const lastSlashIndex = oldFileKey.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
          uploadFolder = oldFileKey.substring(0, lastSlashIndex);
        }

        // สั่งลบไฟล์เดิมใน Storage
        await this.storageService.deleteFile(oldFileKey).catch(err => {
          this.logger.warn(`Could not delete old CSV file: ${err.message}`);
        });
      }

      // 4. อัปโหลดไฟล์ใหม่เข้าไปที่ "โฟลเดอร์เดิม" 
      const uploadResult = await this.storageService.uploadFile(mockFile, uploadFolder);

      // 5. อัปเดต Path ใหม่ลง Database (เก็บเป็น Path ตามมาตรฐานของ uploadResult)
      reportFile.csv_url = uploadResult.path;
      return await this.reportFileRepository.save(reportFile);

    } catch (error) {
      this.logger.error(`Failed to update CSV for Report ID ${reportFileId}: ${error.message}`);
      throw new Error('Failed to save CSV file to storage');
    }
  }

  // ==========================================
  // UPDATE VERIFICATION STATUS
  // ==========================================
  async updateVerificationStatus(
    reportFileId: number,
    status: VerificationResultStatus,
  ): Promise<ReportFile> {
    const reportFile = await this.reportFileRepository.findOne({
      where: { report_file_id: reportFileId },
    });

    if (!reportFile) {
      throw new NotFoundException(`ReportFile with ID ${reportFileId} not found`);
    }

    reportFile.verification_status = status;

    // หากต้องการให้เซ็ต Review Status กลับไปเป็น PENDING เมื่อมีการเปลี่ยนสถานะ Auto ตรวจใหม่ สามารถเพิ่มโค้ดด้านล่างได้
    // reportFile.review_status = InstructorReviewStatus.PENDING;

    const updatedReport = await this.reportFileRepository.save(reportFile);
    this.logger.log(`Updated Verification Status for Report ID ${reportFileId} to ${status}`);

    return updatedReport;
  }
}
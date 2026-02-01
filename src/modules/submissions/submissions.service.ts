// src/modules/submissions/submissions.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Submission } from './entities/submission.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';
import { SubmissionStatus } from './enum/submission-status.enum';
import { InspectionRound, InspectionStatus } from '../inspection_round/entities/inspection_round.entity';
import { ThesisGroup } from '../thesis-group/entities/thesis-group.entity';
import { GroupMember } from '../group-member/entities/group-member.entity';
import { GroupMemberRole } from '../group-member/enum/group-member-role.enum';
import { InvitationStatus } from '../group-member/enum/invitation-status.enum';
import type { IStorageService } from '../../common/interfaces/storage.interface';
import { STORAGE_SERVICE } from '../../common/interfaces/storage.interface';
import { Brackets } from 'typeorm';
import { GetSubmissionsFilterDto } from './dto/get-submissions-filter.dto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(InspectionRound)
    private readonly inspectionRoundRepo: Repository<InspectionRound>,
    @InjectRepository(ThesisGroup)
    private readonly thesisGroupRepo: Repository<ThesisGroup>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly configService: ConfigService,
  ) { }

  // ==========================================
  // PRIVATE HELPER: รวม Logic การสร้าง URL ไว้ที่เดียว
  // ==========================================
  private async generateFileUrls(storagePath: string, fileName: string): Promise<{ url: string; downloadUrl: string }> {
    if (!storagePath) {
      return { url: '', downloadUrl: '' };
    }

    try {
      const [url, downloadUrl] = await Promise.all([
        // 1. Preview URL (Inline) - หมดอายุ 1 ชม.
        this.storageService.getFileUrl(storagePath, 3600, false),
        // 2. Download URL (Attachment) - หมดอายุ 1 ชม.
        this.storageService.getFileUrl(storagePath, 3600, true, fileName),
      ]);

      return { url, downloadUrl };
    } catch (error) {
      this.logger.error(`Failed to generate URLs for path ${storagePath}: ${error.message}`);
      return { url: '', downloadUrl: '' };
    }
  }

  /**
   * Get status summary for polling (lightweight)
   * Returns only the count of IN_PROGRESS submissions
   */
  async getStatusSummary(): Promise<{ inProgressCount: number }> {
    const count = await this.submissionRepo.count({
      where: { status: SubmissionStatus.IN_PROGRESS },
    });
    return { inProgressCount: count };
  }

  /**
   * Create or update a submission
   */
  async createSubmission(
    dto: CreateSubmissionDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<SubmissionResponseDto> {
    // 1. Validate file
    this.validateFile(file);

    // 2. Validate user is group owner
    const groupMember = await this.validateGroupOwner(dto.groupId, userId);

    // 3. Validate inspection round is open
    const inspectionRound = await this.validateInspectionRound(dto.inspectionId);

    // 4. Get thesis group with thesis
    const group = await this.thesisGroupRepo.findOne({
      where: { group_id: dto.groupId },
      relations: ['thesis'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // 5. Check for existing submission (allow update if PENDING)
    let submission = await this.submissionRepo.findOne({
      where: {
        group: { group_id: dto.groupId },
        inspectionRound: { inspectionId: dto.inspectionId },
      },
      relations: ['group', 'inspectionRound'],
    });

    if (submission && submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException(
        'Cannot update submission. Status is not PENDING.',
      );
    }


    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    file.originalname = originalName;

    // 6. Upload file to storage
    const storagePath = `submissions/${dto.groupId}/${dto.inspectionId}`;

    // Delete old file if updating
    if (submission?.storagePath) {
      try {
        await this.storageService.deleteFile(submission.storagePath);
      } catch (error) {
        this.logger.warn(`Failed to delete old file: ${error.message}`);
      }
    }

    // อัปโหลดไฟล์ใหม่ (ตอนนี้ uploadResult.fileName จะเป็นภาษาไทยที่ถูกต้องแล้ว)
    const uploadResult = await this.storageService.uploadFile(file, storagePath);

    // 7. Create or update submission
    try {
      if (!submission) {
        submission = this.submissionRepo.create({
          group: group,
          thesis: group.thesis,
          inspectionRound: inspectionRound,
          submitter: { user_uuid: userId },
          status: SubmissionStatus.PENDING,
        });
      }

      submission.fileName = file.originalname;
      // submission.fileName = uploadResult.fileName;
      submission.fileUrl = uploadResult.url;
      submission.fileSize = uploadResult.fileSize;
      submission.mimeType = uploadResult.mimeType;
      submission.storagePath = uploadResult.path;

      const savedSubmission = await this.submissionRepo.save(submission);

      // Reload with relations
      const reloaded = await this.submissionRepo.findOne({
        where: { submissionId: savedSubmission.submissionId },
        relations: ['group', 'inspectionRound'],
      });

      if (!reloaded) {
        throw new NotFoundException('Submission not found after save');
      }

      const dtoResponse = SubmissionResponseDto.fromEntity(reloaded);

      const { url, downloadUrl } = await this.generateFileUrls(reloaded.storagePath, reloaded.fileName);

      dtoResponse.fileUrl = url;
      dtoResponse.downloadUrl = downloadUrl;

      return dtoResponse;

    } catch (error) {
      // กรณีบันทึก DB ไม่สำเร็จ ควรพิจารณาลบไฟล์ที่เพิ่งอัปโหลดขึ้น S3 ไปเพื่อไม่ให้เกิด Orphaned File
      this.logger.error(`Database save failed: ${error.message}`);
      // Optional: await this.storageService.deleteFile(uploadResult.path);
      throw error;
    }
  }

  /**
   * Get submissions by group
   */
  async getSubmissionsByGroup(groupId: string): Promise<SubmissionResponseDto[]> {
    const submissions = await this.submissionRepo.find({
      where: { group: { group_id: groupId } },
      relations: ['group', 'inspectionRound', 'submitter'],
      order: { submittedAt: 'DESC' },
    });

    // Refresh presigned URLs for all submissions
    const results = await Promise.all(
      submissions.map(async (submission) => {
        if (submission.storagePath) {
          try {
            submission.fileUrl = await this.storageService.getFileUrl(submission.storagePath);
          } catch (error) {
            this.logger.warn(`Failed to refresh URL for ${submission.storagePath}: ${error.message}`);
          }
        }
        return SubmissionResponseDto.fromEntity(submission);
      })
    );

    return results;
  }

  /**
   * Get submission by ID (Detailed View)
   */
  async getSubmissionById(submissionId: number): Promise<SubmissionResponseDto> {
    const submission = await this.submissionRepo.findOne({
      where: { submissionId },
      relations: [
        'inspectionRound',          // ข้อมูลรอบ
        'submitter',                // User คนส่ง
        'submitter.student',        // Student คนส่ง
        'thesis',                   // ข้อมูลโครงงาน
        'group',                    // ข้อมูลกลุ่ม
        'group.advisor',
        'group.advisor.instructor',
      ],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.group) {
      submission.group.members = await this.groupMemberRepo.find({ 
        where: {
          group_id: submission.group.group_id,
          invitation_status: Not(InvitationStatus.REJECTED), // Filter out REJECTED
        },
        relations: ['student'],
      });
    }

    // 1. แปลง Entity เป็น DTO ก่อน (ค่า downloadUrl จะถูก set เป็น fileUrl เริ่มต้นใน fromEntity)
    const dto = SubmissionResponseDto.fromEntity(submission);

    // 2. Override URL ถ้ามี storagePath (สร้าง Signed URL ใหม่)
    if (submission.storagePath) {
      const { url, downloadUrl } = await this.generateFileUrls(submission.storagePath, submission.fileName);
      dto.fileUrl = url;
      dto.downloadUrl = downloadUrl;
    }

    return dto;
  }

  /**
   * Get file URL (refreshed presigned URLs)
   */
  async getFileUrl(submissionId: number): Promise<{ url: string; downloadUrl: string }> {
    const submission = await this.submissionRepo.findOne({
      where: { submissionId },
    });

    if (!submission || !submission.storagePath) {
      throw new NotFoundException('File not found');
    }

    // this.logger.log(`Generated URL for ID ${submissionId}:`);
    // this.logger.log(`Preview: ${previewUrl}`);
    // this.logger.log(`Download: ${downloadUrl}`);

    return this.generateFileUrls(submission.storagePath, submission.fileName);
  }

  // =============== Validation Helpers ===============

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedMimeTypes = this.configService.get<string[]>('upload.allowedMimeTypes') || ['application/pdf'];
    const maxFileSize = this.configService.get<number>('upload.maxFileSize') || 52428800; // 50MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`,
      );
    }
  }

  /**
   * Validate user is group owner
   */
  private async validateGroupOwner(
    groupId: string,
    userId: string,
  ): Promise<GroupMember> {
    try {
      const member = await this.groupMemberRepo.findOne({
        where: {
          group_id: groupId,
          role: GroupMemberRole.OWNER,
          invitation_status: InvitationStatus.APPROVED,
        },
        relations: ['student', 'student.user'],
      });

      if (!member) {
        throw new NotFoundException('Group not found or has no owner');
      }

      if (member.student.user.user_uuid !== userId) {
        throw new ForbiddenException('Only the group owner can submit files');
      }

      return member;
    }
    catch (e) {
      throw e
    }

  }

  /**
   * Validate inspection round is open
   */
  private async validateInspectionRound(
    inspectionId: number,
  ): Promise<InspectionRound> {
    const round = await this.inspectionRoundRepo.findOne({
      where: { inspectionId },
    });

    if (!round) {
      throw new NotFoundException('Inspection round not found');
    }

    // Check if round is open
    if (round.status !== InspectionStatus.OPEN) {
      throw new BadRequestException('Inspection round is not open');
    }

    // Check if round is active
    if (!round.isActive) {
      throw new BadRequestException('Inspection round is not active');
    }

    // Check if current time is within the round period
    const now = new Date();
    if (now < round.startDate) {
      throw new BadRequestException('Inspection round has not started yet');
    }

    if (now > round.endDate) {
      throw new BadRequestException('Inspection round has ended');
    }

    return round;
  }

  /**
   * Get ALL submissions with Pagination & Filters
   */
  async getAllSubmissions(filterDto: GetSubmissionsFilterDto) {
    const {
      search,
      round,
      term,
      academicYear,
      courseType,
      status,
      page = 1,
      limit = 10
    } = filterDto;

    const skip = (page - 1) * limit;

    const query = this.submissionRepo.createQueryBuilder('submission');

    query.leftJoinAndSelect('submission.thesis', 'thesis')
      .leftJoinAndSelect('submission.inspectionRound', 'inspectionRound')
      .leftJoinAndSelect('submission.submitter', 'submitter')
      .leftJoinAndSelect('submitter.student', 'student')
      .leftJoinAndSelect('submission.group', 'group')
      .leftJoinAndSelect('submission.report_files', 'report_files');

    // --- Search Logic ---
    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('thesis.thesis_code LIKE :search', { search: `%${search}%` })
            .orWhere('thesis.thesis_name_th LIKE :search', { search: `%${search}%` })
            .orWhere('thesis.thesis_name_en LIKE :search', { search: `%${search}%` })
            .orWhere('submitter.email LIKE :search', { search: `%${search}%` })
            .orWhere('student.first_name LIKE :search', { search: `%${search}%` })
            .orWhere('student.last_name LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    // --- Filter Logic ---
    if (round) query.andWhere('inspectionRound.round_number = :round', { round });
    if (term) query.andWhere('inspectionRound.term = :term', { term });
    if (academicYear) query.andWhere('inspectionRound.academic_year = :year', { year: academicYear });

    if (courseType && courseType !== 'ALL') {
      query.andWhere('thesis.course_type = :courseType', { courseType });
    }

    if (status) {
      query.andWhere('submission.status = :status', { status });
    }

    // --- Pagination Logic ---
    query.orderBy('submission.submittedAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [result, total] = await query.getManyAndCount();

    // Transform Data with Fresh URLs
    const data = await Promise.all(result.map(async (item) => {
      const student = item.submitter.student;
      const displayName = student
        ? `${student.first_name} ${student.last_name}`.trim()
        : item.submitter.email;

      const { url, downloadUrl } = await this.generateFileUrls(item.storagePath, item.fileName);

      return {
        id: item.submissionId,

        file: {
          name: item.fileName,
          url: url || item.fileUrl,
          downloadUrl: downloadUrl || item.fileUrl,
          type: item.mimeType,
          size: this.formatBytes(item.fileSize),
        },

        uploadedBy: {
          id: item.submitter.user_uuid,
          name: displayName,
          avatar: null,
        },

        project: {
          nameTh: item.thesis.thesis_name_th,
          nameEn: item.thesis.thesis_name_en,
          code: item.thesis.thesis_code,
        },

        inspectionRound: {
          id: item.inspectionRound.inspectionId,
          title: item.inspectionRound.title,
          description: item.inspectionRound.description,
          startDate: item.inspectionRound.startDate,
          endDate: item.inspectionRound.endDate,
          courseType: item.inspectionRound.courseType
        },

        submittedAt: item.submittedAt,
        status: item.status,
        verificationCount: item.report_files?.length || 0,
        canVerify: item.status !== 'IN_PROGRESS', // Allow re-verify except when in progress
      };
    }));

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

  // Helper function แปลงขนาดไฟล์
  private formatBytes(bytes: number, decimals = 2) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async updateComment(submissionId: number, comment: string) {
    const submission = await this.submissionRepo.findOne({
      where: { submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    submission.comment = comment;
    return this.submissionRepo.save(submission);
  }

  /**
   * ส่งข้อมูลไปให้ระบบตรวจ (Verification System)
   * Triggered by: ปุ่มในหน้า UI
   */
  async sendToVerificationSystem(submissionId: number) {
    // 1. หา Submission
    const submission = await this.submissionRepo.findOne({
      where: { submissionId },
      relations: ['thesis', 'group'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // 2. (Optional) เช็คสถานะก่อนส่งตรวจ
    // if (submission.status !== SubmissionStatus.PENDING) {
    //   throw new BadRequestException('Only PENDING submissions can be verified');
    // }

    // 3. TODO: ใส่ Logic การส่งไปตรวจที่นี่ 
    // เช่น ยิง API ไปหา Python Service, หรือ Kafka, หรือแค่เปลี่ยน Status รอตรวจ
    this.logger.log(`Sending submission ID ${submissionId} to verification system...`);

    // ตัวอย่าง: อัปเดตเวลาว่ากดส่งตรวจเมื่อไหร่
    // submission.verifiedAt = new Date(); 
    // await this.submissionRepo.save(submission);

    return {
      success: true,
      message: `Submission ${submissionId} has been sent to verification queue.`,
    };
  }
}

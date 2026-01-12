import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

      submission.fileName = uploadResult.fileName;
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

      return SubmissionResponseDto.fromEntity(reloaded);

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

    return submissions.map(SubmissionResponseDto.fromEntity);
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(submissionId: number): Promise<SubmissionResponseDto> {
    const submission = await this.submissionRepo.findOne({
      where: { submissionId },
      relations: ['group', 'inspectionRound', 'submitter'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return SubmissionResponseDto.fromEntity(submission);
  }

  /**
   * Get file URL (refreshed presigned URL)
   */
  async getFileUrl(submissionId: number): Promise<{ url: string }> {
    const submission = await this.submissionRepo.findOne({
      where: { submissionId },
    });

    if (!submission || !submission.storagePath) {
      throw new NotFoundException('File not found');
    }

    const url = await this.storageService.getFileUrl(submission.storagePath);
    return { url };
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
}

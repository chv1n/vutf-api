// src/modules/dashboard/dashboard.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import * as amqp from 'amqplib';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, IsNull } from 'typeorm';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisStatus } from '../thesis/enums/course-type.enum';
import { IDashboardStats } from './dto/dashboard-stats.dto';
import { ReportFile } from '../report-file/entities/report-file.entity';
import { UserAccount } from '../users/entities/user-account.entity';
import { VerificationResultStatus } from '../report-file/enum/report-status.enum';
import { IVerificationStats, IVerificationStatsFilter } from './dto/verification-stats.dto';
import { ThesisDocument } from '../thesis/entities/thesis-document.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { ThesisGroup, ThesisGroupStatus } from '../thesis-group/entities/thesis-group.entity';
import { SubmissionStatus } from '../submissions/enum/submission-status.enum';
import { IRecentUploadsStats, IGroupRequestsStats } from './dto/recent-activities.dto';
import { InvitationStatus } from '../group-member/enum/invitation-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Thesis)
    private readonly thesisRepository: Repository<Thesis>,
    @InjectRepository(ReportFile)
    private readonly reportFileRepository: Repository<ReportFile>,
    @InjectRepository(UserAccount)
    private readonly userAccountRepository: Repository<UserAccount>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ThesisGroup)
    private readonly thesisGroupRepository: Repository<ThesisGroup>,
    @InjectRepository(ThesisDocument)
    private readonly thesisDocumentRepository: Repository<ThesisDocument>,
  ) { }

  async getDashboardStats(): Promise<IDashboardStats> {
    // 1. คำนวณวันที่ย้อนหลัง 7 วันจากเวลาปัจจุบัน
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 2. Query ข้อมูลทั้งหมดพร้อมกัน
    const [passedCount, inProgressCount, failedCount, newGroupsThisWeek] = await Promise.all([
      this.thesisRepository.count({ where: { status: ThesisStatus.PASSED } }),
      this.thesisRepository.count({ where: { status: ThesisStatus.IN_PROGRESS } }),
      this.thesisRepository.count({ where: { status: ThesisStatus.FAILED } }),
      // นับจำนวนกลุ่มที่ created_at มีค่ามากกว่าหรือเท่ากับ 7 วันที่แล้ว
      this.thesisRepository.count({
        where: {
          created_at: MoreThanOrEqual(sevenDaysAgo),
        },
      }),
    ]);

    const totalActiveGroups = passedCount + inProgressCount + failedCount;

    return {
      totalActiveGroups,
      passed: passedCount,
      inProgress: inProgressCount,
      needsAttention: failedCount,
      newFromLastWeek: newGroupsThisWeek,
    };
  }

  async getVerificationStats(filter?: IVerificationStatsFilter): Promise<IVerificationStats> {
    const { academicYear, term } = filter || {};

    // สร้าง Base Query สำหรับดึง ReportFile และ Join ไปหา submission -> inspectionRound
    const baseReportQuery = this.reportFileRepository
      .createQueryBuilder('report')
      .innerJoin('report.submission', 'submission')
      .innerJoin('submission.inspectionRound', 'inspection');

    // Filter ปี/เทอม 
    if (academicYear) {
      baseReportQuery.andWhere('inspection.academicYear = :academicYear', { academicYear: academicYear.toString() });
    }
    if (term) {
      baseReportQuery.andWhere('inspection.term = :term', { term: term.toString() });
    }

    // Query สำหรับ Storage (ดึงจากทุกไฟล์ ไม่สนใจ Filter ปี/เทอม)
    const MAX_STORAGE_BYTES = 5368709120; // 5 GB

    // ใช้ Promise.all รันทุก Query พร้อมกัน
    const [
      r1Total, r1Passed,
      r2Total, r2Passed,
      totalFiles,
      avgSpeedResult,
      activeStudents, activeInstructors, activeAdmins,
      subSizeResult, repSizeResult, docSizeResult
    ] = await Promise.all([

      // R1 Stats 
      baseReportQuery.clone().andWhere('inspection.roundNumber = 1').getCount(),
      baseReportQuery.clone().andWhere('inspection.roundNumber = 1').andWhere('report.verification_status = :status', { status: VerificationResultStatus.PASS }).getCount(),

      // R2 Stats 
      baseReportQuery.clone().andWhere('inspection.roundNumber = 2').getCount(),
      baseReportQuery.clone().andWhere('inspection.roundNumber = 2').andWhere('report.verification_status = :status', { status: VerificationResultStatus.PASS }).getCount(),

      // Total Files Processed (ในรอบปี/เทอม นั้นๆ)
      baseReportQuery.clone().getCount(),

      // Avg Speed (ในรอบปี/เทอม นั้นๆ)
      baseReportQuery.clone()
        .andWhere('report.started_at IS NOT NULL')
        .select('AVG(EXTRACT(EPOCH FROM (report.reported_at - report.started_at)))', 'avgSeconds')
        .getRawOne(),

      // Users
      this.userAccountRepository.count({ where: { role: 'student', isActive: true } }),
      this.userAccountRepository.count({ where: { role: 'instructor', isActive: true } }),
      this.userAccountRepository.count({ where: { role: 'admin', isActive: true } }),

      // Storage Queries (ทั้งหมดในระบบ)
      this.submissionRepository.createQueryBuilder('sub').select('SUM(sub.fileSize)', 'sum').getRawOne(),
      this.reportFileRepository.createQueryBuilder('rep').select('SUM(rep.file_size)', 'sum').getRawOne(),
      this.thesisDocumentRepository.createQueryBuilder('doc').select('SUM(doc.file_size)', 'sum').getRawOne(),
    ]);

    // --- การคำนวณ Storage ---
    const totalUsedBytes =
      Number(subSizeResult?.sum || 0) +
      Number(repSizeResult?.sum || 0) +
      Number(docSizeResult?.sum || 0);

    let storagePercentage = Number(((totalUsedBytes / MAX_STORAGE_BYTES) * 100).toFixed(1));
    storagePercentage = storagePercentage > 100 ? 100 : storagePercentage;

    // --- การคำนวณเปอร์เซ็นต์ส่วนอื่นๆ ---
    const calculatePercentage = (passed: number, total: number): number => {
      if (total === 0) return 0;
      return Math.round((passed / total) * 100);
    };

    const rawAvgSeconds = avgSpeedResult?.avgSeconds ? parseFloat(avgSpeedResult.avgSeconds) : 0;
    const formattedAvgSpeed = `${rawAvgSeconds.toFixed(1)}s`;

    return {
      firstPassRate: {
        total: r1Total,
        passed: r1Passed,
        percentage: calculatePercentage(r1Passed, r1Total),
      },
      secondPassRate: {
        total: r2Total,
        passed: r2Passed,
        percentage: calculatePercentage(r2Passed, r2Total),
      },
      totalFilesProcessed: totalFiles,
      avgSpeed: formattedAvgSpeed,
      storageUsed: {
        percentage: storagePercentage,
        text: `Storage: ${storagePercentage}% Used`,
      },
      users: {
        activeStudents,
        instructors: activeInstructors,
        admins: activeAdmins,
      }
    };
  }

  async getRecentUploads(): Promise<IRecentUploadsStats> {
    const [recentSubmissions, waitingCount] = await Promise.all([
      this.submissionRepository.find({
        relations: ['thesis', 'inspectionRound'],
        order: { submittedAt: 'DESC' },
        take: 4,
      }),
      this.submissionRepository.count({
        where: { status: SubmissionStatus.PENDING },
      }),
    ]);

    const mappedUploads = recentSubmissions.map((sub) => ({
      submissionId: sub.submissionId,
      thesisCode: sub.thesis?.thesis_code || 'N/A',
      thesisName: sub.thesis?.thesis_name_en || sub.thesis?.thesis_name_th || 'Unknown',
      status: sub.status,
      uploadedAt: sub.submittedAt,
      inspectionId: sub.inspectionRound?.inspectionId || null,
    }));

    return {
      waitingForVerify: waitingCount,
      items: mappedUploads,
    };
  }

  async getPendingGroupRequests(): Promise<IGroupRequestsStats> {
    // 1. สร้าง QueryBuilder เพื่อบังคับใช้ INNER JOIN
    const query = this.thesisGroupRepository
      .createQueryBuilder('group')
      .innerJoinAndSelect('group.thesis', 'thesis')
      .leftJoinAndSelect('group.created_by', 'created_by')
      .leftJoinAndSelect('created_by.student', 'student')
      .leftJoinAndSelect(
        'group.members',
        'members',
        'members.invitation_status != :rejectedStatus',
        { rejectedStatus: InvitationStatus.REJECTED }
      )
      .leftJoinAndSelect('group.advisor', 'advisor')
      .where('group.status = :status', { status: ThesisGroupStatus.PENDING });

    // 2. สั่งทำงานทั้งการดึงข้อมูล(getMany) และนับจำนวน(getCount) พร้อมกัน
    const [pendingGroups, pendingGroupCount] = await Promise.all([
      query.orderBy('group.created_at', 'DESC').take(3).getMany(),
      query.getCount(),
    ]);

    const mappedGroupRequests = pendingGroups.map((group) => {
      const student = group.created_by?.student;
      const requesterName = student
        ? `${student.first_name} ${student.last_name}`
        : 'Unknown User';

      return {
        groupId: group.group_id,
        requesterName,
        thesisName: group.thesis.thesis_name_th,
        memberCount: group.members?.length || 0,
        advisorCount: group.advisor?.length || 0,
        term: group.thesis.start_term || 1,
        academicYear: group.thesis.start_academic_year || new Date().getFullYear() + 543,
        createdAt: group.created_at,
      };
    });

    return {
      pendingCount: pendingGroupCount,
      items: mappedGroupRequests,
    };
  }

  async approveGroupRequest(groupId: string): Promise<{ success: boolean; message: string }> {
    const group = await this.thesisGroupRepository.findOne({
      where: { group_id: groupId }
    });

    if (!group) {
      throw new NotFoundException('ไม่พบข้อมูลกลุ่มโครงงานที่ต้องการอนุมัติ');
    }

    // อัปเดตสถานะเป็น APPROVED และบันทึกเวลาที่อนุมัติ
    group.status = ThesisGroupStatus.APPROVED;
    group.approved_at = new Date();

    await this.thesisGroupRepository.save(group);

    return { success: true, message: 'อนุมัติกลุ่มโครงงานสำเร็จ' };
  }

  async rejectGroupRequest(groupId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const group = await this.thesisGroupRepository.findOne({
      where: { group_id: groupId }
    });

    if (!group) {
      throw new NotFoundException('ไม่พบข้อมูลกลุ่มโครงงานที่ต้องการปฏิเสธ');
    }

    // อัปเดตสถานะเป็น REJECTED และบันทึกเหตุผล (ถ้ามี)
    group.status = ThesisGroupStatus.REJECTED;
    group.rejection_reason = reason || null;

    await this.thesisGroupRepository.save(group);

    return { success: true, message: 'ปฏิเสธกลุ่มโครงงานสำเร็จ' };
  }

  // ===========================================================================
  // ฟังก์ชันเช็คสถานะ Python Engine ผ่าน RabbitMQ
  // ===========================================================================
  async getPythonEngineStatus() {
    const startTime = Date.now();
    try {
      // ดึงข้อมูลจาก .env (ใช้ค่า default เผื่อไว้กรณีหาไฟล์ไม่เจอ)
      const user = encodeURIComponent(process.env.RABBITMQ_USER || 'guest');
      const pass = encodeURIComponent(process.env.RABBITMQ_PASSWORD || 'guest');
      const host = process.env.RABBITMQ_HOST;
      const port = process.env.RABBITMQ_PORT;
      const queueName = process.env.RABBITMQ_JOB_QUEUE || 'pdf_verification_jobs';

      // URL สำหรับเชื่อมต่อ
      const rabbitmqUrl = `amqp://${user}:${pass}@${host}:${port}`;

      const connection = await amqp.connect(rabbitmqUrl);
      const channel = await connection.createChannel();

      // ตรวจสอบคิว (passive: true คือแค่ขอดูสถานะ ไม่ได้สั่งสร้างใหม่)
      const queueInfo = await channel.assertQueue(queueName, { passive: true });

      // ตรวจเสร็จแล้วปิดการเชื่อมต่อทันที
      await connection.close();

      const latency = Date.now() - startTime;

      // ถ้ามี Consumer (ตัวรัน Python) เกาะอยู่ 1 ตัวขึ้นไป แปลว่า Online
      const isOnline = queueInfo.consumerCount > 0;

      return {
        status: isOnline ? 'online' : 'offline',
        latency: `${latency}ms`,
        activeWorkers: queueInfo.consumerCount
      };

    } catch (error) {
      // ถ้า RabbitMQ ล่ม หรือ คิวยังไม่ถูกสร้าง จะวิ่งมาเข้า Error นี้
      console.error('Failed to check Python Engine status:', error.message);
      return {
        status: 'offline',
        latency: '0ms',
        activeWorkers: 0
      };
    }
  }
}
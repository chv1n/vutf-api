// src/modules/thesis-files/thesis-files.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Not, IsNull } from 'typeorm';
import { FileNode } from './dto/file-node.dto';
import { FileUrlService } from '../../shared/services/file-url.service';
import { AuditLogService } from '../audit-log/audit-log.service';

// Entities
import { InspectionRound } from '../inspection_round/entities/inspection_round.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { ReportFile } from '../report-file/entities/report-file.entity';
import { Thesis } from '../thesis/entities/thesis.entity';
import { ThesisDocument } from '../thesis/entities/thesis-document.entity';

// Enums
import { CourseType, ThesisStatus } from '../thesis/enums/course-type.enum';
import { InstructorReviewStatus, VerificationResultStatus } from '../report-file/enum/report-status.enum';
import { SubmissionStatus } from '../submissions/enum/submission-status.enum';

// download files from S3 and stream to client
import archiver = require('archiver');
import axios from 'axios';
import { StreamableFile, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class ThesisFilesService {
  constructor(
    @InjectRepository(InspectionRound) private roundRepo: Repository<InspectionRound>,
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(ReportFile) private reportRepo: Repository<ReportFile>,
    @InjectRepository(Thesis) private thesisRepo: Repository<Thesis>,
    @InjectRepository(ThesisDocument) private thesisDocRepo: Repository<ThesisDocument>,
    private fileUrlService: FileUrlService,
    private readonly auditLogService: AuditLogService,
  ) { }

  // =================================================================
  // MAIN ENTRY POINT
  // =================================================================
  async getContents(path: string = ''): Promise<FileNode[]> {
    const cleanPath = path.replace(/^\/+|\/+$/g, '');

    if (!cleanPath) return this.getRoot();

    const parts = cleanPath.split('/');
    const rootType = parts[0];

    if (rootType === 'WIP') {
      return this.handleWIP(parts);
    } else if (rootType === 'ARCHIVE') {
      return this.handleArchive(parts);
    }

    return [];
  }

  private getRoot(): FileNode[] {
    return [
      { id: 'wip', name: 'Work In Progress (Submission & Reports)', type: 'FOLDER', path: 'WIP' },
      { id: 'archive', name: 'Archives (Final Thesis)', type: 'FOLDER', path: 'ARCHIVE' },
    ];
  }

  // =================================================================
  // WIP HANDLER
  // =================================================================
  private async handleWIP(parts: string[]): Promise<FileNode[]> {
    const depth = parts.length;

    // Level 1: Years
    if (depth === 1) {
      const years = await this.roundRepo
        .createQueryBuilder('round')
        .select('DISTINCT round.academic_year', 'year')
        .orderBy('year', 'DESC')
        .getRawMany();

      return years.map(y => ({
        id: `year-${y.year}`,
        name: `Academic Year ${y.year}`,
        type: 'FOLDER',
        path: `WIP/${y.year}`
      }));
    }

    // Level 2: Terms
    if (depth === 2) {
      const year = parts[1];
      const terms = await this.roundRepo
        .createQueryBuilder('round')
        .select('DISTINCT round.term', 'term')
        .where('round.academic_year = :year', { year })
        .orderBy('term', 'ASC')
        .getRawMany();

      return terms.map(t => ({
        id: `term-${t.term}`,
        name: `Semester ${t.term}`,
        type: 'FOLDER',
        path: `WIP/${year}/${t.term}`
      }));
    }

    // Level 3: Course Type
    if (depth === 3) {
      const prefix = parts.join('/');
      return [
        { id: 'pre', name: 'Pre-Project (ท.1)', type: 'FOLDER', path: `${prefix}/${CourseType.PRE_PROJECT}` },
        { id: 'pro', name: 'Project (ท.2)', type: 'FOLDER', path: `${prefix}/${CourseType.PROJECT}` },
      ];
    }

    // Level 4: Rounds
    if (depth === 4) {
      const [_, year, term, type] = parts;

      const rounds = await this.roundRepo.find({
        where: {
          academicYear: String(year),
          term: String(term),
          courseType: In([type as CourseType, CourseType.ALL])
        },
        order: { roundNumber: 'ASC' }
      });

      return rounds.map(r => ({
        id: `round-${r.inspectionId}`,
        name: `Round ${r.roundNumber}: ${r.title}`,
        type: 'FOLDER',
        path: `WIP/${year}/${term}/${type}/${r.roundNumber}`
      }));
    }

    // Level 5: Groups
    if (depth === 5) {
      const year = parts[1];
      const term = parts[2];
      const type = parts[3] as CourseType;
      const roundNum = Number(parts[4]);

      // 1. หารอบจริง
      const targetRound = await this.roundRepo.findOne({
        where: {
          academicYear: String(year),
          term: String(term),
          courseType: In([type, CourseType.ALL]),
          roundNumber: roundNum
        }
      });

      if (!targetRound) return [];

      // 2. Query Submission
      const query = this.submissionRepo.createQueryBuilder('submission')
        .leftJoinAndSelect('submission.group', 'group')
        .leftJoinAndSelect('group.advisor', 'advisor')
        .leftJoinAndSelect('advisor.instructor', 'instructor')
        .leftJoinAndSelect('submission.thesis', 'thesis')
        .leftJoinAndSelect('submission.submitter', 'submitter')
        .leftJoinAndSelect('submitter.student', 'student')
        .leftJoinAndSelect('submission.report_files', 'reports')
        .where('submission.inspectionRound = :roundId', { roundId: targetRound.inspectionId });

      // 3. Filter Thesis Type
      if (type !== CourseType.ALL) {
        query.andWhere('thesis.course_type = :courseType', { courseType: type });
      }

      const submissions = await query
        .orderBy('submission.submitted_at', 'DESC')
        .getMany();

      const uniqueGroups = new Map<string, any>();

      submissions.forEach(sub => {
        const student = sub.submitter?.student;

        const groupKey = sub.group ? sub.group.group_id : (student?.student_uuid || String(sub.submissionId));

        if (!uniqueGroups.has(groupKey)) {
          let advisorName = '-';
          if (sub.group?.advisor && sub.group.advisor.length > 0 && sub.group.advisor[0].instructor) {
            const { first_name, last_name } = sub.group.advisor[0].instructor;
            advisorName = `${first_name} ${last_name}`;
          }

          const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';

          const ownerName = sub.group
            ? `${studentName} (Group Representative)`
            : studentName;

          const displayCode = sub.thesis?.thesis_code || student?.student_code || '-';

          const folderName = sub.thesis
            ? `${sub.thesis.thesis_name_th}`
            : `งานของ ${ownerName}`;

          const statusInfo = this.deriveStatus(sub);

          uniqueGroups.set(groupKey, {
            id: groupKey,
            name: folderName,
            submissionId: sub.submissionId,
            advisor: advisorName,
            owner: ownerName,
            code: displayCode,
            updatedAt: sub.submittedAt,
            status: statusInfo.text,
            statusColor: statusInfo.color
          });
        }
      });

      return Array.from(uniqueGroups.values()).map(g => {
        const urlCode = encodeURIComponent(g.code !== '-' ? g.code : g.submissionId);

        return {
          id: g.id,
          name: g.name,
          type: 'FOLDER',
          path: `WIP/${parts[1]}/${parts[2]}/${parts[3]}/${parts[4]}/${urlCode}`,
          metadata: {
            isHybridView: true,
            displayStatus: g.status,
            statusColor: g.statusColor,
            advisor: g.advisor,
            owner: g.owner,
            code: g.code,
            updatedAt: g.updatedAt
          }
        };
      });
    }

    // Level 6: Split Folder (Submission / Report)
    if (depth === 6) {
      const basePath = parts.join('/');
      return [
        { id: 'sub-folder', name: 'Submission Files', type: 'FOLDER', path: `${basePath}/SUBMISSION` },
        { id: 'rep-folder', name: 'Report Files (Feedback)', type: 'FOLDER', path: `${basePath}/REPORT` },
      ];
    }

    // Level 7a: Submission File
    if (depth === 7 && parts[6] === 'SUBMISSION') {
      const code = parts[5];
      const sub = await this.findSubmissionByCode(parts[1], parts[2], parts[3], Number(parts[4]), code);

      if (!sub || (!sub.fileUrl && !sub.storagePath)) return [];

      const targetPath = sub.storagePath || sub.fileUrl;

      const signedUrls = await this.fileUrlService.generateSignedUrls(targetPath, sub.fileName);

      return [{
        id: `sub-file-${sub.submissionId}`,
        name: sub.fileName || 'submission.pdf',
        type: 'FILE',
        path: '',
        mimeType: sub.mimeType || 'application/pdf',
        size: sub.fileSize,
        url: signedUrls.url,
        downloadUrl: signedUrls.downloadUrl,
        metadata: {
          displayStatus: 'Original File',
          updatedAt: sub.submittedAt
        }
      }];
    }

    // Level 7b: Report Attempts
    if (depth === 7 && parts[6] === 'REPORT') {
      const code = parts[5];
      const sub = await this.findSubmissionByCode(parts[1], parts[2], parts[3], Number(parts[4]), code);

      if (!sub) return [];

      const reports = await this.reportRepo
        .createQueryBuilder('report')
        .select('report.attempt_number', 'attempt')
        .addSelect('report.verification_status', 'status')
        .where('report.submission_id = :sid', { sid: sub.submissionId })
        .distinctOn(['report.attempt_number'])
        .orderBy('report.attempt_number', 'ASC')
        .getRawMany();

      return reports.map(r => {
        let color: 'success' | 'warning' | 'error' | 'info' | 'default' = 'default';

        const status = r.status as VerificationResultStatus;

        if (status === VerificationResultStatus.PASS) {
          color = 'success'; // สีเขียว
        } else if (status === VerificationResultStatus.FAIL) {
          color = 'error';   // สีแดง
        } else if (status === VerificationResultStatus.ERROR) {
          color = 'warning'; // สีส้ม 
        }

        return {
          id: `attempt-${r.attempt}`,
          name: `Attempt ${r.attempt}`,
          type: 'FOLDER' as const,
          path: `WIP/${parts[1]}/${parts[2]}/${parts[3]}/${parts[4]}/${code}/REPORT/${r.attempt}`,
          metadata: {
            displayStatus: status, 
            statusColor: color     
          }
        };
      });
    }

    // Level 8: Report Files (PDF/CSV inside Attempt)
    if (depth === 8) {
      const code = parts[5];
      const attempt = Number(parts[7]);

      const sub = await this.findSubmissionByCode(parts[1], parts[2], parts[3], Number(parts[4]), code);

      if (!sub) return []; 

      const reports = await this.reportRepo.find({
        where: { submission_id: sub.submissionId, attempt_number: attempt },
        relations: ['submission']
      });

      const files: FileNode[] = [];

      for (const report of reports) {
        let originalPdfUrl = '';
        if (report.submission && (report.submission.storagePath || report.submission.fileUrl)) {
          const subPath = report.submission.storagePath || report.submission.fileUrl;
          const subUrls = await this.fileUrlService.generateSignedUrls(subPath, report.submission.fileName);
          originalPdfUrl = subUrls.url;
        }

        // PDF Result
        if (report.file_url) {
          const urls = await this.fileUrlService.generateSignedUrls(report.file_url, report.file_name);
          files.push({
            id: `rep-pdf-${report.report_file_id}`,
            name: report.file_name,
            type: 'FILE',
            path: '',
            mimeType: 'application/pdf',
            size: report.file_size,
            url: urls.url,
            downloadUrl: urls.downloadUrl,
            metadata: {
              displayStatus: report.verification_status,
              updatedAt: report.reported_at,
              submissionPdfUrl: originalPdfUrl
            }
          });
        }

        // CSV Result
        if (report.csv_url) {
          const csvName = report.file_name.replace('.pdf', '.csv');
          const urls = await this.fileUrlService.generateSignedUrls(report.csv_url, csvName);
          files.push({
            id: `rep-csv-${report.report_file_id}`,
            name: csvName,
            type: 'FILE',
            path: '',
            mimeType: 'text/csv',
            url: urls.url,
            downloadUrl: urls.downloadUrl,
            metadata: {
              displayStatus: report.verification_status,
              updatedAt: report.reported_at,
              submissionPdfUrl: originalPdfUrl
            }
          });
        }
      }
      return files;
    }

    return [];
  }

  // =================================================================
  // ARCHIVE HANDLER
  // =================================================================
  private async handleArchive(parts: string[]): Promise<FileNode[]> {
    const depth = parts.length;

    // L1: Year
    if (depth === 1) {
      const years = await this.thesisRepo
        .createQueryBuilder('thesis')
        .select('DISTINCT thesis.graduation_year', 'year')
        .where('thesis.graduation_year IS NOT NULL')
        .orderBy('year', 'DESC')
        .getRawMany();

      return years.map(y => ({
        id: `arch-year-${y.year}`,
        name: `Year ${y.year}`,
        type: 'FOLDER',
        path: `ARCHIVE/${y.year}`
      }));
    }

    // L2: Type
    if (depth === 2) {
      return [
        { id: 'arch-pre', name: 'Pre-Project', type: 'FOLDER', path: `ARCHIVE/${parts[1]}/${CourseType.PRE_PROJECT}` },
        { id: 'arch-pro', name: 'Project', type: 'FOLDER', path: `ARCHIVE/${parts[1]}/${CourseType.PROJECT}` },
      ];
    }

    // L3: Groups
    if (depth === 3) {
      const [_, year, type] = parts;
      const theses = await this.thesisRepo.find({
        where: { graduation_year: Number(year), course_type: type as CourseType },
        order: { thesis_code: 'ASC' },
        relations: ['group', 'group.advisor', 'group.advisor.instructor']
      });

      return theses.map(t => {
        let advisorName = '-';
        if (t.group?.advisor && t.group.advisor.length > 0 && t.group.advisor[0].instructor) {
          const inst = t.group.advisor[0].instructor;
          advisorName = `${inst.first_name} ${inst.last_name}`;
        }

        return {
          id: `thesis-${t.thesis_id}`,
          name: t.thesis_name_th,
          type: 'FOLDER',
          path: `ARCHIVE/${parts[1]}/${parts[2]}/${t.thesis_code}`,
          metadata: {
            isHybridView: true,
            displayStatus: t.status,
            statusColor: t.status === 'PASSED' ? 'success' : 'default',
            advisor: advisorName,
            code: t.thesis_code,
            description: t.thesis_name_en,
            updatedAt: t.created_at
          }
        };
      });
    }

    // L4: Final Files (Archive)
    if (depth === 4) {
      const year = parts[1];
      const type = parts[2] as CourseType;
      const thesisCode = parts[3];

      const thesis = await this.thesisRepo.findOne({
        where: { thesis_code: thesisCode }
      });

      if (!thesis) return [];

      const docs = await this.thesisDocRepo.find({
        where: {
          thesis: { thesis_id: thesis.thesis_id },
          course_type: type
        }
      });

      const files: FileNode[] = [];
      for (const doc of docs) {
        const targetPath = doc.storagePath || doc.file_url;
        const urls = await this.fileUrlService.generateSignedUrls(targetPath, doc.file_name);

        files.push({
          id: `doc-${doc.id}`,
          name: doc.file_name,
          type: 'FILE',
          path: '',
          mimeType: doc.mime_type,
          size: doc.file_size,
          url: urls.url,
          downloadUrl: urls.downloadUrl,
          metadata: {
            displayStatus: 'Final Document',
            updatedAt: doc.updated_at,
            submissionPdfUrl: urls.url
          }
        });
      }
      return files;
    }

    return [];
  }

  // =================================================================
  // HELPER
  // =================================================================
  private deriveStatus(submission: Submission | null): { text: string, color: 'success' | 'warning' | 'error' | 'info' | 'default' } {
    if (!submission) {
      return { text: 'Not Submitted', color: 'default' };
    }

    if (submission.reviewer) {
    }

    const reports = submission.report_files || [];
    reports.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());

    const latestReport = reports[0];

    if (latestReport) {
      const revStatus = latestReport.review_status as any;

      if (revStatus === InstructorReviewStatus.PASSED || revStatus === 'PASSED' || revStatus === 'APPROVED') {
        return { text: 'Approved', color: 'success' };
      }

      if (revStatus === 'REJECTED' || revStatus === 'FAILED') {
        return { text: 'Revision Required', color: 'warning' };
      }

      if (latestReport.verification_status === VerificationResultStatus.PASS) {
        return { text: 'Waiting for Advisor', color: 'info' };
      } else if (latestReport.verification_status === VerificationResultStatus.FAIL ||
        latestReport.verification_status === VerificationResultStatus.ERROR) {
        return { text: 'System Rejected', color: 'error' };
      } else {
        return { text: 'System Processing', color: 'default' };
      }
    }

    return { text: 'Submitted', color: 'default' };
  }

  // Helper: ค้นหา Submission จาก Code (Thesis Code หรือ Student Code) ในรอบที่กำหนด
  private async findSubmissionByCode(
    year: string,
    term: string,
    type: string,
    roundNum: number,
    code: string
  ): Promise<Submission | null> {
    const round = await this.roundRepo.findOne({
      where: {
        academicYear: year,
        term: term,
        courseType: In([type as CourseType, CourseType.ALL]),
        roundNumber: roundNum
      }
    });
    if (!round) return null;

    const query = this.submissionRepo.createQueryBuilder('submission')
      .leftJoinAndSelect('submission.thesis', 'thesis')
      .leftJoinAndSelect('submission.submitter', 'submitter')
      .leftJoinAndSelect('submitter.student', 'student')
      .where('submission.inspectionRound = :roundId', { roundId: round.inspectionId });

    const isUUID = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi.test(code);

    if (isUUID) {
      query.andWhere(
        '(thesis.thesis_code = :code OR student.student_code = :code OR student.student_uuid = :code)',
        { code }
      );
    } else {
      query.andWhere(
        '(thesis.thesis_code = :code OR student.student_code = :code)',
        { code }
      );
    }

    return query.orderBy('submission.submitted_at', 'DESC').getOne();
  }

  async search(queryText: string): Promise<FileNode[]> {
    if (!queryText || queryText.trim().length < 2) return [];

    const keyword = `%${queryText.trim()}%`;

    // ค้นหาใน Submission (WIP)
    const submissions = await this.submissionRepo.createQueryBuilder('submission')
      .leftJoinAndSelect('submission.inspectionRound', 'round')
      .leftJoinAndSelect('submission.group', 'group')
      .leftJoinAndSelect('group.advisor', 'advisor')
      .leftJoinAndSelect('advisor.instructor', 'instructor')
      .leftJoinAndSelect('submission.thesis', 'thesis')
      .leftJoinAndSelect('submission.submitter', 'submitter')
      .leftJoinAndSelect('submitter.student', 'student')
      .leftJoinAndSelect('submission.report_files', 'reports')

      // เงื่อนไขการค้นหา
      .where('thesis.thesis_name_th ILIKE :kw', { kw: keyword })
      .orWhere('thesis.thesis_name_en ILIKE :kw', { kw: keyword })
      .orWhere('thesis.thesis_code ILIKE :kw', { kw: keyword })
      .orWhere('student.first_name ILIKE :kw', { kw: keyword })
      .orWhere('student.last_name ILIKE :kw', { kw: keyword })
      .orWhere('student.student_code ILIKE :kw', { kw: keyword })

      .orderBy('submission.submitted_at', 'DESC')
      .limit(50) // กันข้อมูลเยอะเกิน
      .getMany();

    const results: FileNode[] = [];
    const processedIds = new Set<string>();

    for (const sub of submissions) {
      const student = sub.submitter?.student;
      const groupKey = sub.group ? sub.group.group_id : (student?.student_uuid || String(sub.submissionId));

      if (processedIds.has(groupKey)) continue; // เอาเฉพาะตัวล่าสุดของกลุ่มนั้นๆ
      processedIds.add(groupKey);

      // 1. Advisor Name
      let advisorName = '-';
      if (sub.group?.advisor && sub.group.advisor.length > 0 && sub.group.advisor[0].instructor) {
        const { first_name, last_name } = sub.group.advisor[0].instructor;
        advisorName = `${first_name} ${last_name}`;
      }

      // 2. Owner & Code
      const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';
      const ownerName = sub.group ? `${studentName} (Group)` : studentName;
      const displayCode = sub.thesis?.thesis_code || student?.student_code || '-';
      const folderName = sub.thesis ? `${sub.thesis.thesis_name_th}` : `งานของ ${ownerName}`;

      // 3. Status
      const statusInfo = this.deriveStatus(sub);

      // 4. สร้าง Path เต็ม เพื่อให้กดแล้ว Link ไปถูกที่
      // Format: WIP / Year / Term / Type / RoundNum / Code
      const safeCode = encodeURIComponent(displayCode !== '-' ? displayCode : sub.submissionId);
      const fullPath = `WIP/${sub.inspectionRound.academicYear}/${sub.inspectionRound.term}/${sub.inspectionRound.courseType}/${sub.inspectionRound.roundNumber}/${safeCode}`;

      results.push({
        id: groupKey,
        name: folderName,
        type: 'FOLDER', // แสดงเป็น Folder เพื่อให้กดเข้าไปดูไฟล์ข้างในได้
        path: fullPath,
        metadata: {
          isHybridView: true,
          displayStatus: statusInfo.text,
          statusColor: statusInfo.color,
          advisor: advisorName,
          owner: ownerName,
          code: displayCode,
          updatedAt: sub.submittedAt
        }
      });
    }

    return results;
  }

  // =================================================================
  // ZIP DOWNLOAD SERVICE
  // =================================================================

  async downloadZip(path: string, res: Response, user: any): Promise<void> {
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const parts = cleanPath.split('/');

    const filesToZip = await this.collectFiles(parts);

    if (filesToZip.length === 0) {
      throw new NotFoundException('No files found in this folder to zip.');
    }

    const zipName = `${parts[parts.length - 1] || 'download'}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw new BadRequestException(err.message);
    });

    archive.pipe(res);

    for (const file of filesToZip) {
      try {
        const response = await axios({
          url: file.url,
          method: 'GET',
          responseType: 'stream'
        });
        archive.append(response.data, { name: file.name });
      } catch (error) {
        console.error(`Failed to download file ${file.name}:`, error.message);
        archive.append(`Error downloading: ${file.name}`, { name: `ERROR_${file.name}.txt` });
      }
    }

    // จบการทำงาน (ส่งสัญญาณปิด Stream)
    await archive.finalize();

    // การบันทึก Log 
    try {
      await this.auditLogService.createLog(
        user.userId,
        'DOWNLOAD_ZIP',
        `ดาวน์โหลดไฟล์บีบอัด (ZIP) จากโฟลเดอร์: ${path}`,
        { type: 'FOLDER', id: path }
      );
    } catch (logError) {
      console.error('Failed to create audit log:', logError.message);
    }
  }

  // =================================================================
  // HELPER: Collect Files Logic 
  // =================================================================
  private async collectFiles(parts: string[]): Promise<{ name: string; url: string }[]> {
    const rootType = parts[0];
    const depth = parts.length;
    const filesList: { name: string; url: string }[] = [];

    // ---------------------------------------------------------
    // CASE 1: WIP (Work In Progress)
    // Path: WIP / Year / Term / Type / Round / Code / ...
    // ---------------------------------------------------------
    if (rootType === 'WIP') {

      // CASE 1.1: Download ทั้งรอบการตรวจ (Depth 5)
      // Path: WIP / Year / Term / Type / Round
      if (depth === 5) {
        const [_, year, term, type, roundNum] = parts;

        // 1. หารอบการตรวจ
        const round = await this.roundRepo.findOne({
          where: {
            academicYear: year, term: term,
            courseType: In([type as CourseType, CourseType.ALL]),
            roundNumber: Number(roundNum)
          }
        });

        if (!round) return [];

        // 2. หา Submission ทั้งหมดในรอบนั้น
        const submissions = await this.submissionRepo.find({
          where: {
            inspectionRound: { inspectionId: round.inspectionId },
            thesis: {
              course_type: type as CourseType
            }
          },
          relations: ['submitter', 'submitter.student', 'thesis', 'report_files']
        });

        if (submissions.length === 0) {
          return [];
        }

        // 3. Loop เก็บไฟล์ของทุกคน
        for (const sub of submissions) {
          const studentCode = sub.thesis?.thesis_code || sub.submitter?.student?.student_code || sub.submissionId;
          const folderPrefix = `${studentCode}`;

          // เก็บ Submission File
          if (sub.storagePath || sub.fileUrl) {
            let targetPath = sub.storagePath || sub.fileUrl;
            if (targetPath.startsWith('submissions/submissions/')) targetPath = targetPath.replace('submissions/submissions/', 'submissions/');

            const urls = await this.fileUrlService.generateSignedUrls(targetPath, sub.fileName);
            filesList.push({
              name: `${folderPrefix}/SUBMISSION/${sub.fileName}`,
              url: urls.url
            });
          }

          // เก็บ Report Files
          for (const r of sub.report_files) {
            if (r.file_url) {
              const urls = await this.fileUrlService.generateSignedUrls(r.file_url, r.file_name);
              filesList.push({ name: `${folderPrefix}/REPORT/Attempt_${r.attempt_number}/${r.file_name}`, url: urls.url });
            }
            if (r.csv_url) {
              const csvName = r.file_name.replace('.pdf', '.csv');
              const urls = await this.fileUrlService.generateSignedUrls(r.csv_url, csvName);
              filesList.push({ name: `${folderPrefix}/REPORT/Attempt_${r.attempt_number}/${csvName}`, url: urls.url });
            }
          }
        }
      }

      // CASE 1.2: Download ทั้งโฟลเดอร์ของนักศึกษา (Depth 6)
      // Path: WIP / ... / Code
      else if (depth === 6) {
        const code = parts[5];
        const sub = await this.findSubmissionByCode(parts[1], parts[2], parts[3], Number(parts[4]), code);

        if (sub) {
          // 1. Submission File
          if (sub.storagePath || sub.fileUrl) {
            let targetPath = sub.storagePath || sub.fileUrl;
            if (targetPath.startsWith('submissions/submissions/')) targetPath = targetPath.replace('submissions/submissions/', 'submissions/');

            const urls = await this.fileUrlService.generateSignedUrls(targetPath, sub.fileName);
            filesList.push({
              name: `SUBMISSION/${sub.fileName}`,
              url: urls.url
            });
          }

          // 2. Report Files (All Attempts)
          const reports = await this.reportRepo.find({ where: { submission_id: sub.submissionId } });
          for (const r of reports) {
            if (r.file_url) {
              const urls = await this.fileUrlService.generateSignedUrls(r.file_url, r.file_name);
              filesList.push({ name: `REPORT/Attempt_${r.attempt_number}/${r.file_name}`, url: urls.url });
            }
            if (r.csv_url) {
              const csvName = r.file_name.replace('.pdf', '.csv');
              const urls = await this.fileUrlService.generateSignedUrls(r.csv_url, csvName);
              filesList.push({ name: `REPORT/Attempt_${r.attempt_number}/${csvName}`, url: urls.url });
            }
          }
        }
      }

      // CASE 1.3: Download เฉพาะ SUBMISSION Folder (Depth 7)
      else if (depth === 7 && parts[6] === 'SUBMISSION') {
        const code = parts[5];
        const sub = await this.findSubmissionByCode(parts[1], parts[2], parts[3], Number(parts[4]), code);

        if (sub && (sub.storagePath || sub.fileUrl)) {
          let targetPath = sub.storagePath || sub.fileUrl;
          if (targetPath.startsWith('submissions/submissions/')) targetPath = targetPath.replace('submissions/submissions/', 'submissions/');

          const urls = await this.fileUrlService.generateSignedUrls(targetPath, sub.fileName);
          filesList.push({ name: sub.fileName, url: urls.url });
        }
      }

      // CASE 1.4: Download REPORT Folder (Depth 7, 8)
      else if (parts[6] === 'REPORT') {
        const code = parts[5];
        const sub = await this.findSubmissionByCode(parts[1], parts[2], parts[3], Number(parts[4]), code);
        if (!sub) return [];

        let reports: ReportFile[] = [];
        // Depth 8: Specific Attempt
        if (depth === 8) {
          const attempt = Number(parts[7]);
          reports = await this.reportRepo.find({ where: { submission_id: sub.submissionId, attempt_number: attempt } });
        }
        // Depth 7: All Reports
        else if (depth === 7) {
          reports = await this.reportRepo.find({ where: { submission_id: sub.submissionId } });
        }

        for (const r of reports) {
          const prefix = depth === 7 ? `Attempt_${r.attempt_number}/` : ''; // ถ้าโหลดรวม ให้แยก Folder Attempt
          if (r.file_url) {
            const urls = await this.fileUrlService.generateSignedUrls(r.file_url, r.file_name);
            filesList.push({ name: `${prefix}${r.file_name}`, url: urls.url });
          }
          if (r.csv_url) {
            const csvName = r.file_name.replace('.pdf', '.csv');
            const urls = await this.fileUrlService.generateSignedUrls(r.csv_url, csvName);
            filesList.push({ name: `${prefix}${csvName}`, url: urls.url });
          }
        }
      }
    }

    // ---------------------------------------------------------
    // CASE 2: ARCHIVE
    // ---------------------------------------------------------
    else if (rootType === 'ARCHIVE') {
      console.log(`[ZIP Archive] Requesting path: ${parts.join('/')} (Depth: ${depth})`);

      // CASE 2.1: Download Entire Year (Depth 2)
      // Path: ARCHIVE / Year
      if (depth === 2) {
        const year = parts[1];
        console.log(`[ZIP Archive] Processing Year: ${year}`);

        // Find ALL passed theses for this year (regardless of type)
        const theses = await this.thesisRepo.find({
          where: {
            graduation_year: Number(year),
            status: ThesisStatus.PASSED
          }
        });
        console.log(`[ZIP Archive] Found ${theses.length} theses for year ${year}`);

        for (const t of theses) {
          // Get documents for each thesis
          // Note: A thesis might have documents for multiple course types, so we get them all or filter if needed.
          // Here we get all documents associated with the thesis.
          const docs = await this.thesisDocRepo.find({
            where: { thesis: { thesis_id: t.thesis_id } }
          });

          for (const doc of docs) {
            let targetPath = doc.storagePath || doc.file_url;
            if (!targetPath) continue;
            if (targetPath.startsWith('submissions/submissions/')) targetPath = targetPath.replace('submissions/submissions/', 'submissions/');

            try {
              const urls = await this.fileUrlService.generateSignedUrls(targetPath, doc.file_name);
              // Structure: Type / ThesisCode / Filename
              filesList.push({
                name: `${doc.course_type}/${t.thesis_code}/${doc.file_name}`,
                url: urls.url
              });
            } catch (e) { console.error(`Error processing ${doc.file_name}`, e); }
          }
        }
      }

      // CASE 2.2: Download Specific Type in Year (Depth 3)
      // Path: ARCHIVE / Year / Type
      else if (depth === 3) {
        const year = parts[1];
        const type = parts[2] as CourseType;
        console.log(`[ZIP Archive] Processing Type: ${type} in Year ${year}`);

        const theses = await this.thesisRepo.find({
          where: {
            graduation_year: Number(year),
            course_type: type,
            status: ThesisStatus.PASSED
          }
        });
        console.log(`[ZIP Archive] Found ${theses.length} theses`);

        for (const t of theses) {
          const docs = await this.thesisDocRepo.find({
            where: { thesis: { thesis_id: t.thesis_id }, course_type: type }
          });

          for (const doc of docs) {
            let targetPath = doc.storagePath || doc.file_url;
            if (!targetPath) continue;
            if (targetPath.startsWith('submissions/submissions/')) targetPath = targetPath.replace('submissions/submissions/', 'submissions/');

            try {
              const urls = await this.fileUrlService.generateSignedUrls(targetPath, doc.file_name);
              filesList.push({
                name: `${t.thesis_code}/${doc.file_name}`,
                url: urls.url
              });
            } catch (e) { console.error(`Error processing ${doc.file_name}`, e); }
          }
        }
      }

      // CASE 2.3: Download Single Thesis (Depth 4)
      // Path: ARCHIVE / Year / Type / Code
      else if (depth === 4) {
        const type = parts[2] as CourseType;
        const code = parts[3];
        console.log(`[ZIP Archive] Processing Thesis Code: ${code}`);

        const thesis = await this.thesisRepo.findOne({ where: { thesis_code: code } });

        if (thesis) {
          const docs = await this.thesisDocRepo.find({
            where: { thesis: { thesis_id: thesis.thesis_id }, course_type: type }
          });
          console.log(`[ZIP Archive] Found ${docs.length} documents`);

          for (const doc of docs) {
            let targetPath = doc.storagePath || doc.file_url;
            if (!targetPath) continue;
            if (targetPath.startsWith('submissions/submissions/')) targetPath = targetPath.replace('submissions/submissions/', 'submissions/');

            const urls = await this.fileUrlService.generateSignedUrls(targetPath, doc.file_name);
            filesList.push({ name: doc.file_name, url: urls.url });
          }
        } else {
          console.warn(`[ZIP Archive] Thesis code ${code} not found.`);
        }
      }
    }

    return filesList;
  }

  async getDashboardStats() {
    // สถิติ Submission 
    const totalSubmissions = await this.submissionRepo.count();
    const pendingInspection = await this.submissionRepo.count({
      where: { status: SubmissionStatus.PENDING }
    });

    // สถิติ Report แยกประเภทไฟล์ (PDF/CSV)
    const reportPdf = await this.reportRepo.count({
      where: { file_url: Not(IsNull()) }
    });
    const reportCsv = await this.reportRepo.count({
      where: { csv_url: Not(IsNull()) }
    });

    // สถิติ Archive (เล่มจบในคลัง)
    const totalArchive = await this.thesisDocRepo.count();

    // สถิติไฟล์รวมทั้งหมด
    const totalFiles = totalSubmissions + reportPdf + reportCsv + totalArchive;

    // คำนวณพื้นที่การใช้งานจริง (รวมไฟล์ทุกประเภท)
    // หมายเหตุ: Submission ใช้ fileSize ส่วนตารางอื่นใช้ file_size
    const subSize = await this.submissionRepo
      .createQueryBuilder('sub')
      .select('SUM(COALESCE(sub.fileSize, 0))', 'sum')
      .getRawOne();

    const reportSize = await this.reportRepo
      .createQueryBuilder('rep')
      .select('SUM(COALESCE(rep.file_size, 0))', 'sum')
      .getRawOne();

    const archiveSize = await this.thesisDocRepo
      .createQueryBuilder('doc')
      .select('SUM(COALESCE(doc.file_size, 0))', 'sum')
      .getRawOne();

    const totalUsed = Number(subSize.sum || 0) +
      Number(reportSize.sum || 0) +
      Number(archiveSize.sum || 0);

    return {
      totalFiles,
      totalSubmissions,
      pendingInspection,
      reports: {
        pdf: reportPdf,
        csv: reportCsv,
        total: reportPdf + reportCsv
      },
      totalArchive,
      storageUsed: totalUsed,
      storageLimit: 5 * 1024 * 1024 * 1024,
    };
  }
}
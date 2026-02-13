// src/modules/export-file/export-file.service.ts
import { Injectable } from '@nestjs/common';
import { TrackThesisService } from '../track-thesis/track-thesis.service';
import { ReportFileService } from '../report-file/report-file.service';
import { GetUnsubmittedFilterDto } from '../track-thesis/dto/get-unsubmitted-filter.dto';
import { ReportFileResponseDto } from '../report-file/dto/report-file-response.dto';
import { VerificationResultStatus, InstructorReviewStatus } from '../report-file/enum/report-status.enum';
import { SubmissionStatus } from '../submissions/enum/submission-status.enum';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportFileService {
  private readonly styles = {
    colors: {
      primary: '1E293B',    // Slate 800 (Header Text)
      headerBg: 'F1F5F9',   // Slate 100 (Header Background)
      border: 'CBD5E1',     // Slate 300
      zebra: 'F8FAFC',      // Slate 50
      success: '10B981',    // Green (Pass)
      danger: 'EF4444',     // Red (Fail)
      info: '3B82F6',       // Blue (Stats)
    },
    border: {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    } as ExcelJS.Borders,
    font: { name: 'Sarabun', size: 11 },
  };

  constructor(
    private readonly trackService: TrackThesisService,
    private readonly reportService: ReportFileService,
  ) { }

  async exportMasterReport(filter: GetUnsubmittedFilterDto, res: any) {
    const workbook = new ExcelJS.Workbook();
    const now = new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    });

    const [unsubmitted, submitted, reports] = await Promise.all([
      this.trackService.getUnsubmittedGroups({ ...filter, isExport: true }),
      this.trackService.getSubmittedGroups({ ...filter, isExport: true }),
      this.reportService.getAllReports({ ...filter, limit: 1000 } as any),
    ]);

    const meta = unsubmitted.meta as any;
    const stats = meta?.stats || { totalGroups: 0, submitted: 0, unsubmitted: 0 };
    const ctx = meta?.filterContext || { academicYear: '-', term: '-', roundNumber: '-' };

    this.createUnsubmittedSheet(workbook, unsubmitted.data, stats, ctx, now);
    this.createSubmittedSheet(workbook, submitted.data, ctx, now);
    this.createVerificationSheet(workbook, reports.data, ctx, now);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const filename = `Thesis_Master_Report_${ctx.academicYear}_${ctx.term}_Round${ctx.roundNumber}_${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);

    await workbook.xlsx.write(res);
    res.end();
  }

  // ==========================================
  // SHEET 1: UNSUBMITTED (เน้นความชัดเจนของกลุ่มที่ตามงาน)
  // ==========================================
  private createUnsubmittedSheet(wb: ExcelJS.Workbook, data: any[], stats: any, ctx: any, dateStr: string) {
    const sheet = wb.addWorksheet('1. ยังไม่ส่ง');

    // ตั้งค่า Columns ก่อนเพื่อให้ Layout ถูกต้อง (8 คอลัมน์)
    // A=ลำดับ, B=ปี/เทอม, C=รหัส, D=ประเภท, E=หัวข้อ, F=สมาชิก, G=ที่ปรึกษา, H=กำหนดส่ง
    sheet.columns = [
      { width: 8 }, { width: 12 }, { width: 15 }, { width: 12 },
      { width: 45 }, { width: 35 }, { width: 30 }, { width: 18 }
    ];

    // --- ส่วนหัวกระดาษ (Header) ---
    // Override Standard Layout เพื่อ Merge A-H
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'รายงานกลุ่มที่ยังไม่ส่งงาน (UNSUBMITTED)';
    titleCell.font = { bold: true, size: 16, color: { argb: '1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('A2:H2');
    const subCell = sheet.getCell('A2');
    subCell.value = `ปีการศึกษา ${ctx.academicYear}/${ctx.term} | รอบที่ ${ctx.roundNumber} | ข้อมูล ณ วันที่ ${dateStr}`;
    subCell.font = { size: 11, color: { argb: '64748B' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.getRow(1).height = 35;
    sheet.getRow(2).height = 25;

    // --- 1. คำนวณสถิติ ---
    const total = stats.totalGroups || 0;
    const submitted = stats.submitted || 0;
    const unsubmitted = stats.unsubmitted || 0;
    const rate = total > 0 ? (submitted / total) : 0;

    // --- 2. วาดตาราง EXECUTIVE SUMMARY ---
    sheet.mergeCells('A4:H4');
    const summaryTitle = sheet.getCell('A4');
    summaryTitle.value = '📊 EXECUTIVE SUMMARY (สรุปสถิติการส่งงาน)';
    summaryTitle.font = { bold: true, color: { argb: '1E293B' } };
    summaryTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    summaryTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryTitle.border = this.styles.border;

    // Header สถิติ
    const statsHeaders = ['Total Groups', 'Submitted', 'Unsubmitted', 'Completion Rate'];
    // Layout: Total(A-B), Submitted(C-D), Unsubmitted(E-F), Rate(G-H)
    const headerRanges = ['A5:B5', 'C5:D5', 'E5:F5', 'G5:H5'];

    statsHeaders.forEach((text, idx) => {
      sheet.mergeCells(headerRanges[idx]);
      const cell = sheet.getCell(headerRanges[idx].split(':')[0]);
      cell.value = text;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      cell.border = this.styles.border;
    });

    // ข้อมูลสถิติ
    const statsValues = [total, submitted, unsubmitted, rate];
    const valueRanges = ['A6:B6', 'C6:D6', 'E6:F6', 'G6:H6'];

    statsValues.forEach((val, idx) => {
      sheet.mergeCells(valueRanges[idx]);
      const cell = sheet.getCell(valueRanges[idx].split(':')[0]);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: true, size: 12 };
      cell.border = this.styles.border;

      // ใส่สีตัวเลข
      if (idx === 1 && val > 0) cell.font = { color: { argb: this.styles.colors.success }, bold: true, size: 12 }; // Submitted (Green)
      if (idx === 2 && val > 0) cell.font = { color: { argb: this.styles.colors.danger }, bold: true, size: 12 };  // Unsubmitted (Red)
      if (idx === 3) {
        cell.numFmt = '0.00%';
        cell.font = { color: { argb: rate >= 0.8 ? '10B981' : 'F59E0B' }, bold: true, size: 12 };
      }
    });

    // --- 3. ตารางข้อมูลหลัก ---
    const headers = ['ลำดับ', 'ปี/เทอม', 'รหัสวิชา', 'ประเภท', 'หัวข้อวิทยานิพนธ์', 'สมาชิกกลุ่ม (รหัส)', 'ที่ปรึกษา', 'กำหนดส่ง'];
    this.createTableHeader(sheet, 8, headers);

    data.forEach((item, i) => {
      const row = sheet.addRow([
        i + 1,
        `${ctx.academicYear}/${ctx.term}`,
        item.thesisCode,
        item.courseType || '-',
        item.thesisTitleTh,
        item.groupMembers.map(m => `${m.name} (${m.studentCode})`).join('\n'),
        item.advisors.map(a => `${a.name} (${a.role})`).join('\n'),
        item.missingContext?.deadline ? new Date(item.missingContext.deadline).toLocaleDateString('th-TH', {
          year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Bangkok'
        }) : '-'
      ]);
      this.applyRowStyle(row, i);

      // เน้นสีแดงที่วันกำหนดส่ง เพื่อให้รู้ว่าเลยกำหนดหรือยัง
      if (item.missingContext?.isOverdue) {
        row.getCell(8).font = { color: { argb: this.styles.colors.danger }, bold: true };
      }
    });
  }


  // ==========================================
  // SHEET 2: SUBMITTED (เน้นเวลาที่ส่งและสถานะ)
  // ==========================================
  private createSubmittedSheet(wb: ExcelJS.Workbook, data: any[], ctx: any, dateStr: string) {
    const sheet = wb.addWorksheet('2. ส่งแล้ว');
    this.applyStandardLayout(sheet, 'รายงานกลุ่มที่ส่งงานแล้ว (SUBMITTED)', ctx, dateStr);

    // --- 1. คำนวณสถิติแยกตาม Status Enum ---
    const totalSubmitted = data.length;
    const stats = {
      completed: 0,
      inProgress: 0,
      pending: 0,
      failed: 0
    };

    data.forEach(item => {
      const status = item.submission?.status;
      switch (status) {
        case SubmissionStatus.COMPLETED: stats.completed++; break;
        case SubmissionStatus.IN_PROGRESS: stats.inProgress++; break;
        case SubmissionStatus.PENDING: stats.pending++; break;
        case SubmissionStatus.FAILED: stats.failed++; break;
      }
    });

    // คำนวณ Completion Rate
    const completionRate = totalSubmitted > 0 ? (stats.completed / totalSubmitted) : 0;

    // --- 2. วาดตาราง EXECUTIVE SUMMARY ---
    sheet.mergeCells('A4:H4');
    const summaryTitle = sheet.getCell('A4');
    summaryTitle.value = '📊 EXECUTIVE SUMMARY (สรุปสถานะการดำเนินการ)';
    summaryTitle.font = { bold: true, color: { argb: '1E293B' } };
    summaryTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    summaryTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryTitle.border = this.styles.border;

    // Header ย่อย (เพิ่ม Completion Rate)
    const statsHeaders = ['Total Submitted', 'Completed', 'In Progress', 'Pending', 'Failed', 'Completion Rate'];

    // A-B(Total), C(Completed), D(InProg), E(Pending), F(Failed), G-H(Rate)
    const headerRanges = ['A5:B5', 'C5', 'D5', 'E5', 'F5', 'G5:H5'];

    statsHeaders.forEach((text, idx) => {
      const range = headerRanges[idx];
      if (range.includes(':')) sheet.mergeCells(range);
      const cell = sheet.getCell(range.split(':')[0]);
      cell.value = text;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      cell.border = this.styles.border;
    });

    // ข้อมูลตัวเลข
    const statsValues = [
      totalSubmitted,
      stats.completed,
      stats.inProgress,
      stats.pending,
      stats.failed,
      completionRate
    ];
    const valueRanges = ['A6:B6', 'C6', 'D6', 'E6', 'F6', 'G6:H6'];

    statsValues.forEach((val, idx) => {
      const range = valueRanges[idx];
      if (range.includes(':')) sheet.mergeCells(range);
      const cell = sheet.getCell(range.split(':')[0]);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: true, size: 12 };
      cell.border = this.styles.border;

      // ใส่สีตัวเลขตามบริบท
      if (val > 0) {
        if (idx === 1) cell.font = { color: { argb: this.styles.colors.success }, bold: true, size: 12 }; // Completed
        if (idx === 2) cell.font = { color: { argb: '3B82F6' }, bold: true, size: 12 }; // In Progress
        if (idx === 3) cell.font = { color: { argb: 'F59E0B' }, bold: true, size: 12 }; // Pending
        if (idx === 4) cell.font = { color: { argb: this.styles.colors.danger }, bold: true, size: 12 }; // Failed
      }

      // Format % สำหรับ Completion Rate
      if (idx === 5) {
        cell.numFmt = '0.00%';
        cell.font = { color: { argb: completionRate >= 0.8 ? '10B981' : 'F59E0B' }, bold: true, size: 12 };
      }
    });

    // --- 3. ตารางข้อมูลหลัก ---
    const headers = ['ลำดับ', 'รหัสวิชา', 'ประเภท', 'หัวข้อวิทยานิพนธ์', 'วันที่ส่ง', 'สถานะการตรวจ', 'ผู้ส่งงาน', 'ที่ปรึกษา'];
    this.createTableHeader(sheet, 8, headers);

    data.forEach((item, i) => {
      const row = sheet.addRow([
        i + 1,
        item.thesisCode,
        item.courseType || '-',
        item.thesisTitleTh,
        item.submission?.submittedAt ? new Date(item.submission.submittedAt).toLocaleString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Bangkok'
        }) : '-',
        item.submission?.status || 'PENDING',
        item.groupMembers.find(m => m.role === 'owner')?.name || '-',
        item.advisors.map(a => a.name).join(', ')
      ]);

      this.applyRowStyle(row, i);

      const statusCell = row.getCell(6);
      const status = item.submission?.status;

      if (status === SubmissionStatus.COMPLETED) {
        statusCell.font = { color: { argb: this.styles.colors.success }, bold: true };
      } else if (status === SubmissionStatus.FAILED) {
        statusCell.font = { color: { argb: this.styles.colors.danger }, bold: true };
      } else if (status === SubmissionStatus.IN_PROGRESS) {
        statusCell.font = { color: { argb: '3B82F6' }, bold: true };
      }
    });

    // ปรับความกว้างคอลัมน์
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 45;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 18;
    sheet.getColumn(7).width = 25;
    sheet.getColumn(8).width = 30;
  }

  // ==========================================
  // SHEET 3: SYSTEM REPORTS 
  // ==========================================
  private createVerificationSheet(wb: ExcelJS.Workbook, data: ReportFileResponseDto[], ctx: any, dateStr: string) {
    const sheet = wb.addWorksheet('3. ผลตรวจระบบ');
    this.applyStandardLayout(sheet, 'สรุปผลการตรวจวิทยานิพนธ์ (System Reports)', ctx, dateStr);

    // 1. จัดกลุ่มข้อมูลตาม Submission ID
    const groupedData = data.reduce((acc, item) => {
      const subId = item.context.submissionId;
      if (!acc[subId]) acc[subId] = [];
      acc[subId].push(item);
      return acc;
    }, {} as Record<number, ReportFileResponseDto[]>);

    // --- 2. คำนวณสถิติใหม่ (มิติกุ่ม และ มิติการตรวจ) ---
    const totalGroups = Object.keys(groupedData).length; // จำนวนกลุ่มทั้งหมด
    const totalAttempts = data.length; // จำนวนการตรวจทั้งหมด (ทุกครั้งรวมกัน)

    // นับกลุ่มที่ผ่าน (อย่างน้อย 1 ครั้งเป็น PASS)
    const passedGroups = Object.values(groupedData).filter(reports =>
      reports.some(r => r.verificationStatus === VerificationResultStatus.PASS)
    ).length;

    const failedGroups = totalGroups - passedGroups;
    const completionRate = totalGroups > 0 ? (passedGroups / totalGroups) : 0;
    const avgAttempts = totalGroups > 0 ? (totalAttempts / totalGroups) : 0; // ค่าเฉลี่ยครั้งที่ตรวจต่อกลุ่ม

    // --- 3. วาดตาราง EXECUTIVE SUMMARY (ขยายเพิ่มช่อง) ---
    sheet.mergeCells('A4:H4');
    const summaryTitle = sheet.getCell('A4');
    summaryTitle.value = '📊 EXECUTIVE SUMMARY (สรุปภาพรวมการตรวจ)';
    summaryTitle.font = { bold: true, color: { argb: '1E293B' } };
    summaryTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    summaryTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryTitle.border = this.styles.border;

    // Header สถิติ (5 หัวข้อ)
    const statsHeaders = ['Total Groups', 'Total Attempts', 'Passed Groups', 'Avg. Attempts/Group', 'Completion Rate'];
    const headerRanges = ['A5', 'B5', 'C5', 'D5:F5', 'G5:H5'];

    statsHeaders.forEach((text, idx) => {
      const range = headerRanges[idx];
      if (range.includes(':')) sheet.mergeCells(range);
      const cell = sheet.getCell(range.split(':')[0]);
      cell.value = text;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      cell.border = this.styles.border;
    });

    // ข้อมูลสถิติ
    const statsValues = [totalGroups, totalAttempts, passedGroups, avgAttempts, completionRate];
    const valueRanges = ['A6', 'B6', 'C6', 'D6:F6', 'G6:H6'];

    statsValues.forEach((val, idx) => {
      const range = valueRanges[idx];
      if (range.includes(':')) sheet.mergeCells(range);
      const cell = sheet.getCell(range.split(':')[0]);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: true, size: 12 };
      cell.border = this.styles.border;

      // จัดรูปแบบพิเศษ
      if (idx === 3) cell.numFmt = '0.0'; // Avg. Attempts (เช่น 4.0 ครั้ง)
      if (idx === 4) {
        cell.numFmt = '0.00%'; // Completion Rate
        cell.font = { color: { argb: completionRate >= 0.8 ? '10B981' : 'F59E0B' }, bold: true, size: 12 };
      }
    });

    // --- 4. ตารางข้อมูลหลัก ---
    const headers = ['ลำดับ', 'รหัสวิชา / หัวข้อวิทยานิพนธ์', 'ประเภท', 'นักศึกษา (รหัส)', 'ครั้งที่', 'วัน-เวลาที่ตรวจ', 'ผลการตรวจระบบ', 'สถานะจากอาจารย์'];
    this.createTableHeader(sheet, 8, headers);

    let currentRow = 9;
    let submissionIndex = 1;

    Object.values(groupedData).forEach((reports) => {
      // เรียงครั้งที่ล่าสุดไว้บนสุด
      reports.sort((a, b) => b.attemptNumber - a.attemptNumber);
      const startRow = currentRow;

      reports.forEach((report, index) => {
        const row = sheet.getRow(currentRow);
        row.getCell(5).value = `ครั้งที่ ${report.attemptNumber}`;
        row.getCell(6).value = report.createdAt ? new Date(report.createdAt).toLocaleString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Bangkok'
        }) : '-';
        row.getCell(7).value = report.verificationStatus;
        row.getCell(8).value = report.reviewStatus;

        if (index === 0) {
          row.getCell(1).value = submissionIndex;
          row.getCell(2).value = `${report.project?.code}\n${report.project?.nameTh}`;
          row.getCell(3).value = report.project?.courseType || '-';
          row.getCell(4).value = report.groupMembers
            .map(m => `${m.firstName} ${m.lastName} (${m.studentCode})`)
            .join('\n');
        }

        this.applyRowStyle(row, submissionIndex - 1);

        row.getCell(4).alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };

        row.getCell(5).alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };

        const vStatusCell = row.getCell(7);
        if (report.verificationStatus === VerificationResultStatus.FAIL) {
          vStatusCell.font = { color: { argb: this.styles.colors.danger }, bold: true };
        } else if (report.verificationStatus === VerificationResultStatus.PASS) {
          vStatusCell.font = { color: { argb: this.styles.colors.success }, bold: true };
        }
        currentRow++;
      });

      if (reports.length > 1) {
        sheet.mergeCells(`A${startRow}:A${currentRow - 1}`);
        sheet.mergeCells(`B${startRow}:B${currentRow - 1}`);
        sheet.mergeCells(`C${startRow}:C${currentRow - 1}`);
        sheet.mergeCells(`D${startRow}:D${currentRow - 1}`);
      }

      // ขีดเส้นแบ่งกลุ่ม Submission
      sheet.getRow(currentRow - 1).eachCell(cell => {
        cell.border = { ...this.styles.border, bottom: { style: 'medium', color: { argb: 'CBD5E1' } } };
      });

      submissionIndex++;
    });

    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 45;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 35;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(8).width = 25;
  }

  // --- Helpers สำหรับจัดรูปแบบ (Refactored for Beauty) ---

  private applyStandardLayout(sheet: ExcelJS.Worksheet, title: string, ctx: any, dateStr: string) {
    sheet.columns = [
      { width: 8 },  // ลำดับ
      { width: 15 }, // รหัสวิชา
      { width: 12 }, // ประเภท
      { width: 45 }, // หัวข้อ (กว้างขึ้น)
      { width: 35 }, // สมาชิก
      { width: 30 }, // ที่ปรึกษา
      { width: 18 }  // วันที่/กำหนดส่ง
    ];

    // Main Title
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title.toUpperCase();
    titleCell.font = { bold: true, size: 16, color: { argb: '1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Subtitle (Context)
    sheet.mergeCells('A2:H2');
    const subCell = sheet.getCell('A2');
    subCell.value = `ปีการศึกษา ${ctx.academicYear}/${ctx.term} | รอบที่ ${ctx.roundNumber} | ข้อมูล ณ วันที่ ${dateStr}`;
    subCell.font = { size: 11, color: { argb: '64748B' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.getRow(1).height = 35;
    sheet.getRow(2).height = 25;
  }

  private createTableHeader(sheet: ExcelJS.Worksheet, rowNum: number, headers: string[]) {
    const row = sheet.getRow(rowNum);
    row.values = headers;
    row.height = 25;
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.styles.colors.headerBg } };
      cell.font = { bold: true, color: { argb: this.styles.colors.primary } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = this.styles.border;
    });
  }

  private applyRowStyle(row: ExcelJS.Row, index: number) {
    const isEven = index % 2 === 0;
    row.eachCell((cell) => {
      cell.border = this.styles.border;
      cell.font = this.styles.font;

      // ปรับ Alignment ตามเนื้อหา
      if (Number(cell.col) <= 3 || Number(cell.col) >= 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      } else {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
      }

      // Zebra striping
      if (!isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.styles.colors.zebra } };
      }
    });
    row.height = 35;
  }
}
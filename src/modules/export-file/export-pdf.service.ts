// src/modules/export-file/export-pdf.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { VerificationResultStatus, InstructorReviewStatus } from '../report-file/enum/report-status.enum';
import { SubmissionStatus } from '../submissions/enum/submission-status.enum';

const PdfPrinter = require('pdfmake');

@Injectable()
export class ExportPdfService {
    private readonly logger = new Logger(ExportPdfService.name);

    private readonly fonts = {
        Sarabun: {
            // เมื่อใช้ config ด้านบน ไฟล์จะไปอยู่ที่ dist/assets/fonts/...
            normal: path.join(process.cwd(), 'dist/assets/fonts/Sarabun-Regular.ttf'),
            bold: path.join(process.cwd(), 'dist/assets/fonts/Sarabun-Bold.ttf'),
            italics: path.join(process.cwd(), 'dist/assets/fonts/Sarabun-Italic.ttf'),
            bolditalics: path.join(process.cwd(), 'dist/assets/fonts/Sarabun-BoldItalic.ttf'),
        },
    };

    private readonly printer: any;

    constructor() {
        try {
            this.printer = new PdfPrinter(this.fonts);
            this.logger.log('PDF Printer initialized successfully ✅');
        } catch (error) {
            this.logger.error('Failed to initialize PDF Printer ❌', error);
        }
    }

    // =========================================================
    // MAIN FUNCTION: Export Master PDF (All Tabs)
    // =========================================================
    async generateMasterPdf(
        unsubmitted: any,
        submitted: any,
        reports: any,
        ctx: any,
        res: any
    ) {
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'landscape', // แนวนอนเพื่อให้ตารางกว้างพอ
            defaultStyle: { font: 'Sarabun', fontSize: 10 },
            content: [
                // --- ส่วนที่ 1: Unsubmitted ---
                this.createHeader('รายงานกลุ่มที่ยังไม่ส่งงาน (UNSUBMITTED)', ctx),
                this.createUnsubmittedStats(unsubmitted.meta?.stats),
                { text: '\n' },
                this.createUnsubmittedTable(unsubmitted.data, ctx),

                // --- ส่วนที่ 2: Submitted (ขึ้นหน้าใหม่) ---
                { text: '', pageBreak: 'before' },
                this.createHeader('รายงานกลุ่มที่ส่งงานแล้ว (SUBMITTED)', ctx),
                this.createSubmittedStats(submitted.data),
                { text: '\n' },
                this.createSubmittedTable(submitted.data),

                // --- ส่วนที่ 3: Reports (ขึ้นหน้าใหม่) ---
                { text: '', pageBreak: 'before' },
                this.createHeader('สรุปผลการตรวจวิทยานิพนธ์ (SYSTEM REPORTS)', ctx),
                this.createReportStats(reports.data),
                { text: '\n' },
                this.createReportTable(reports.data),
            ],
            styles: {
                header: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
                subheader: { fontSize: 10, color: '#64748B', alignment: 'center', margin: [0, 0, 0, 10] },
                tableHeader: { bold: true, fontSize: 10, color: 'black', fillColor: '#F1F5F9', alignment: 'center' },
                statsLabel: { bold: true, fontSize: 9, fillColor: '#F8FAFC', alignment: 'center' },
                statsValue: { bold: true, fontSize: 11, alignment: 'center' },
                tableCell: { fontSize: 9 },
            },
        };

        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);

        const filename = `Thesis_Master_Report_${ctx.academicYear}_${ctx.term}_Round_${ctx.roundNumber}_${Date.now()}.pdf`;

        // ส่ง Stream กลับไปที่ Controller
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
        pdfDoc.pipe(res);
        pdfDoc.end();
    }

    // =========================================================
    // HELPER: Common Components
    // =========================================================
    private createHeader(title: string, ctx: any) {
        return [
            { text: title, style: 'header' },
            {
                text: `ปีการศึกษา ${ctx.academicYear}/${ctx.term} | รอบที่ ${ctx.roundNumber} | ข้อมูล ณ วันที่ ${new Date().toLocaleString('th-TH', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Bangkok'
                })} น.`,
                style: 'subheader'
            }
        ];
    }

    // =========================================================
    // PART 1: Unsubmitted Builders
    // =========================================================
    private createUnsubmittedStats(stats: any) {
        const total = stats?.totalGroups || 0;
        const submitted = stats?.submitted || 0;
        const unsubmitted = stats?.unsubmitted || 0;
        const rate = total > 0 ? (submitted / total) * 100 : 0;

        return {
            table: {
                widths: ['*', '*', '*', '*'],
                body: [
                    [
                        { text: 'Total Groups', style: 'statsLabel' },
                        { text: 'Submitted', style: 'statsLabel' },
                        { text: 'Unsubmitted', style: 'statsLabel' },
                        { text: 'Completion Rate', style: 'statsLabel' }
                    ],
                    [
                        { text: total, style: 'statsValue' },
                        { text: submitted, style: 'statsValue', color: 'green' },
                        { text: unsubmitted, style: 'statsValue', color: 'red' },
                        { text: `${rate.toFixed(2)}%`, style: 'statsValue' }
                    ]
                ]
            }
        };
    }

    private createUnsubmittedTable(data: any[], ctx: any) {
        return {
            table: {
                headerRows: 1,
                widths: [25, 50, 60, 45, '*', 100, 100, 60],
                body: [
                    // Header
                    [
                        { text: 'ลำดับ', style: 'tableHeader' },
                        { text: 'ปี/เทอม', style: 'tableHeader' },
                        { text: 'รหัสวิชา', style: 'tableHeader' },
                        { text: 'ประเภท', style: 'tableHeader' },
                        { text: 'หัวข้อวิทยานิพนธ์', style: 'tableHeader' },
                        { text: 'สมาชิกกลุ่ม', style: 'tableHeader' },
                        { text: 'ที่ปรึกษา', style: 'tableHeader' },
                        { text: 'กำหนดส่ง', style: 'tableHeader' },
                    ],
                    // Data
                    ...data.map((item, index) => [
                        { text: index + 1, alignment: 'center' },
                        { text: `${ctx.academicYear}/${ctx.term}`, alignment: 'center' },
                        { text: item.thesisCode || '-', alignment: 'center' },
                        { text: item.courseType || '-', alignment: 'center' },
                        { text: item.thesisTitleTh || '-' },
                        { text: item.groupMembers.map(m => `${m.name}\n(${m.studentCode})`).join('\n') },
                        { text: item.advisors.map(a => a.name).join('\n') },
                        { text: item.missingContext?.deadline ? new Date(item.missingContext.deadline).toLocaleDateString('th-TH') : '-', alignment: 'center', color: 'red' }
                    ])
                ]
            },
            layout: 'lightHorizontalLines'
        };
    }

    // =========================================================
    // PART 2: Submitted Builders
    // =========================================================
    private createSubmittedStats(data: any[]) {
        const total = data.length;
        let completed = 0, inProgress = 0, pending = 0, failed = 0;

        data.forEach(item => {
            const s = item.submission?.status;
            if (s === SubmissionStatus.COMPLETED) completed++;
            else if (s === SubmissionStatus.IN_PROGRESS) inProgress++;
            else if (s === SubmissionStatus.PENDING) pending++;
            else if (s === SubmissionStatus.FAILED) failed++;
        });

        const rate = total > 0 ? (completed / total) * 100 : 0;

        return {
            table: {
                widths: ['*', '*', '*', '*', '*', '*'],
                body: [
                    [
                        { text: 'Total', style: 'statsLabel' },
                        { text: 'Completed', style: 'statsLabel' },
                        { text: 'In Progress', style: 'statsLabel' },
                        { text: 'Pending', style: 'statsLabel' },
                        { text: 'Failed', style: 'statsLabel' },
                        { text: 'Rate', style: 'statsLabel' }
                    ],
                    [
                        { text: total, style: 'statsValue' },
                        { text: completed, style: 'statsValue', color: 'green' },
                        { text: inProgress, style: 'statsValue', color: 'blue' },
                        { text: pending, style: 'statsValue', color: '#D97706' }, // Orange
                        { text: failed, style: 'statsValue', color: 'red' },
                        { text: `${rate.toFixed(2)}%`, style: 'statsValue' }
                    ]
                ]
            }
        };
    }

    private createSubmittedTable(data: any[]) {
        return {
            table: {
                headerRows: 1,
                widths: [25, 40, 40, '*', 60, 60, 80, 100],
                body: [
                    [
                        { text: 'ลำดับ', style: 'tableHeader' },
                        { text: 'รหัสวิชา', style: 'tableHeader' },
                        { text: 'ประเภท', style: 'tableHeader' },
                        { text: 'หัวข้อวิทยานิพนธ์', style: 'tableHeader' },
                        { text: 'วันที่ส่ง', style: 'tableHeader' },
                        { text: 'สถานะ', style: 'tableHeader' },
                        { text: 'ผู้ส่งงาน', style: 'tableHeader' },
                        { text: 'ที่ปรึกษา', style: 'tableHeader' },
                    ],
                    ...data.map((item, index) => {
                        const status = item.submission?.status;
                        let statusColor = 'black';
                        if (status === SubmissionStatus.COMPLETED) statusColor = 'green';
                        else if (status === SubmissionStatus.FAILED) statusColor = 'red';
                        else if (status === SubmissionStatus.IN_PROGRESS) statusColor = 'blue';

                        return [
                            { text: index + 1, alignment: 'center' },
                            { text: item.thesisCode || '-', alignment: 'center' },
                            { text: item.courseType || '-', alignment: 'center' },
                            { text: item.thesisTitleTh || '-' },
                            { text: item.submission?.submittedAt ? new Date(item.submission.submittedAt).toLocaleDateString('th-TH') : '-', alignment: 'center' },
                            { text: status || '-', color: statusColor, bold: true, alignment: 'center' },
                            { text: item.groupMembers.find(m => m.role === 'owner')?.name || '-' },
                            { text: item.advisors.map(a => a.name).join('\n') },
                        ];
                    })
                ]
            },
            layout: 'lightHorizontalLines'
        };
    }

    // =========================================================
    // PART 3: Reports Builders (Verification)
    // =========================================================
    private createReportStats(data: any[]) {
        // Logic เดียวกับ Excel
        const grouped = data.reduce((acc, item) => {
            const id = item.context.submissionId;
            if (!acc[id]) acc[id] = [];
            acc[id].push(item);
            return acc;
        }, {});

        const totalGroups = Object.keys(grouped).length;
        const totalAttempts = data.length;
        const passedGroups = Object.values(grouped).filter((r: any[]) =>
            r.some(i => i.verificationStatus === VerificationResultStatus.PASS)
        ).length;

        const avg = totalGroups > 0 ? (totalAttempts / totalGroups) : 0;
        const rate = totalGroups > 0 ? (passedGroups / totalGroups) * 100 : 0;

        return {
            table: {
                widths: ['*', '*', '*', '*', '*'],
                body: [
                    [
                        { text: 'Total Groups', style: 'statsLabel' },
                        { text: 'Total Attempts', style: 'statsLabel' },
                        { text: 'Passed Groups', style: 'statsLabel' },
                        { text: 'Avg. Attempts', style: 'statsLabel' },
                        { text: 'Completion Rate', style: 'statsLabel' }
                    ],
                    [
                        { text: totalGroups, style: 'statsValue' },
                        { text: totalAttempts, style: 'statsValue' },
                        { text: passedGroups, style: 'statsValue', color: 'green' },
                        { text: avg.toFixed(1), style: 'statsValue' },
                        { text: `${rate.toFixed(2)}%`, style: 'statsValue' }
                    ]
                ]
            }
        };
    }

    private createReportTable(data: any[]) {
        const groupedData = data.reduce((acc, item) => {
            const subId = item.context.submissionId;
            if (!acc[subId]) acc[subId] = [];
            acc[subId].push(item);
            return acc;
        }, {});

        const body: any[] = [];

        body.push([
            { text: 'ลำดับ', style: 'tableHeader' },
            { text: 'รหัสวิชา', style: 'tableHeader' },
            { text: 'ประเภท', style: 'tableHeader' },
            { text: 'หัวข้อวิทยานิพนธ์', style: 'tableHeader' },
            { text: 'นักศึกษา', style: 'tableHeader' },
            { text: 'ครั้งที่', style: 'tableHeader' },
            { text: 'วัน-เวลาที่ตรวจ', style: 'tableHeader' },
            { text: 'ผลตรวจ', style: 'tableHeader' },
            { text: 'สถานะอาจารย์', style: 'tableHeader' },
        ]);

        let index = 1;
        Object.values(groupedData).forEach((reports: any[]) => {
            reports.sort((a, b) => b.attemptNumber - a.attemptNumber);
            const rowSpanCount = reports.length;

            reports.forEach((report, i) => {
                const isFirst = i === 0;
                const vStatusColor = report.verificationStatus === VerificationResultStatus.PASS ? 'green' : (report.verificationStatus === VerificationResultStatus.FAIL ? 'red' : 'black');

                // แปลงวันที่เป็นรูปแบบไทย (เช่น 12/02/2569 14:30)
                const checkDate = report.createdAt
                    ? new Date(report.createdAt).toLocaleString('th-TH', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                        timeZone: 'Asia/Bangkok'
                    })
                    : '-';

                body.push([
                    isFirst ? { text: index, rowSpan: rowSpanCount, alignment: 'center', margin: [0, 5] } : {},
                    isFirst ? { text: report.project?.code || '-', rowSpan: rowSpanCount, alignment: 'center', margin: [0, 5] } : {},
                    isFirst ? { text: report.project?.courseType || '-', rowSpan: rowSpanCount, alignment: 'center', margin: [0, 5] } : {},
                    isFirst ? { text: report.project?.nameTh || '-', rowSpan: rowSpanCount, margin: [0, 5] } : {},
                    isFirst ? { text: report.groupMembers.map(m => `${m.firstName} ${m.lastName}`).join(',\n'), rowSpan: rowSpanCount, margin: [0, 5] } : {},
                    { text: report.attemptNumber, alignment: 'center' },
                    { text: checkDate, alignment: 'center', fontSize: 9 },
                    { text: report.verificationStatus, color: vStatusColor, bold: true, alignment: 'center' },
                    { text: report.reviewStatus, alignment: 'center' }
                ]);
            });
            index++;
        });

        return {
            table: {
                headerRows: 1,
                widths: [25, 40, 40, '*', 100, 30, 65, 47, 63],
                body: body
            },
            layout: {
                hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1.5 : 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#CBD5E1',
                vLineColor: () => '#CBD5E1',
                paddingTop: () => 5,
                paddingBottom: () => 5,
            }
        };
    }
}
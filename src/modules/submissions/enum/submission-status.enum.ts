// src/modules/submissions/enum/submission-status.enum.ts
export enum SubmissionStatus {
    PENDING = 'PENDING',            // รอดำเนินการ (นศ submit ไฟล์เข้ามา่)
    IN_PROGRESS = 'IN_PROGRESS',    // กำลังดำเนินการ (อาจารย์กดตรวจไฟล์แล้ว)
    COMPLETED = 'COMPLETED',        // ตรวจเสร็จ (ส่ง report/feedback กลับ)
    FAILED = 'FAILED',              // ตรวจล้มเหลว หรือเกิด Error ระหว่างทาง
}

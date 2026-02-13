// src/modules/report-file/enum/report-status.enum.ts
// สถานะผลลัพธ์จาก Python (ระบบ Auto)
export enum VerificationResultStatus {
    PASS = 'PASS',          // ผ่านเกณฑ์ระบบ
    FAIL = 'FAIL',          // ไม่ผ่านเกณฑ์ระบบ
    ERROR = 'ERROR'         // ระบบตรวจทำงานผิดพลาด (เผื่อไว้)
}

// สถานะการตรวจสอบโดยอาจารย์ (คนตัดสินใจ)
export enum InstructorReviewStatus {
    PENDING = 'PENDING',        // รออาจารย์กดตรวจ
    NEEDS_REVISION = 'NEEDS_REVISION', // ต้องแก้ไข
    PASSED = 'PASSED',          // ผ่าน
    NOT_PASSED = 'NOT_PASSED'   // ไม่ผ่าน
}
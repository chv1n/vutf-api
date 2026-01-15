// src/modules/student/interfaces/student-response.interface.ts

/**
 * Interface สำหรับ response ของ Student
 */
export interface StudentResponse {
    student_uuid: string;
    student_code: string;
    prefix_name: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string;
    email: string | null;
    is_active: boolean;
    create_at: Date;
    sectionId?: number; 
    sectionName?: string;
}

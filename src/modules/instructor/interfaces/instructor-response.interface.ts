// src/modules/instructor/interfaces/instructor-response.interface.ts

/**
 * Interface สำหรับ response ของ Instructor
 */
export interface InstructorResponse {
    instructor_uuid: string;
    instructor_code: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string | null;
    is_active: boolean;
    create_at: Date;
}

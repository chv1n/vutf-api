// seed.ts
import { AppDataSource } from '../data-source';
import { UserAccount } from '../../modules/users/entities/user-account.entity';
import { Student } from '../../modules/users/entities/student.entity';
import { Instructor } from '../../modules/users/entities/instructor.entity';
import { DocConfig } from '../../modules/doc-config/entities/doc-config.entity';
import * as bcrypt from 'bcrypt';

// ตัวเลือกคำนำหน้าชื่อ (เพิ่ม/ลด ได้ตามต้องการ)
const prefixes = ['นาย', 'นางสาว'];

// ฟังก์ชันสุ่มเลือกคำนำหน้า
const getRandomPrefix = () => prefixes[Math.floor(Math.random() * prefixes.length)];

async function run() {
  const ds = await AppDataSource.initialize();

  const userRepo = ds.getRepository(UserAccount);
  const studentRepo = ds.getRepository(Student);
  const instructorRepo = ds.getRepository(Instructor);

  // ------------------------------------------
  // STUDENTS 5 คน
  // ------------------------------------------
  for (let i = 1; i <= 5; i++) {
    const email = `student${i}@example.com`;

    let existedUser = await userRepo.findOne({ where: { email } });
    if (!existedUser) {
      existedUser = await userRepo.save({
        role: 'student',
        email: email,
        passwordHash: await bcrypt.hash('password123', 10),
      });
    }

    const existedStudent = await studentRepo.findOne({
      where: { student_code: `66STU00${i}` },
    });
    if (!existedStudent) {
      await studentRepo.save({
        student_code: `66STU00${i}`,
        prefix_name: getRandomPrefix(),
        first_name: `Student${i}`,
        last_name: `Lastname${i}`,
        phone: `09000000${i}`,
        user_uuid: existedUser.user_uuid,
      });
    }
  }

  // ------------------------------------------
  // INSTRUCTORS 1–2 (มี account)
  // ------------------------------------------
  for (let i = 1; i <= 2; i++) {
    const email = `instructor${i}@example.com`;

    let existedUser = await userRepo.findOne({ where: { email } });
    if (!existedUser) {
      existedUser = await userRepo.save({
        role: 'instructor',
        email: email,
        passwordHash: await bcrypt.hash('password123', 10),
      });
    }

    const existedInstructor = await instructorRepo.findOne({
      where: { instructor_code: `TEACH00${i}` },
    });
    if (!existedInstructor) {
      await instructorRepo.save({
        instructor_code: `TEACH00${i}`,
        first_name: `Instructor${i}`,
        last_name: `Lastname${i}`,
        user_uuid: existedUser.user_uuid,
      });
    }
  }

  // ------------------------------------------
  // INSTRUCTORS 3–5 (ไม่มี user account)
  // ------------------------------------------
  for (let i = 3; i <= 5; i++) {
    const existedInstructor = await instructorRepo.findOne({
      where: { instructor_code: `TEACH00${i}` },
    });
    if (existedInstructor) continue;

    await instructorRepo.save({
      instructor_code: `TEACH00${i}`,
      first_name: `Instructor${i}`,
      last_name: `Lastname${i}`,
      user_uuid: null,
    });
  }

  // ------------------------------------------
  // ADMINS 2 คน 
  // ------------------------------------------
  for (let i = 1; i <= 2; i++) {
    const email = `admin${i}@example.com`;

    // เช็คว่ามี user นี้อยู่แล้วหรือยัง เพื่อป้องกันการสร้างซ้ำ
    let existedUser = await userRepo.findOne({ where: { email } });

    if (!existedUser) {
      await userRepo.save({
        role: 'admin',
        email: email,
        passwordHash: await bcrypt.hash('password123', 10),
        // is_active: true, // (ถ้าใน entity ตั้ง default true ไว้แล้ว ไม่ต้องใส่ก็ได้)
      });
      console.log(`Created Admin: ${email}`);
    }
  }

  // ------------------------------------------
  // DOC CONFIG (single config)
  // ------------------------------------------
  const docConfigRepo = ds.getRepository(DocConfig);
  const existingConfig = await docConfigRepo.findOne({ where: {} });

  if (!existingConfig) {
    await docConfigRepo.save({
      config: {
        margin_mm: {
          top: 38.1,
          bottom: 25.4,
          left: 38.1,
          right: 25.4,
        },
        font: {
          name: 'sarabun',
          size: 16.0,
          tolerance: 0.5,
        },
        indent_rules: {
          paragraph: 15.0,
          sub_section_num: 15.0,
          sub_section_text_1: 25.0,
          sub_section_text_2: 27.6,
          bullet_point: 25.0,
          bullet_text: 30.0,
          tolerance: 2.0,
        },
        check_list: {
          check_font: true,
          check_margin: true,
          check_section_seq: true,
          check_page_seq: false,
          check_indentation: true,
          check_spacing: false
        }
      },
    });
    console.log('Created DocConfig');
  }

  console.log('✅ Seed Completed');
  await ds.destroy();
}

run();
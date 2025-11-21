// seed.ts
import { AppDataSource } from '../data-source';
import { UserAccount } from '../../modules/users/entities/user-account.entity';
import { Student } from '../../modules/users/entities/student.entity';
import { Instructor } from '../../modules/users/entities/instructor.entity';
import * as bcrypt from 'bcrypt';

async function run() {
  const ds = await AppDataSource.initialize();

  const userRepo = ds.getRepository(UserAccount);
  const studentRepo = ds.getRepository(Student);
  const instructorRepo = ds.getRepository(Instructor);

  // ------------------------------------------
  // STUDENTS 5 คน (เช็กซ้ำด้วย email)
  // ------------------------------------------
  for (let i = 1; i <= 5; i++) {
    const email = `student${i}@example.com`;

    let existedUser = await userRepo.findOne({ where: { email } });
    if (!existedUser) {
      existedUser = await userRepo.save({
        role: 'student',
        email: email,
        password_hash: await bcrypt.hash('password123', 10),
      });
    }

    const existedStudent = await studentRepo.findOne({
      where: { student_code: `66STU00${i}` },
    });
    if (!existedStudent) {
      await studentRepo.save({
        student_code: `66STU00${i}`,
        first_name: `Student${i}`,
        last_name: `Lastname${i}`,
        phone: `09000000${i}`,
        user_id: existedUser.user_id,
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
        password_hash: await bcrypt.hash('password123', 10),
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
        user_id: existedUser.user_id,
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
      user_id: null, // ไม่มี account
    });
  }

  console.log('✅ Seed Completed');
  await ds.destroy();
}

run();

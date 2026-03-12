// seed.ts
import { AppDataSource } from '../data-source';
import { UserAccount } from '../../modules/users/entities/user-account.entity';
import { Student } from '../../modules/users/entities/student.entity';
import { Instructor } from '../../modules/users/entities/instructor.entity';
import { DocConfig } from '../../modules/doc-config/entities/doc-config.entity';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import * as bcrypt from 'bcrypt';

async function run() {
  const ds = await AppDataSource.initialize();
  console.log('🚀 Connecting to Database for Production Setup...');

  // -----------------------------------------------------------
  // 0. Check and run migrations if tables don't exist
  // -----------------------------------------------------------
  console.log('🔍 Checking database schema...');
  const tablesToCheck = ['permissions', 'thesis_documents', 'notifications', 'audit_logs', 'user_permissions'];
  const missingTables: string[] = [];
  
  for (const tableName of tablesToCheck) {
    const tableExists = await ds.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `);
    if (!tableExists[0]?.exists) {
      missingTables.push(tableName);
    }
  }
  
  if (missingTables.length > 0) {
    console.log(`⚠️ Missing tables detected: ${missingTables.join(', ')}`);
    console.log('🔄 Running migrations...');
    await ds.runMigrations();
    console.log('✅ Migrations completed.');
  } else {
    console.log('✅ All required tables exist.');
  }

  // -----------------------------------------------------------
  // 1. ล้างข้อมูลเก่าทิ้งทั้งหมด (เพื่อให้มั่นใจว่าไม่มีข้อมูล Dummy ค้าง)
  // -----------------------------------------------------------
  console.log('🧹 Cleaning all tables...');
  const entities = ds.entityMetadatas;
  for (const entity of entities) {
    const repository = ds.getRepository(entity.name);
    const tableExists = await repository.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${entity.tableName}'
      );
    `);
    if (tableExists[0]?.exists) {
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
  }
  console.log('✨ Database is now clean.');

  // -----------------------------------------------------------
  // 2. SEED PERMISSIONS (โครงสร้างสิทธิ์ที่ระบบต้องใช้)
  // -----------------------------------------------------------
  const permissionRepo = ds.getRepository(Permission);
  const permissionsToSeed = [
    { action: 'manage', resource: 'users' },
    { action: 'manage', resource: 'thesis_format' },
    { action: 'approve', resource: 'thesis_topic' },
    { action: 'manage', resource: 'inspections' },
  ];
  await permissionRepo.save(permissionsToSeed);
  console.log('✅ Permissions created.');

  // -----------------------------------------------------------
  // 3. SEED DOC CONFIG (การตั้งค่าเริ่มต้นของระบบ)
  // -----------------------------------------------------------
  const docConfigRepo = ds.getRepository(DocConfig);
  const configData = {
    margin_mm: { top: 38.1, bottom: 25.4, left: 38.1, right: 25.4 },
    font: { name: 'sarabun', size: 16.0, tolerance: 1 },
    indent_rules: {
      paragraph: 15.0,
      sub_section_num: 20.0,
      sub_section_text_1: 25.0,
      sub_section_text_2: 27.6,
      bullet_point: 25.0,
      bullet_text: 30.0,
      tolerance: 5.0,
    },
    check_list: {
      check_font: true,
      check_margin: true,
      check_section_seq: true,
      check_page_seq: true,
      check_indentation: true,
      check_spacing: false
    },
    ignored_units: [
      "m", "cm", "mm", "km", "nm", "kg", "g", "mg", "A", "mA", "kA",
      "V", "kV", "mV", "W", "kW", "MW", "Hz", "kHz", "MHz", "GHz",
      "J", "MJ", "kJ", "ºC", "K", "F", "N", "kN", "Pa", "kPa", "MPa",
      "bar", "atm", "dB", "rpm"
    ]
  };
  await docConfigRepo.save({ config: configData });
  console.log('✅ DocConfig initialized.');

  // -----------------------------------------------------------
  // 4. SEED SUPER ADMIN (บัญชีหลักบัญชีเดียว)
  // -----------------------------------------------------------
  const userRepo = ds.getRepository(UserAccount);
  
  const adminEmail = 'admin@yourdomain.com'; 
  const adminPassword = 'Password123';

  await userRepo.save({
    role: 'admin',
    email: adminEmail,
    passwordHash: await bcrypt.hash(adminPassword, 12),
    is_active: true,
  });
  
  console.log('-------------------------------------------');
  console.log(`👤 Super Admin Created: ${adminEmail}`);
  console.log('⚠️  Please change this password after first login.');
  console.log('-------------------------------------------');

  // -----------------------------------------------------------
  // 4.1 SEED STUDENTS (นักศึกษา 10 คน พร้อม UserAccount)
  // -----------------------------------------------------------
  const studentRepo = ds.getRepository(Student);
  const defaultPassword = await bcrypt.hash('Password123', 12);

  const studentsData = [
    { code: '6401010001', prefix: 'นาย', first: 'สมชาย', last: 'ใจดี', phone: '0812345671' },
    { code: '6401010002', prefix: 'นางสาว', first: 'สมหญิง', last: 'รักเรียน', phone: '0812345672' },
    { code: '6401010003', prefix: 'นาย', first: 'ปิยะ', last: 'วงศ์สกุล', phone: '0812345673' },
    { code: '6401010004', prefix: 'นางสาว', first: 'กาญจนา', last: 'แก้วมณี', phone: '0812345674' },
    { code: '6401010005', prefix: 'นาย', first: 'ธนากร', last: 'สุขสบาย', phone: '0812345675' },
    { code: '6401010006', prefix: 'นางสาว', first: 'พิมพ์ชนก', last: 'ศรีสวัสดิ์', phone: '0812345676' },
    { code: '6401010007', prefix: 'นาย', first: 'วรพล', last: 'ประเสริฐ', phone: '0812345677' },
    { code: '6401010008', prefix: 'นางสาว', first: 'นภาพร', last: 'ทองคำ', phone: '0812345678' },
    { code: '6401010009', prefix: 'นาย', first: 'อภิชาติ', last: 'มั่นคง', phone: '0812345679' },
    { code: '6401010010', prefix: 'นางสาว', first: 'จิราภรณ์', last: 'พรหมมา', phone: '0812345680' },
  ];

  for (const s of studentsData) {
    const studentUser = await userRepo.save({
      role: 'student',
      email: `${s.code}@student.vutf.ac.th`,
      passwordHash: defaultPassword,
      is_active: true,
    });

    await studentRepo.save({
      student_code: s.code,
      prefix_name: s.prefix,
      first_name: s.first,
      last_name: s.last,
      phone: s.phone,
      user_uuid: studentUser.user_uuid,
    });
  }

  console.log(`✅ ${studentsData.length} students created with user accounts.`);

  // -----------------------------------------------------------
  // 5. SEED INSTRUCTORS (ข้อมูลอาจารย์ + ผูก UserAccount 2 คนแรก)
  // -----------------------------------------------------------
  const instructorRepo = ds.getRepository(Instructor);
  const instructorNames = [
    'อาจารย์พัฒณ์รพี สุนันทพจน์',
    'ผู้ช่วยศาสตราจารย์ มาโนช ประชา',
    'ผู้ช่วยศาสตราจารย์ณัชติพงศ์ อูทอง',
    'ผู้ช่วยศาสตราจารย์ ดร.ศิริชัย เตรียมล้ำเลิศ',
    'ผู้ช่วยศาสตราจารย์ เดชรัชต์ ใจถวิล',
    'อาจารย์วีระชัย แย้มวจี',
    'ผู้ช่วยศาสตราจารย์เจษฎา อรุณฤกษ์',
    'รองศาสตราจารย์นชิรัตน์ ราชบุรี',
    'ผู้ช่วยศาสตราจารย์ สมรรถชัย จันทรัตน์',
    'อาจารย์สิทธิ รักถนอม',
    'รองศาสตราจารย์ ดร.พฤศยน นินทนาวงศา',
    'ผู้ช่วยศาสตราจารย์ ดร.ธนสิน บุญนาม',
    'ดร.ปอลิน กองสุวรรณ',
    'ผู้ช่วยศาสตราจารย์ ดร.พิชยพัชยา ศรีคร้าม',
    'ดร.พชร ศรีมุกข์',
    'ดร.อนุรักษ์ พรหมโคตร',
  ];

  // อีเมลสำหรับอาจารย์ 2 คนแรกที่จะมี UserAccount
  const instructorEmails = [
    'patrapee.s@vutf.ac.th',   // อาจารย์พัฒณ์รพี สุนันทพจน์
    'manoch.p@vutf.ac.th',     // ผู้ช่วยศาสตราจารย์ มาโนช ประชา
  ];
  const numInstructorsWithAccount = instructorEmails.length;

  for (let idx = 0; idx < instructorNames.length; idx++) {
    const full = instructorNames[idx];
    const lastSpace = full.lastIndexOf(' ');
    const first = lastSpace === -1 ? full : full.substring(0, lastSpace);
    const last = lastSpace === -1 ? '' : full.substring(lastSpace + 1);
    const code = `I${String(idx + 1).padStart(3, '0')}`;

    let userUuid: string | null = null;

    // สร้าง UserAccount ให้อาจารย์ 2 คนแรก
    if (idx < numInstructorsWithAccount) {
      const instructorUser = await userRepo.save({
        role: 'instructor',
        email: instructorEmails[idx],
        passwordHash: defaultPassword,
        is_active: true,
      });
      userUuid = instructorUser.user_uuid;
    }

    await instructorRepo.save({
      instructor_code: code,
      first_name: first,
      last_name: last,
      user_uuid: userUuid,
    });
  }

  console.log(`✅ ${instructorNames.length} instructors created (${numInstructorsWithAccount} with user accounts).`);

  console.log('🏁 Production Seed Completed.');
  await ds.destroy();
}

run().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
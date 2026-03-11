// seed.ts
import { AppDataSource } from '../data-source';
import { UserAccount } from '../../modules/users/entities/user-account.entity';
import { DocConfig } from '../../modules/doc-config/entities/doc-config.entity';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import * as bcrypt from 'bcrypt';

async function run() {
  const ds = await AppDataSource.initialize();
  console.log('🚀 Connecting to Database for Production Setup...');

  // -----------------------------------------------------------
  // 1. ล้างข้อมูลเก่าทิ้งทั้งหมด (เพื่อให้มั่นใจว่าไม่มีข้อมูล Dummy ค้าง)
  // -----------------------------------------------------------
  // console.log('🧹 Cleaning all tables...');
  // const entities = ds.entityMetadatas;
  // for (const entity of entities) {
  //   const repository = ds.getRepository(entity.name);
  //   await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
  // }
  // console.log('✨ Database is now clean.');

  // -----------------------------------------------------------
  // 2. SEED PERMISSIONS (โครงสร้างสิทธิ์ที่ระบบต้องใช้)
  // -----------------------------------------------------------
  // const permissionRepo = ds.getRepository(Permission);
  // const permissionsToSeed = [
  //   { action: 'manage', resource: 'users' },
  //   { action: 'manage', resource: 'thesis_format' },
  //   { action: 'approve', resource: 'thesis_topic' },
  //   { action: 'manage', resource: 'inspections' },
  // ];
  // await permissionRepo.save(permissionsToSeed);
  // console.log('✅ Permissions created.');

  // -----------------------------------------------------------
  // 3. SEED DOC CONFIG (การตั้งค่าเริ่มต้นของระบบ)
  // -----------------------------------------------------------
  const docConfigRepo = ds.getRepository(DocConfig);
  await docConfigRepo.clear();
  const configData = {
    font: { name: 'sarabun', size: 16.0, tolerance: 2 },
    margin_mm: { top: 38.1, bottom: 25.4, left: 38.1, right: 25.4 },
    indent_rules: {
      tolerance: 2.0,
      main_heading_num: 0.0,
      main_heading_text: 10.0,
      sub_heading_num: 10.0,
      sub_heading_text_1: 20.0,
      sub_heading_text_2: 22.5,
      sub_heading_text_3: 24.5,
      list_item_num: 15.0,
      list_item_text_1: 25.0,
      list_item_text_2: 27.6,
      bullet_point: 25.0,
      bullet_text: 30.0,
      para_indent: 10.0,
      dash_indent: 30.0,
      dash_text: 35.0,
      para_min_detect: 5.0,
      para_max_detect: 35.0
    },
    check_list: {
      check_margin: true,
      check_font: true,
      check_page_seq: true,
      check_section_seq: true,
      check_paper_size: true,
      check_spacing: true,
      check_indentation: true
    },
    ignored_units: [
      "m", "cm", "mm", "km", "nm", "kg", "g", "mg", "A", "mA", "kA",
      "V", "kV", "mV", "W", "kW", "MW", "Hz", "kHz", "MHz", "GHz",
      "J", "MJ", "kJ", "°C", "K", "F", "N", "kN", "Pa", "kPa", "MPa",
      "bar", "atm", "dB", "rpm",
      "กิโลกรัม", "กรัม", "มิลลิกรัม", "กิโลเมตร", "เมตร", "เซนติเมตร", "มิลลิเมตร",
      "กิโลวัตต์", "วัตต์", "เมกะวัตต์", "กิโลโวลต์", "โวลต์", "มิลลิโวลต์", "แอมแปร์", "มิลลิแอมแปร์",
      "เฮิรตซ์", "กิโลเฮิรตซ์", "เมกะเฮิรตซ์", "นิวตัน", "กิโลนิวตัน", "ปาสคาล", "กิโลปาสคาล",
      "เมกะปาสคาล", "องศาเซลเซียส", "เดซิเบล", "%", "pt", "มม."
    ]
  };
  await docConfigRepo.save({ config: configData });
  console.log('✅ DocConfig initialized.');

  // -----------------------------------------------------------
  // 4. SEED SUPER ADMIN (บัญชีหลักบัญชีเดียว)
  // -----------------------------------------------------------
  // const userRepo = ds.getRepository(UserAccount);

  // const adminEmail = 'admin@yourdomain.com';
  // const adminPassword = 'Password123';

  // await userRepo.save({
  //   role: 'admin',
  //   email: adminEmail,
  //   passwordHash: await bcrypt.hash(adminPassword, 12),
  //   is_active: true,
  // });

  // console.log('-------------------------------------------');
  // console.log(`👤 Super Admin Created: ${adminEmail}`);
  // console.log('⚠️  Please change this password after first login.');
  // console.log('-------------------------------------------');

  // console.log('🏁 Production Seed Completed.');
  await ds.destroy();
}

run().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
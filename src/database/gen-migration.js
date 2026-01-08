const { execSync } = require('child_process');

// รับชื่อ Migration จากคำสั่งที่เราพิมพ์
const name = process.argv[2];

if (!name) {
  console.error('❌ Error: กรุณาใส่ชื่อ Migration ด้วยครับ');
  console.error('👉 ตัวอย่าง: npm run migration:generate CreateUserTable');
  process.exit(1);
}

// กำหนด Path ตายตัวที่นี่ (ไม่ต้องพิมพ์เองอีกแล้ว)
const command = `npm run typeorm -- migration:generate ./src/database/migrations/${name}`;

try {
  // สั่งรันคำสั่งจริง พร้อมแสดงผลลัพธ์
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  // ถ้า Error ไม่ต้องทำอะไร เพราะ stdio inherit จะโชว์ error อยู่แล้ว
  process.exit(1);
}
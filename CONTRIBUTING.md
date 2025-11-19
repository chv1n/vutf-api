# 🚀 Coding Standards & Team Agreements

เอกสารนี้คือข้อตกลงร่วมกันของทีม (Team Agreements) เพื่อให้เราเขียนโค้ดไปในทิศทางเดียวกัน อ่านง่าย และลดข้อผิดพลาดในการทำงานร่วมกัน

## 1. ✏️ Naming Conventions (การตั้งชื่อ)

* **Variables (ตัวแปร) & Functions (ฟังก์ชัน):** `camelCase`
    * ตัวอย่าง: `userName`, `postList`, `getUserById()`
* **Classes, Types, Interfaces:** `PascalCase`
    * ตัวอย่าง: `UserService`, `IUserProfile`, `Product`
* **Constants (ค่าคงที่):** `UPPER_SNAKE_CASE`
    * ตัวอย่าง: `MAX_RETRIES = 3`, `DEFAULT_TIMEOUT = 5000`
* **Files (ชื่อไฟล์):** `kebab-case`
    * ตัวอย่าง: `user-validation.ts`, `auth.controller.ts`
* **Database (Tables & Columns):** `snake_case`
    * ตัวอย่าง: ตาราง `user_accounts`, คอลัมน์ `first_name`, `created_at`

---------------------------------------------------------------------------------------------

## 2. 📐 Code Formatting (ESLint & Prettier)

เราจะใช้ **ESLint** (สำหรับคุมกฎ) และ **Prettier** (สำหรับจัดสไตล์) เพื่อให้โค้ดมีหน้าตาเหมือนกันทั้งหมด โดยมีข้อตกลงดังนี้:

> **ข้อบังคับ:** ทุกคนควรตั้งค่า Editor ให้รัน Prettier อัตโนมัติเมื่อ Save และโค้ดต้องผ่าน Linter เสมอ

---------------------------------------------------------------------------------------------

## 3. 📡 API Standards

นี่คือ "สัญญา" ของ API ที่เราสร้างทั้งหมด

### 1. Endpoint Naming (RESTful)
* ใช้คำนามพหูพจน์ : e.g., `/users`, `/products`
* ห้ามใช้คำกริยา: e.g., ห้ามใช้ `/getUsers`, `/createNewProduct`
* **ตัวอย่าง:**
    * `POST /users` (สร้าง User)
    * `GET /users` (ดึง User ทั้งหมด)
    * `GET /users/{id}` (ดึง User คนเดียว)
    * `PUT /users/{id}` (อัปเดต User ทั้งตัว)
    * `DELETE /users/{id}` (ลบ User)

### 2.Success Response  (2xx)
ตัวอย่าง:
* [ดึงข้อมูลชื้นเดียว,สร้าง,อัพเดตข้อมูล]
* ต้องส่ง "ข้อมูลของสิ่งที่เพิ่งสร้างหรืออัพเดตเสร็จ" กลับไปด้วยเสมอ
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Test User"
  }
}

[ดึงข้อมูลหลายชิ้น+Pagination]
ตัวอย่าง:
{
  "success": true,
  "data": [
    { "id": "123", "name": "Test User 1" },
    { "id": "124", "name": "Test User 2" }
  ],
  meta: {
    totalItems: 100,   // จำนวนข้อมูลทั้งหมดก่อนแบ่งหน้า
    itemCount: 2,      // จำนวนรายการที่หน้า currentPage ส่งกลับมา
    itemsPerPage: 10,  // จำนวนรายการต่อหน้า
    totalPages: 10,    // จำนวนหน้าทั้งหมด
    currentPage: 1     // หน้าปัจจุบัน
  } 
}

### 3.Error Response  (4xx, 5xx)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR", // (Optional) รหัส Error ที่เราตกลงกันเอง
    "message": "Input validation failed.",
    "details": { // (Optional) ใช้สำหรับ 400 Bad Request
      "email": "Email is required.",
      "password": "Password must be at least 8 characters."
    }
  }
}

---------------------------------------------------------------------------------------------

## 4. 🌿 Git Workflow

เราจะใช้ **Git Flow** (แบบง่าย) เพื่อจัดการโค้ด

### 1. Branches
* `main`: คือ Branch Production ที่ใช้ deploy **(ห้าม push ขึ้นตรงๆ)**
* `staging`: คือ Branch ที่รวมโค้ดที่พัฒนาเสร็จแล้วที่ใช้ deploy เพื่อทดสอบ ก่อนขึ้น production
* `develop`: คือ Branch ที่รวมโค้ดที่พัฒนาเสร็จแล้ว (เตรียมขึ้น `staging`)
* **Feature Branches:** แตก Branch ใหม่จาก `develop` เสมอ
    * **การตั้งชื่อ Branch Name:** `feature/<name>` (e.g., `feature/auth`), `fix/<name>` (e.g., `fix/user-password-bug`)

### 2. Commit Messages
เราจะใช้ **Conventional Commits** เพื่อให้ Commit อ่านง่าย

* **Format:** `<type>: <description>`
* **Types:**
    * `feat:` (เพิ่ม Feature ใหม่)
    * `fix:` (แก้ไข Bug)
    * `docs:` (แก้ไขเอกสาร, README)
    * `style:` (แก้ Formatting, ไม่กระทบ Logic)
    * `refactor:` (ปรับโครงสร้างโค้ด, ไม่แก้ Bug หรือเพิ่ม Feature)
    * `test:` (เพิ่ม/แก้ไข Test)
* **ตัวอย่าง:**
    * `feat: Add login endpoint with JWT`
    * `fix: Correct password hashing on user registration`
    * `docs: Update API response format in README`

### 3. Pull Requests (PRs)
* เมื่องานเสร็จ ให้เปิด PR จาก `feature/...` ของเราไปที่ `develop`



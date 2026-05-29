# DD Bot Architecture & Skill Document

เอกสารนี้รวบรวมโครงสร้างเชิงลึก ข้อควรระวัง และแนวทางการเขียนโค้ดของโปรเจกต์ **DD Bot (ดีจัง)** เพื่อใช้เป็น Context สำหรับ AI ในอนาคต ให้สามารถพัฒนาต่อยอดและแก้ไขบัคได้อย่างรวดเร็วและปลอดภัย

---

## 🛠 1. Tech Stack & Core Libraries
- **Backend Framework:** Node.js, Express.js
- **Database:** MySQL (เชื่อมต่อผ่าน `mysql2/promise` เป็น Connection Pool)
- **LINE API:** `@line/bot-sdk` (ใช้สำหรับตอบกลับและรับ Webhook)
- **AI Integration:** `@google/genai` (Gemini API สำหรับฟีเจอร์ AI ดูดวง)
- **Payments:** `stripe` (ตัดบัตร), PromptPay (สร้าง QR Code ผ่าน `promptpay-qr`)
- **Frontend Panel:** HTML, Vanilla JS, CSS ล้วน ไม่ใช้ Framework แต่มีการจำลอง CSS Utility Classes สไตล์ Tailwind

---

## 📂 2. Directory Structure & Key Files

### Backend Logic
- **`index.js`**: จุดศูนย์กลางของระบบทั้งหมด (Core & LINE Webhook) ควบคุม State การแชททั้งหมด
- **`database.js`**: Data Access Layer จัดการ Query ฐานข้อมูลทั้งหมด **ห้ามเขียน Query ลงในไฟล์อื่น**
- **`flexMessages.js`**: เก็บฟังก์ชันสร้าง LINE Flex Message (UI Layer ของแชท)
- **`adminWeb.js`**: API Routes สำหรับหน้า Admin Panel (จัดการแพ็คเกจ, อนุมัติสลิป, ตั้งค่าระบบ)
- **`readerWeb.js`**: API Routes สำหรับระบบหมอดู (Live Chat Panel)

### Frontend (Web Panels)
- **`public/admin/`**: หน้าจอผู้ดูแลระบบ (Dashboard, อนุมัติสลิป, ตกแต่ง Flex)
- **`public/reader/`**: หน้าจอของหมอดูสำหรับใช้แชทกับลูกค้า (Live Chat)
- **`public/images/`**: โฟลเดอร์สำหรับเก็บไฟล์รูปภาพที่บอทสร้างขึ้นชั่วคราว (เช่น รูปสลิป, PromptPay QR)

---

## 🧠 3. State Management (In-Memory Maps)
ใน `index.js` มีการประกาศตัวแปรระดับ Global หลายตัวเพื่อใช้จำ State ของลูกค้า **(โปรดระวัง: หาก Node Server รีสตาร์ท State เหล่านี้จะหายไป)**
- `liveChatUsers`: [Set] เก็บ User ID ที่กำลังคุยกับหมอดูตัวจริงอยู่ (ข้อความจะไม่เด้งเข้า AI)
- `userLiveChatState`: [Map] เก็บสถานะและประวัติแชทของลูกค้าที่กำลังคุยกับ Admin
- `userPendingAngPaoAction` / `userPendingSlip`: [Map] จำว่าลูกค้ากำลังรอส่งซองอั่งเปา หรือ สลิปโอนเงิน
- `pendingBookingCompletions`: [Map] เก็บข้อมูล "ใบเสร็จ/ข้อความจบงาน" ไว้รอส่งให้ลูกค้า **หลังจาก** ลูกค้ากดให้คะแนนหมอดูเสร็จแล้ว
- `sessionStartTimes`: [Map] (ใน `readerWeb.js`) จำเวลาที่หมอดูเริ่ม Live Chat เพื่อใช้กรองประวัติแชท

---

## 🗄 4. Database Schema Highlights
- **`users`**: เก็บข้อมูลลูกค้า, เครดิต (`credit`), วันหมดอายุ VIP (`subscription_expires_at`), และหมอดูที่ถูกผูกมัด (`assigned_reader_id`)
- **`settings`**: เก็บค่า Configuration ของระบบ รวมถึง JSON ของ Flex Message (คอลัมน์ `value` เป็น **MEDIUMTEXT**)
- **`bookings`**: เก็บข้อมูลคิวการจองดูดวง สถานะ (`pending`, `confirmed`, `completed`)
- **`chat_logs`**: เก็บประวัติการแชททั้งหมด (นำไปแสดงในหน้าหมอดู)
- **`pending_slips`**: เก็บข้อมูลสลิปโอนเงินที่รอแอดมินมาตรวจสอบ

---

## 💡 5. Critical Workflows (โฟลว์ที่ซับซ้อน)

### A. โฟลว์การจบงาน & ให้คะแนนหมอดู (Reader Rating Flow)
1. หมอดูกด "จบการสนทนา" ผ่านหน้าเว็บ (`POST /api/readers/me/users/:userId/complete`)
2. ระบบดึงใบเสร็จและ Flex รีวิวไปเก็บรอไว้ใน `pendingBookingCompletions`
3. ระบบส่ง Flex ขอคะแนนดาว (`flex_reader_rating`) ให้ลูกค้า
4. เมื่อลูกค้ากดปุ่มดาว (ระบบ Postback จะรับ Event)
5. `index.js` เช็คว่ามีใบเสร็จค้างอยู่ใน Map หรือไม่ หากมี จะส่งใบเสร็จนั้นไปพร้อมคำขอบคุณ

### B. โฟลว์การตั้งค่า Flex แบบยืดหยุ่น (Dynamic Flex Settings)
- **การเพิ่ม Flex ใหม่:** ห้าม Hardcode! ให้เพิ่ม `key` (ต้องขึ้นต้นด้วย `flex_`) ลงใน `CORE_FLEX_REGISTRY` (ไฟล์ `adminWeb.js`) หน้าเว็บ Admin จะดึงไปแสดงให้ผู้ดูแลแก้ไขได้เอง
- **Fallback Logic:** หาก Admin ตั้งค่าปุ่ม Postback พัง (เช่น จาก `action=rate_reader&score=5` เหลือแค่ `score=5`) ตัว `index.js` ถูกออกแบบให้สามารถเดาบริบทจาก In-Memory State ชั่วคราวมาอุดช่องโหว่ได้

---

## 🚨 6. AI Agent Directives (ข้อบังคับสำหรับ AI)
เมื่อคุณ (AI) ได้รับมอบหมายให้ปรับปรุงโค้ดในโปรเจกต์นี้ โปรดปฏิบัติตามกฎต่อไปนี้อย่างเคร่งครัด:

1. **อย่าแก้ไขโครงสร้าง Database ด้วย `CREATE TABLE IF NOT EXISTS` เพียงอย่างเดียว:** หากคุณต้องการเพิ่มคอลัมน์ หรือเปลี่ยน Data Type ให้เขียน Script คำสั่ง `ALTER TABLE` รันใน Terminal เพื่ออัปเดตตารางเก่าด้วยเสมอ
2. **ห้ามละเมิดขอบเขตการเขียน Query:** การดึงข้อมูลหรือบันทึกลง Database จะต้องสร้าง Function ไว้ใน `database.js` เท่านั้น ห้ามเขียน Query SQL กระจายไปใน `index.js` หรือ Route ไฟล์อื่นๆ
3. **เช็ค In-Memory State เสมอ:** หากรับข้อความใหม่ (Message Event) ให้ตรวจสอบเสมอว่าลูกค้าติดอยู่ใน State ใดหรือไม่ (เช่น `userLiveChatState.has(userId)` หรือ `liveChatUsers.has(userId)`) ก่อนที่จะให้ AI ตอบ
4. **ความปลอดภัยของ Route:** Endpoint ของแอดมินหรือหมอดู ต้องถูกปกป้องด้วย Middleware `requireAdminAuth` หรือ `requireReaderAuth` เสมอ
5. **บุคลิกของบอท:** ให้คงเอกลักษณ์การพิมพ์ด้วยน้ำเสียงที่สุภาพ น่ารัก เป็นกันเอง มีอิโมจิประดับ และลงท้ายประโยคด้วย "ค่ะ/นะคะ" (บอทชื่อ "ดีจัง")

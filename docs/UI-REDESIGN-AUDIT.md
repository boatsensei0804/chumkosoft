# Chumkosoft School UI/UX route audit

ตรวจโครงสร้างเมื่อ 21 พ.ย. 2569: 37 page routes, 13 API routes, 3 layouts และ 4 modal routes. รายการนี้ระบุการครอบคลุมของงาน UI เท่านั้น ไม่ใช่ผลทดสอบการทำงานจริงกับฐานข้อมูลทุกหน้า

| Page | สถานะ UI รอบนี้ |
|---|---|
| `app/dashboard/@modal/(.)classrooms/[id]/page.tsx` | ใช้ Dialog และสีระบบร่วม; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/@modal/(.)students/[id]/page.tsx` | ใช้ Dialog และสีระบบร่วม; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/@modal/(.)teachers/[id]/page.tsx` | ใช้ Dialog และสีระบบร่วม; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/@modal/[...catchAll]/page.tsx` | ใช้ Dialog และสีระบบร่วม; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/attendance/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/behavior/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/classrooms/[id]/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/dashboard/classrooms/page.tsx` | ปรับพื้นที่ตารางให้เลื่อนภายในบนเดสก์ท็อป; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/courses/page.tsx` | ปรับพื้นที่ตารางให้เลื่อนภายในบนเดสก์ท็อป; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/emergencies/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/dashboard/faces/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/guardians/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/dashboard/kiosk/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/leave-requests/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/line/messages/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/line/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/line/print/page.tsx` | แม่แบบพิมพ์เดิม; ยังไม่ได้ตรวจ PDF ใหม่ |
| `app/dashboard/line/report/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/line/teachers/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/line-announcements/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/my-line/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/dashboard/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/dashboard/rooms/page.tsx` | ปรับพื้นที่ตารางให้เลื่อนภายในบนเดสก์ท็อป; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/settings/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/students/[id]/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/dashboard/students/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/dashboard/teachers/[id]/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/dashboard/teachers/page.tsx` | ปรับพื้นที่ตารางให้เลื่อนภายในบนเดสก์ท็อป; ยังไม่ได้ตรวจภาพจริง |
| `app/dashboard/timetable/page.tsx` | ได้รับ AppShell, PageHeader หรือ Design Tokens ใหม่; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/guide/page.tsx` | ได้รับ Design Tokens ร่วม; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/login/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/page.tsx` | ปรับภาพ/การจัดวางในรอบนี้ |
| `app/pair-scanner/[code]/page.tsx` | ได้รับ Design Tokens ร่วม; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/portal/page.tsx` | ปรับภาพ Hero ตามบทบาทผู้ปกครอง/นักเรียน; ยังไม่ได้ตรวจภาพจริง |
| `app/scan/page.tsx` | Redirect เดิม; ไม่มีหน้าจอสแกนเว็บให้ปรับ |
| `app/scanner-devices/page.tsx` | ได้รับ Design Tokens ร่วม; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |
| `app/unauthorized/page.tsx` | ได้รับ Design Tokens ร่วม; ยังไม่ได้ปรับเฉพาะหน้า/ตรวจภาพจริง |

## ส่วนที่ปรับแล้ว

- พื้นฐานสีฟ้า–ขาว, Sidebar/Topbar, พื้นที่เลื่อนของ Dashboard, Hero Banner และภาพฉากตามบริบท
- หน้าแจ้งเหตุฉุกเฉิน, ผู้ปกครอง และ LINE ของฉัน: การ์ด สถานะ พื้นที่ข้อมูล และมาสคอตเฉพาะหน้า
- หน้าแรก Dashboard, Login, หน้าแรกสาธารณะ และหัวหน้ารายละเอียดนักเรียน/ครู/ห้องเรียน
- หน้ารายการห้องเรียน รายวิชา ห้องและสถานที่ และครู: ตารางเลื่อนภายในบนจอเดสก์ท็อป พร้อมหัวตารางค้างอยู่
- ใช้ข้อมูลจริงจาก Server Components และ Services เดิม; ไม่เพิ่มข้อมูลเหตุการณ์สมมติ

## ยังต้องทำก่อนถือว่า Redesign ทั้งระบบเสร็จ

- ปรับแต่ละหน้าที่ระบุว่า “ยังไม่ได้ปรับเฉพาะหน้า” และตรวจ Loading/Empty/Error/Success ของแต่ละ workflow
- ตรวจภาพ Dashboard หลังล็อกอินที่ 1366×768, 1440×900, 1920×1080, 2560×1440, tablet และ mobile พร้อมข้อมูลจริง
- ตรวจการค้นหา ตัวกรอง ตาราง Dialog การอนุมัติ การส่ง LINE และสิทธิ์ผู้ใช้ด้วยบัญชีทดสอบ
- ตรวจหน้าเอกสารพิมพ์และ modal routes รวมถึงหน้าจัดการเครื่องสแกน

## ผลตรวจรอบนี้

- `npm run build`: ผ่าน
- `npm test`: 34 files / 186 tests ผ่าน
- `npm run lint`: 0 errors; มี warnings เดิมจาก `.claude/skills`
- หน้า `/` และ `/login` ตอบ HTTP 200 จาก production build ในเครื่อง
- ตรวจภาพ `/login` ที่ 1366×768; ยังไม่มีภาพ Dashboard ที่ล็อกอิน เพราะ Docker daemon บน Mac ไม่ทำงาน

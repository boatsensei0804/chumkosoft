import { PrismaClient, StaffType, TermStatus, EnrollmentStatus, Role } from "@prisma/client";
import { hash } from "@node-rs/bcrypt";

const prisma = new PrismaClient();

// Dev-only login credentials. Real deployments create accounts through the app;
// this shared password exists purely to make the seeded environment usable.
const DEV_PASSWORD = "password123";

interface StaffDetails {
  birthDate?: Date;
  nationalId?: string;
  positionNumber?: string;
  salary?: number;
  licenseNumber?: string;
  licenseExpiry?: Date;
  degreeBachelor?: string;
  fieldBachelor?: string;
  universityBachelor?: string;
  degreeMaster?: string;
  fieldMaster?: string;
  universityMaster?: string;
}

interface StaffSeed {
  code: string;
  prefix: string;
  firstName: string;
  lastName: string;
  details?: StaffDetails;
}

const staff: StaffSeed[] = [
  {
    code: "T-001",
    prefix: "อ.",
    firstName: "วีรยา",
    lastName: "สุขใจ",
    details: {
      birthDate: new Date("1985-04-12"),
      nationalId: "1101700203451",
      positionNumber: "ครู 1234",
      salary: 35800,
      licenseNumber: "6412000123456",
      licenseExpiry: new Date("2027-09-30"),
      degreeBachelor: "ค.บ.",
      fieldBachelor: "คณิตศาสตร์",
      universityBachelor: "มหาวิทยาลัยศรีนครินทรวิโรฒ",
      degreeMaster: "กศ.ม.",
      fieldMaster: "คณิตศาสตรศึกษา",
      universityMaster: "มหาวิทยาลัยเกษตรศาสตร์",
    },
  },
  {
    code: "T-002",
    prefix: "อ.",
    firstName: "ณัฐพล",
    lastName: "มั่นคง",
    details: {
      birthDate: new Date("1990-08-25"),
      nationalId: "1102003654789",
      positionNumber: "ครู 1287",
      salary: 29310,
      licenseNumber: "6512000654321",
      licenseExpiry: new Date("2026-05-15"),
      degreeBachelor: "วท.บ.",
      fieldBachelor: "ฟิสิกส์",
      universityBachelor: "จุฬาลงกรณ์มหาวิทยาลัย",
    },
  },
  { code: "T-003", prefix: "Ms.", firstName: "Clara", lastName: "Bennett" },
  { code: "T-004", prefix: "อ.", firstName: "สุดา", lastName: "งามวงศ์" },
  { code: "T-005", prefix: "อ.", firstName: "มานพ", lastName: "ธาราทิพย์" },
  { code: "T-006", prefix: "อ.", firstName: "สมชาย", lastName: "ใจดี" },
  { code: "T-007", prefix: "อ.", firstName: "กิตติ", lastName: "แข็งแรง" },
  { code: "T-008", prefix: "อ.", firstName: "นภา", lastName: "วิจิตร" },
];

const rooms = [
  { code: "304", name: null, building: "อาคาร 3" },
  { code: "LAB2", name: "ห้องปฏิบัติการ 2", building: "อาคาร 4" },
  { code: "112", name: null, building: "อาคาร 1" },
  { code: "205", name: null, building: "อาคาร 2" },
  { code: "LAB1", name: "ห้องปฏิบัติการ 1", building: "อาคาร 4" },
  { code: "GYM", name: "โรงยิม", building: null },
  { code: "ART", name: "ห้องศิลป์", building: "อาคาร 5" },
];

const courses = [
  { code: "ค30201", name: "คณิตศาสตร์เพิ่มเติม", credits: 1.5, teacher: "T-001", room: "304", periodsPerWeek: 4 },
  { code: "ว30201", name: "ฟิสิกส์", credits: 1.5, teacher: "T-002", room: "LAB2", periodsPerWeek: 3 },
  { code: "อ30201", name: "ภาษาอังกฤษ", credits: 1.0, teacher: "T-003", room: "112", periodsPerWeek: 3 },
  { code: "ท30101", name: "ภาษาไทย", credits: 1.0, teacher: "T-004", room: "205", periodsPerWeek: 2 },
  { code: "ว30221", name: "เคมี", credits: 1.5, teacher: "T-005", room: "LAB1", periodsPerWeek: 3 },
  { code: "ส30104", name: "ประวัติศาสตร์", credits: 1.0, teacher: "T-006", room: "205", periodsPerWeek: 2 },
  { code: "พ30101", name: "สุขศึกษาและพลศึกษา", credits: 0.5, teacher: "T-007", room: "GYM", periodsPerWeek: 1 },
  { code: "ศ30101", name: "ศิลปะ", credits: 0.5, teacher: "T-008", room: "ART", periodsPerWeek: 2 },
];

// Initial timetable slots (courseCode, dayOfWeek, period index) — the grid starts
// partly built. Period indexes: 1-4 = คาบ1-4, 6-9 = คาบ5-8 (index 5 is lunch).
const seedSlots = [
  { course: "ค30201", day: "MON" as const, periodIndex: 1 },
  { course: "ค30201", day: "WED" as const, periodIndex: 1 },
  { course: "อ30201", day: "MON" as const, periodIndex: 3 },
  { course: "ว30201", day: "TUE" as const, periodIndex: 1 },
  { course: "ว30221", day: "THU" as const, periodIndex: 6 },
  { course: "ส30104", day: "FRI" as const, periodIndex: 2 },
];

const students = [
  { code: "68-0421", firstName: "ปุณณภา", lastName: "ศรีสวัสดิ์", status: EnrollmentStatus.ACTIVE },
  { code: "68-0420", firstName: "ธนกฤต", lastName: "เจริญพงษ์", status: EnrollmentStatus.PENDING },
  { code: "68-0419", firstName: "ญาดา", lastName: "อินทรโชติ", status: EnrollmentStatus.ACTIVE },
  { code: "68-0418", firstName: "กันตพงศ์", lastName: "วัฒนกุล", status: EnrollmentStatus.LEAVE },
  { code: "68-0417", firstName: "พิมพ์มาดา", lastName: "รักไทย", status: EnrollmentStatus.ACTIVE },
  { code: "68-0416", firstName: "ศุภกร", lastName: "บุญมี", status: EnrollmentStatus.PENDING },
  { code: "68-0415", firstName: "อนันตญา", lastName: "พูลสวัสดิ์", status: EnrollmentStatus.ACTIVE },
  { code: "68-0414", firstName: "รัชชานนท์", lastName: "แก้วมณี", status: EnrollmentStatus.ACTIVE },
  { code: "68-0413", firstName: "ชญานิศ", lastName: "ตันติวงศ์", status: EnrollmentStatus.PENDING },
  { code: "68-0412", firstName: "ภูริพัฒน์", lastName: "สินสมบูรณ์", status: EnrollmentStatus.LEAVE },
];

const periods = [
  { index: 1, label: "คาบ 1", startTime: "08:30", endTime: "09:20", isBreak: false },
  { index: 2, label: "คาบ 2", startTime: "09:20", endTime: "10:10", isBreak: false },
  { index: 3, label: "คาบ 3", startTime: "10:20", endTime: "11:10", isBreak: false },
  { index: 4, label: "คาบ 4", startTime: "11:10", endTime: "12:00", isBreak: false },
  { index: 5, label: "พักกลางวัน", startTime: "12:00", endTime: "13:00", isBreak: true },
  { index: 6, label: "คาบ 5", startTime: "13:00", endTime: "13:50", isBreak: false },
  { index: 7, label: "คาบ 6", startTime: "13:50", endTime: "14:40", isBreak: false },
  { index: 8, label: "คาบ 7", startTime: "14:50", endTime: "15:40", isBreak: false },
  { index: 9, label: "คาบ 8", startTime: "15:40", endTime: "16:30", isBreak: false },
];

async function main(): Promise<void> {
  const year = await prisma.academicYear.upsert({
    where: { buddhistYear: 2568 },
    update: {},
    create: { buddhistYear: 2568, name: "ปีการศึกษา 2568", startDate: new Date("2025-05-16"), endDate: new Date("2026-03-31"), isActive: true },
  });

  const term1 = await prisma.term.upsert({
    where: { academicYearId_number: { academicYearId: year.id, number: 1 } },
    update: {},
    create: { academicYearId: year.id, number: 1, name: "ภาคเรียนที่ 1/2568", startDate: new Date("2025-05-16"), endDate: new Date("2025-10-10"), status: TermStatus.ACTIVE, isActive: true },
  });
  await prisma.term.upsert({
    where: { academicYearId_number: { academicYearId: year.id, number: 2 } },
    update: {},
    create: { academicYearId: year.id, number: 2, name: "ภาคเรียนที่ 2/2568", startDate: new Date("2025-11-01"), endDate: new Date("2026-03-31"), status: TermStatus.UPCOMING, isActive: false },
  });

  const periodByIndex = new Map<number, string>();
  for (const p of periods) {
    const row = await prisma.period.upsert({ where: { index: p.index }, update: {}, create: p });
    periodByIndex.set(p.index, row.id);
  }

  const roomByCode = new Map<string, string>();
  for (const r of rooms) {
    const row = await prisma.room.upsert({ where: { code: r.code }, update: {}, create: r });
    roomByCode.set(r.code, row.id);
  }

  const staffByCode = new Map<string, string>();
  for (const s of staff) {
    const row = await prisma.staff.upsert({
      where: { staffCode: s.code },
      update: { ...s.details },
      create: { staffCode: s.code, prefix: s.prefix, firstName: s.firstName, lastName: s.lastName, type: StaffType.TEACHER, ...s.details },
    });
    staffByCode.set(s.code, row.id);
  }

  const courseByCode = new Map<string, string>();
  for (const c of courses) {
    const row = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, name: c.name, credits: c.credits },
    });
    courseByCode.set(c.code, row.id);
  }

  const classroom = await prisma.classroom.upsert({
    where: { academicYearId_code: { academicYearId: year.id, code: "ม.4/1" } },
    update: {},
    create: {
      academicYearId: year.id,
      code: "ม.4/1",
      gradeLevel: "มัธยมปลาย",
      advisors: {
        create: [{ staffId: staffByCode.get("T-001")! }, { staffId: staffByCode.get("T-002")! }],
      },
    },
  });

  const studentByCode = new Map<string, string>();
  for (const s of students) {
    const student = await prisma.student.upsert({
      where: { studentCode: s.code },
      update: {},
      create: { studentCode: s.code, firstName: s.firstName, lastName: s.lastName },
    });
    studentByCode.set(s.code, student.id);
    await prisma.enrollment.upsert({
      where: { studentId_termId: { studentId: student.id, termId: term1.id } },
      update: {},
      create: { studentId: student.id, classroomId: classroom.id, academicYearId: year.id, termId: term1.id, status: s.status },
    });
  }

  // User accounts (one per role) so every RBAC surface can be exercised. Each is
  // linked to its person record where one exists; the parent account stands alone.
  const passwordHash = await hash(DEV_PASSWORD, 10);
  const accounts: { email: string; role: Role; staffCode?: string; studentCode?: string }[] = [
    { email: "admin@chumko.ac.th", role: Role.ADMIN, staffCode: "T-001" },
    { email: "teacher@chumko.ac.th", role: Role.TEACHER, staffCode: "T-002" },
    { email: "student@chumko.ac.th", role: Role.STUDENT, studentCode: "68-0421" },
    { email: "parent@chumko.ac.th", role: Role.PARENT },
    { email: "kiosk@chumko.ac.th", role: Role.KIOSK }, // face-scan station at the gate
  ];
  for (const a of accounts) {
    const staffId = a.staffCode ? staffByCode.get(a.staffCode) : undefined;
    const studentId = a.studentCode ? studentByCode.get(a.studentCode) : undefined;
    await prisma.user.upsert({
      where: { email: a.email },
      update: { role: a.role, passwordHash, staffId, studentId },
      create: { email: a.email, role: a.role, passwordHash, staffId, studentId },
    });
  }

  // Link the demo parent account to a student so the portal has data to show.
  const parentUser = await prisma.user.findUnique({ where: { email: "parent@chumko.ac.th" }, select: { id: true } });
  const wardId = studentByCode.get("68-0420");
  if (parentUser && wardId) {
    const existingGuardian = await prisma.guardian.findFirst({
      where: { userId: parentUser.id, studentId: wardId, isDeleted: false },
      select: { id: true },
    });
    if (!existingGuardian) {
      await prisma.guardian.create({
        data: { userId: parentUser.id, studentId: wardId, fullName: "ผู้ปกครองตัวอย่าง", relation: "ผู้ปกครอง" },
      });
    }
  }

  // Demo: mark a couple of students as consented so face enrolment can be tried
  // immediately. Real students must have consent recorded via the app.
  await prisma.student.updateMany({
    where: { studentCode: { in: ["68-0421", "68-0420"] } },
    data: { faceConsent: true, faceConsentAt: new Date() },
  });

  // Dashboard announcements (idempotent by title).
  const announcements = [
    { kind: "info", title: "เปิดภาคเรียนที่ 1/2568", body: "โรงเรียนเปิดเรียนวันที่ 16 พฤษภาคม 2568 นักเรียนทุกคนมาโรงเรียนตามปกติ", postedBy: "ฝ่ายวิชาการ" },
    { kind: "warning", title: "ปิดปรับปรุงระบบไฟฟ้าอาคาร 3", body: "วันเสาร์นี้จะมีการปรับปรุงระบบไฟฟ้า อาจกระทบการใช้ห้องปฏิบัติการ", postedBy: "ฝ่ายอาคารสถานที่" },
    { kind: "success", title: "เปิดใช้ระบบสแกนใบหน้าเช็คชื่อ", body: "เริ่มใช้จุดสแกนใบหน้าที่ประตูโรงเรียน กรุณาลงทะเบียนใบหน้านักเรียนที่ได้รับความยินยอมแล้ว", postedBy: "งานทะเบียน" },
  ];
  for (const a of announcements) {
    const existing = await prisma.announcement.findFirst({ where: { title: a.title, isDeleted: false }, select: { id: true } });
    if (!existing) {
      await prisma.announcement.create({ data: a });
    }
  }

  const offeringByCourse = new Map<string, { id: string; teacherId: string; roomId: string }>();
  for (const c of courses) {
    const offering = await prisma.courseOffering.upsert({
      where: { termId_courseId_classroomId: { termId: term1.id, courseId: courseByCode.get(c.code)!, classroomId: classroom.id } },
      update: { periodsPerWeek: c.periodsPerWeek, roomId: roomByCode.get(c.room)! },
      create: {
        termId: term1.id,
        courseId: courseByCode.get(c.code)!,
        teacherId: staffByCode.get(c.teacher)!,
        classroomId: classroom.id,
        roomId: roomByCode.get(c.room)!,
        periodsPerWeek: c.periodsPerWeek,
      },
    });
    offeringByCourse.set(c.code, { id: offering.id, teacherId: staffByCode.get(c.teacher)!, roomId: roomByCode.get(c.room)! });
  }

  // Reset then re-create the class's timetable slots (idempotent seed).
  await prisma.timetableSlot.deleteMany({ where: { termId: term1.id, classroomId: classroom.id } });
  for (const s of seedSlots) {
    const off = offeringByCourse.get(s.course)!;
    await prisma.timetableSlot.create({
      data: {
        termId: term1.id,
        courseOfferingId: off.id,
        teacherId: off.teacherId,
        classroomId: classroom.id,
        roomId: off.roomId,
        periodId: periodByIndex.get(s.periodIndex)!,
        dayOfWeek: s.day,
      },
    });
  }

  console.log("✓ seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

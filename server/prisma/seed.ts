import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Configure server/.env (see server/.env.example).");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PASSWORD_SALT_ROUNDS = 10;

// ──────────────────────────────────────────────────────────────
// Permission catalog (single source of truth for RBAC)
// ──────────────────────────────────────────────────────────────
type PermDef = { key: string; module: string; label: string };

const PERMISSIONS: PermDef[] = [
  // Users & profiles
  { key: "users.list", module: "users", label: "List users" },
  { key: "users.view", module: "users", label: "View user" },
  { key: "users.create", module: "users", label: "Create user" },
  { key: "users.edit", module: "users", label: "Edit user" },
  { key: "users.delete", module: "users", label: "Delete user" },
  { key: "users.disable", module: "users", label: "Enable/disable user" },
  { key: "users.reset-password", module: "users", label: "Reset password" },

  // Teachers
  { key: "teachers.manage", module: "teachers", label: "Manage teachers" },

  // Students
  { key: "students.list", module: "students", label: "List students" },
  { key: "students.view", module: "students", label: "View student" },
  { key: "students.create", module: "students", label: "Create student" },
  { key: "students.edit", module: "students", label: "Edit student" },
  { key: "students.delete", module: "students", label: "Delete student" },
  { key: "students.suspend", module: "students", label: "Suspend/activate student" },
  { key: "students.transfer", module: "students", label: "Transfer student" },
  { key: "students.promote", module: "students", label: "Promote student" },
  { key: "students.import", module: "students", label: "Import students (Excel)" },
  { key: "students.view-own", module: "students", label: "View own student record" },

  // Academic structure
  { key: "academic.view", module: "academic", label: "View academic structure" },
  { key: "academic.manage", module: "academic", label: "Manage departments/sessions/classes/sections/subjects" },

  // Enrollment & assignment
  { key: "enrollment.manage", module: "enrollment", label: "Manage enrollment & teacher assignment" },

  // Timetable
  { key: "timetable.view", module: "timetable", label: "View timetable" },
  { key: "timetable.manage", module: "timetable", label: "Manage timetable" },

  // Attendance
  { key: "attendance.take", module: "attendance", label: "Take attendance" },
  { key: "attendance.edit", module: "attendance", label: "Edit attendance" },
  { key: "attendance.view-own", module: "attendance", label: "View own attendance" },
  { key: "attendance.view-all", module: "attendance", label: "View all attendance" },
  { key: "attendance.reports", module: "attendance", label: "View attendance reports" },

  // Exams
  { key: "exams.view", module: "exams", label: "View exams" },
  { key: "exams.manage", module: "exams", label: "Manage exams" },
  { key: "exams.enter-marks", module: "exams", label: "Enter exam marks" },
  { key: "exams.approve", module: "exams", label: "Approve results" },
  { key: "exams.publish", module: "exams", label: "Publish results" },

  // Quizzes
  { key: "quizzes.manage", module: "quizzes", label: "Create/manage quizzes" },
  { key: "quizzes.attempt", module: "quizzes", label: "Attempt quiz" },
  { key: "quizzes.grade", module: "quizzes", label: "Grade quizzes" },

  // Assignments
  { key: "assignments.manage", module: "assignments", label: "Create/manage assignments" },
  { key: "assignments.submit", module: "assignments", label: "Submit assignment" },
  { key: "assignments.grade", module: "assignments", label: "Grade assignments" },

  // Results & reports
  { key: "results.view", module: "results", label: "View results" },
  { key: "results.enter", module: "results", label: "Enter results" },
  { key: "results.approve", module: "results", label: "Approve results" },
  { key: "results.publish", module: "results", label: "Publish results" },
  { key: "results.export", module: "results", label: "Export results" },

  // Announcements
  { key: "announcements.view", module: "announcements", label: "View announcements" },
  { key: "announcements.manage", module: "announcements", label: "Create/manage announcements" },

  // Letters / appeals
  { key: "letters.submit", module: "letters", label: "Submit letter/request" },
  { key: "letters.manage", module: "letters", label: "Manage all letters" },
  { key: "letters.reply", module: "letters", label: "Reply to letters" },
  { key: "letters.approve-leave", module: "letters", label: "Approve leave requests" },

  // Notifications
  { key: "notifications.view", module: "notifications", label: "View notifications" },

  // Analytics
  { key: "analytics.view", module: "analytics", label: "View analytics" },

  // Reports
  { key: "reports.generate", module: "reports", label: "Generate reports" },
  { key: "reports.export", module: "reports", label: "Export reports (PDF/Excel)" },

  // Audit & security
  { key: "audit.view", module: "audit", label: "View activity logs" },
  { key: "login-history.view", module: "audit", label: "View login history" },

  // Settings & branding
  { key: "settings.manage", module: "settings", label: "Manage portal settings" },

  // Backups
  { key: "backups.manage", module: "backups", label: "Manage backups" },

  // Files
  { key: "files.upload", module: "files", label: "Upload files" },
  { key: "files.download", module: "files", label: "Download files" },

  // Study materials
  { key: "materials.view", module: "materials", label: "View study materials" },
  { key: "materials.manage", module: "materials", label: "Manage study materials" },

  // Messages / Inbox
  { key: "messages.send", module: "messages", label: "Send messages" },
  { key: "messages.view", module: "messages", label: "View messages" },

  // System health
  { key: "system.health", module: "system", label: "View system health" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: PERMISSIONS.map((p) => p.key),

  teacher: [
    "academic.view", "timetable.view", "timetable.manage",
    "attendance.take", "attendance.edit", "attendance.view-own", "attendance.reports",
    "exams.view", "exams.manage", "exams.enter-marks", "exams.publish",
    "quizzes.manage", "quizzes.grade",
    "assignments.manage", "assignments.grade",
    "results.view", "results.enter", "results.publish", "results.export",
    "announcements.view", "announcements.manage",
    "letters.reply", "letters.approve-leave",
    "notifications.view", "analytics.view",
    "reports.generate", "reports.export",
    "students.view-own",
    "files.upload", "files.download",
    "materials.view", "materials.manage",
    "messages.send", "messages.view",
    "system.health",
  ],

  student: [
    "timetable.view", "attendance.view-own", "exams.view",
    "quizzes.attempt", "assignments.submit", "results.view",
    "announcements.view", "letters.submit", "notifications.view",
    "files.download", "materials.view",
    "messages.send", "messages.view",
    "analytics.view",
  ],
};

const USERS = [
  {
    email: "admin@eduportal.dev",
    password: "Admin@123",
    fullName: "System Administrator",
    role: "super_admin",
  },
  {
    email: "teacher@eduportal.dev",
    password: "Teacher@123",
    fullName: "Alice Johnson",
    role: "teacher",
    teacher: {
      employeeCode: "TCH-001",
      qualification: "M.Sc Mathematics",
      specialization: "Mathematics",
    },
  },
  {
    email: "student@eduportal.dev",
    password: "Student@123",
    fullName: "Ravi Kumar",
    role: "student",
    student: {
      rollNumber: "R-001",
      admissionNumber: "ADM-001",
      guardianName: "Suresh Kumar",
      guardianPhone: "+91-9876543210",
      gender: "Male",
      dob: new Date("2011-05-14"),
    },
  },
];

async function main() {
  console.log("Seeding RBAC...");
  const roles = new Map<string, string>();
  for (const [name, label, description] of [
    ["super_admin", "Management", "Full control over the entire system"],
    ["teacher", "Teacher", "Manages assigned classes, students and subjects"],
    ["student", "Student", "Access to own account and records only"],
  ] as const) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { label, description },
      create: { name, label, description, isSystem: true },
    });
    roles.set(name, role.id);
  }

  console.log(`Seeding ${PERMISSIONS.length} permissions...`);
  const permIds = new Map<string, string>();
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, label: p.label },
      create: p,
    });
    permIds.set(p.key, perm.id);
  }

  console.log("Mapping role permissions...");
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roles.get(roleName)!;
    // For super_admin, allow all known permissions.
    const effective =
      roleName === "super_admin" ? PERMISSIONS.map((p) => p.key) : keys;
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({
      data: effective.map((key) => ({ roleId, permissionId: permIds.get(key)! })),
    });
  }

  console.log("Seeding users...");
  const adminId = roles.get("super_admin")!;
  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, PASSWORD_SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, isActive: true },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        isActive: true,
      },
    });
    userIds[u.role] = user.id;

    if (u.teacher) {
      await prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, ...u.teacher },
      });
    }
    if (u.student) {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, ...u.student },
      });
    }
  }

  console.log("Seeding academic structure...");
  const dept = await prisma.department.upsert({
    where: { code: "CS" },
    update: {},
    create: { name: "Computer Science", code: "CS", description: "Department of Computer Science" },
  });

  const session = await prisma.session.upsert({
    where: { name: "2026-2027" },
    update: { isActive: true },
    create: {
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      isActive: true,
    },
  });

  const cls = await prisma.academicClass.upsert({
    where: { code: "G10" },
    update: {},
    create: {
      name: "Grade 10",
      code: "G10",
      departmentId: dept.id,
      sessionId: session.id,
      room: "Room 101",
    },
  });

  const section = await prisma.section.upsert({
    where: { name_classId: { name: "A", classId: cls.id } },
    update: {},
    create: { name: "A", classId: cls.id, room: "Room 101-A" },
  });

  const subjects = [
    { name: "Mathematics", code: "MATH", credits: 3 },
    { name: "Physics", code: "PHY", credits: 3 },
    { name: "English", code: "ENG", credits: 2 },
  ];
  const subjectIds = new Map<string, string>();
  for (const s of subjects) {
    const subj = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, credits: s.credits },
      create: s,
    });
    subjectIds.set(s.code, subj.id);
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: userIds["teacher"] },
  });
  if (teacherProfile) {
    for (const code of ["MATH", "PHY", "ENG"]) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: cls.id, subjectId: subjectIds.get(code)! } },
        update: { teacherId: teacherProfile.id },
        create: { classId: cls.id, subjectId: subjectIds.get(code)!, teacherId: teacherProfile.id },
      });
    }
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: userIds["student"] },
  });
  if (studentProfile) {
    await prisma.studentEnrollment.upsert({
      where: {
        id: "seed-enroll-1",
      },
      update: {},
      create: {
        id: "seed-enroll-1",
        studentId: studentProfile.id,
        classId: cls.id,
        sectionId: section.id,
        sessionId: session.id,
      },
    });
    // Keep denormalized pointer on the student in sync
    await prisma.studentProfile.update({
      where: { id: studentProfile.id },
      data: { status: "ACTIVE" },
    });
  }

  await prisma.setting.upsert({
    where: { key: "portal.name" },
    update: {},
    create: { key: "portal.name", value: JSON.stringify("EduPortal"), category: "BRANDING", isPublic: true },
  });
  await prisma.setting.upsert({
    where: { key: "portal.contactEmail" },
    update: {},
    create: { key: "portal.contactEmail", value: JSON.stringify("support@eduportal.dev"), category: "BRANDING", isPublic: true },
  });

  console.log("Seed complete.");
  console.log("  Management  -> admin@eduportal.dev / Admin@123");
  console.log("  Teacher     -> teacher@eduportal.dev / Teacher@123");
  console.log("  Student     -> student@eduportal.dev / Student@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

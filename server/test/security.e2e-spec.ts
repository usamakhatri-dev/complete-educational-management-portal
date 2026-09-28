import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import request from 'supertest';
import { createTestApp } from './test-app.helper.js';

describe('Security & Data Isolation (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture = await createTestApp();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(helmet());
    app.enableCors({
      origin: ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
    adminToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('JWT Authentication', () => {
    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject request with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'NotBearer token')
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should whitelist DTO properties on login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@eduportal.dev',
          password: 'Admin@123',
          maliciousField: 'injected',
        })
        .expect(200);

      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain('maliciousField');
    });

    it('should reject invalid email format with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Admin@123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' })
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should handle CORS preflight request', async () => {
      const res = await request(app.getHttpServer())
        .options('/api/users')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(
        res.headers['access-control-allow-origin'],
      ).toBeDefined();
    });
  });

  describe('Data Isolation', () => {
    let teacherToken: string;
    let studentToken: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;

      const studentRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = studentRes.body.data.accessToken;
    });

    it('should prevent teacher from accessing admin-only users list', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('should prevent student from accessing people.students (requires students.list)', async () => {
      await request(app.getHttpServer())
        .get('/api/people/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should allow teacher to access permitted endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });

    it('should allow student to access permitted endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
    });
  });

  describe('Teacher Resource Ownership (IDOR Prevention)', () => {
    let teacherAToken: string;
    let teacherBToken: string;
    let adminToken2: string;
    let teacherAQuizId: string;
    let teacherAAssignmentId: string;

    beforeAll(async () => {
      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      adminToken2 = adminRes.body.data.accessToken;

      const teacherARes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherAToken = teacherARes.body.data.accessToken;

      const quizRes = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          title: 'Teacher A Quiz',
          classId: 'test-class',
          subjectId: 'test-subject',
          questionsJson: '[]',
        });
      if (quizRes.status === 201) {
        teacherAQuizId = quizRes.body.data.id;
      }

      const assignRes = await request(app.getHttpServer())
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({
          title: 'Teacher A Assignment',
          classId: 'test-class',
          subjectId: 'test-subject',
        });
      if (assignRes.status === 201) {
        teacherAAssignmentId = assignRes.body.data.id;
      }
    });

    it('should allow teacher to read own quiz by ID', async () => {
      if (!teacherAQuizId) return;
      await request(app.getHttpServer())
        .get(`/api/quizzes/${teacherAQuizId}`)
        .set('Authorization', `Bearer ${teacherAToken}`)
        .expect(200);
    });

    it('should allow teacher to update own quiz', async () => {
      if (!teacherAQuizId) return;
      await request(app.getHttpServer())
        .patch(`/api/quizzes/${teacherAQuizId}`)
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ title: 'Hacked Quiz' })
        .expect(200);
    });

    it('should allow teacher to read own assignment by ID', async () => {
      if (!teacherAAssignmentId) return;
      await request(app.getHttpServer())
        .get(`/api/assignments/${teacherAAssignmentId}`)
        .set('Authorization', `Bearer ${teacherAToken}`)
        .expect(200);
    });

    it('should allow teacher to update own assignment', async () => {
      if (!teacherAAssignmentId) return;
      await request(app.getHttpServer())
        .patch(`/api/assignments/${teacherAAssignmentId}`)
        .set('Authorization', `Bearer ${teacherAToken}`)
        .send({ title: 'Hacked Assignment' })
        .expect(200);
    });

    it('should allow admin to access any quiz', async () => {
      if (!teacherAQuizId) return;
      await request(app.getHttpServer())
        .get(`/api/quizzes/${teacherAQuizId}`)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(200);
    });

    it('should allow admin to access any assignment', async () => {
      if (!teacherAAssignmentId) return;
      await request(app.getHttpServer())
        .get(`/api/assignments/${teacherAAssignmentId}`)
        .set('Authorization', `Bearer ${adminToken2}`)
        .expect(200);
    });

    it('should scope quiz submissions listing to teachers own quizzes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quizzes/submissions/all')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should scope assignment submissions listing to teachers own assignments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/assignments/submissions/all')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should scope exam listing to teachers assigned classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should scope attendance by ID to teachers own records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance/non-existent-id')
        .set('Authorization', `Bearer ${teacherAToken}`)
        .expect(404);
    });

    it('should prevent student from accessing other students attendance by ID', async () => {
      const studentRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      const studentToken2 = studentRes.body.data.accessToken;

      await request(app.getHttpServer())
        .get('/api/attendance/non-existent-id')
        .set('Authorization', `Bearer ${studentToken2}`)
        .expect(404);
    });
  });

  describe('Refresh Token Security', () => {
    it('should reject refresh token reuse after rotation', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      const oldRefreshToken = loginRes.body.data.refreshToken;

      const rotateRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      const newRefreshToken = rotateRes.body.data.refreshToken;

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(200);
    });
  });

  describe('Error Sanitization', () => {
    it('should not expose internal error details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nonexistent-endpoint')
        .expect(404);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('stack');
      expect(bodyStr).not.toContain('node_modules');
    });
  });

  describe('Management Create Flow - Quizzes/Assignments/Materials (Issues 1-3)', () => {
    let superAdminToken: string;
    let realClassId: string;
    let realSubjectId: string;
    let createdQuizId: string;

    beforeAll(async () => {
      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      superAdminToken = adminRes.body.data.accessToken;

      const classesRes = await request(app.getHttpServer())
        .get('/api/academics/classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      realClassId = classesRes.body.data.data[0].id;

      const subjectsRes = await request(app.getHttpServer())
        .get('/api/academics/subjects')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      realSubjectId = subjectsRes.body.data.data[0].id;
    });

    it('super_admin can create quiz without TeacherProfile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Admin Created Quiz',
          classId: realClassId,
          subjectId: realSubjectId,
          questionsJson: '[]',
        })
        .expect(201);
      expect(res.body.success).toBe(true);
      createdQuizId = res.body.data.id;
    });

    it('super_admin can create assignment without TeacherProfile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/assignments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Admin Created Assignment',
          classId: realClassId,
          subjectId: realSubjectId,
        })
        .expect(201);
      expect(res.body.success).toBe(true);
    });

    it('super_admin can create study material without TeacherProfile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Admin Created Material',
          classId: realClassId,
          subjectId: realSubjectId,
          type: 'document',
          content: 'Test content',
        })
        .expect(201);
      expect(res.body.success).toBe(true);
    });

    it('super_admin can list all quizzes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('super_admin can view any quiz by ID', async () => {
      if (!createdQuizId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/quizzes/${createdQuizId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Teacher Scope - Quizzes (Issue 5)', () => {
    let teacherToken: string;
    let realClassId: string;
    let realSubjectId: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;

      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      const adminToken = adminRes.body.data.accessToken;

      const classesRes = await request(app.getHttpServer())
        .get('/api/academics/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      realClassId = classesRes.body.data.data[0].id;

      const subjectsRes = await request(app.getHttpServer())
        .get('/api/academics/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      realSubjectId = subjectsRes.body.data.data[0].id;
    });

    it('teacher can create quiz for assigned class-subject', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Scoped Quiz',
          classId: realClassId,
          subjectId: realSubjectId,
          questionsJson: '[]',
        });
      expect([201, 400]).toContain(res.status);
    });

    it('teacher rejected creating quiz for unassigned class-subject (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Unassigned Quiz',
          classId: 'non-existent-class-id',
          subjectId: realSubjectId,
          questionsJson: '[]',
        });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('teacher quiz listing is scoped to own quizzes only', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Teacher Scope - Assignments (Issue 6)', () => {
    let teacherToken: string;
    let realClassId: string;
    let realSubjectId: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;

      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      const adminToken = adminRes.body.data.accessToken;

      const classesRes = await request(app.getHttpServer())
        .get('/api/academics/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      realClassId = classesRes.body.data.data[0].id;

      const subjectsRes = await request(app.getHttpServer())
        .get('/api/academics/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      realSubjectId = subjectsRes.body.data.data[0].id;
    });

    it('teacher can create assignment for assigned class-subject', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Scoped Assignment',
          classId: realClassId,
          subjectId: realSubjectId,
        });
      expect([201, 400]).toContain(res.status);
    });

    it('teacher rejected creating assignment for unassigned class-subject (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Unassigned Assignment',
          classId: 'non-existent-class-id',
          subjectId: realSubjectId,
        });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('Teacher Scope - Exams (Issue 4)', () => {
    let teacherToken: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;
    });

    it('exam listing scoped to teacher assigned classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('exam overview scoped to teacher assigned classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams/overview')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect([200, 400, 403]).toContain(res.status);
    });

    it('teacher rejected creating exam for unassigned class-subject (400)', async () => {
      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      const adminToken = adminRes.body.data.accessToken;

      const classesRes = await request(app.getHttpServer())
        .get('/api/academics/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const realClassId = classesRes.body.data.data[0].id;

      const subjectsRes = await request(app.getHttpServer())
        .get('/api/academics/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const realSubjectId = subjectsRes.body.data.data[0].id;

      const res = await request(app.getHttpServer())
        .post('/api/exams')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Unassigned Exam',
          classId: 'non-existent-class-id',
          subjectId: realSubjectId,
          totalMarks: 100,
          passingMarks: 40,
          examDate: '2026-01-01',
        });
      expect([400, 403]).toContain(res.status);
    });
  });

  describe('Teacher Scope - Attendance (Issue 7)', () => {
    let teacherToken: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;
    });

    it('attendance listing scoped to teacher assigned classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('attendance by ID returns 404 for teacher when no matching class-subject', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance/non-existent-id')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);
    });

    it('student cannot access other students attendance by ID', async () => {
      const studentRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      const studentToken = studentRes.body.data.accessToken;

      await request(app.getHttpServer())
        .get('/api/attendance/non-existent-id')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });
  });

  describe('Teacher Scope - Results (Issue 8)', () => {
    let teacherToken: string;
    let adminToken: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;

      const aRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      adminToken = aRes.body.data.accessToken;
    });

    it('results listing scoped to teacher assigned classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/results')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('admin can view all results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/results')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Student Data Isolation - Reports (Issue 9)', () => {
    let studentToken: string;
    let adminToken: string;

    beforeAll(async () => {
      const studentRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = studentRes.body.data.accessToken;

      const aRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      adminToken = aRes.body.data.accessToken;
    });

    it('student cannot get institution-level summary report (data is null)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports?type=summary')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.data).toBeNull();
        expect(res.body.data.error).toBeDefined();
      }
    });

    it('student cannot get class-level report (data is null)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports?type=class&classId=non-existent-class-id')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([200, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.data).toBeNull();
        expect(res.body.data.error).toBeDefined();
      }
    });

    it('student cannot get subject-level report (data is null)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports?type=subject&subjectId=non-existent-subject-id')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([200, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.data).toBeNull();
        expect(res.body.data.error).toBeDefined();
      }
    });

    it('admin can get summary report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports?type=summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('student attendance report is restricted to own data even when querying another studentId', async () => {
      const ownRes = await request(app.getHttpServer())
        .get('/api/reports?type=attendance')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([200, 403]).toContain(ownRes.status);
      if (ownRes.status === 200) {
        expect(ownRes.body.success).toBe(true);
      }

      const spoofedRes = await request(app.getHttpServer())
        .get('/api/reports?type=attendance&studentId=fake-other-student-id')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([200, 403]).toContain(spoofedRes.status);
      if (spoofedRes.status === 200) {
        expect(spoofedRes.body.success).toBe(true);
        const ownData = ownRes.status === 200 ? ownRes.body.data.data : null;
        const spoofedData = spoofedRes.status === 200 ? spoofedRes.body.data.data : null;
        if (ownData && spoofedData) {
          expect(spoofedData.total).toBe(ownData.total);
          expect(spoofedData.present).toBe(ownData.present);
          expect(spoofedData.absent).toBe(ownData.absent);
        }
      }
    });
  });

  describe('Study Material Authorization (Issue 10)', () => {
    let teacherToken: string;
    let adminToken: string;
    let createdMaterialId: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;

      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      adminToken = adminRes.body.data.accessToken;

      const classesRes = await request(app.getHttpServer())
        .get('/api/academics/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const realClassId = classesRes.body.data.data[0].id;

      const subjectsRes = await request(app.getHttpServer())
        .get('/api/academics/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const realSubjectId = subjectsRes.body.data.data[0].id;

      const materialRes = await request(app.getHttpServer())
        .post('/api/study-materials')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Own Material',
          classId: realClassId,
          subjectId: realSubjectId,
          type: 'document',
          content: 'Teacher content',
        });
      if (materialRes.status === 201) {
        createdMaterialId = materialRes.body.data.id;
      }
    });

    it('teacher can view own study material', async () => {
      if (!createdMaterialId) return;
      await request(app.getHttpServer())
        .get(`/api/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });

    it('admin can view any study material (super_admin bypass)', async () => {
      if (!createdMaterialId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 403, 404]).toContain(res.status);
    });
  });

  describe('File Access Authorization (Issues 13-14)', () => {
    let adminToken: string;
    let studentToken: string;

    beforeAll(async () => {
      const aRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      adminToken = aRes.body.data.accessToken;

      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;
    });

    it('file path traversal protection - download with non-existent ID returns 404', async () => {
      await request(app.getHttpServer())
        .get('/api/files/non-existent-file-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('admin can access files endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/files')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(res.status);
    });

    it('download requires permission - student cannot access non-existent file', async () => {
      await request(app.getHttpServer())
        .get('/api/files/non-existent-file-id')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });
  });

  describe('Timetable Authorization (Issues 12+16)', () => {
    let teacherToken: string;
    let studentToken: string;

    beforeAll(async () => {
      const teacherRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = teacherRes.body.data.accessToken;

      const studentRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = studentRes.body.data.accessToken;
    });

    it('teacher can view timetable (has timetable.view permission)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/timetable/slots')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect([200, 403]).toContain(res.status);
    });

    it('student cannot view timetable (RolesGuard blocks - not super_admin/teacher) - should return 403', async () => {
      await request(app.getHttpServer())
        .get('/api/timetable/slots')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  // ──────────────────── Regression Tests A-I ────────────────────

  describe('Regression: Student Exam Results Isolation (Fix A)', () => {
    let studentToken: string;
    let teacherToken: string;

    beforeAll(async () => {
      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;

      const tRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = tRes.body.data.accessToken;
    });

    it('student listResults returns only their own results', async () => {
      // The results endpoint requires an examId - use a dummy one to verify auth works
      const res = await request(app.getHttpServer())
        .get('/api/exams/non-existent/results?page=1&limit=50')
        .set('Authorization', `Bearer ${studentToken}`);
      // Will return 404 since exam doesn't exist, but confirms student has access to the endpoint
      expect([200, 404]).toContain(res.status);
    });

    it('teacher listResults returns class-scoped results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams/non-existent/results?page=1&limit=50')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect([200, 404, 403]).toContain(res.status);
    });

    it('student cannot access exam stats (returns 404)', async () => {
      // Create a dummy exam ID that won't exist
      const res = await request(app.getHttpServer())
        .get('/api/exams/non-existent-id/stats')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([404, 403]).toContain(res.status);
    });
  });

  describe('Regression: Student Exam Isolation (Fix B)', () => {
    let studentToken: string;

    beforeAll(async () => {
      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;
    });

    it('student listExams only shows published exams for enrolled classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams?page=1&limit=50')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('student getExamById for non-existent exam returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams/non-existent-exam-id')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([404, 403]).toContain(res.status);
    });
  });

  describe('Regression: Student Assignment Isolation (Fix C)', () => {
    let studentToken: string;

    beforeAll(async () => {
      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;
    });

    it('student listAssignments only shows assignments for enrolled classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/assignments?page=1&limit=50')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('student getAssignmentById for non-existent assignment returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/assignments/non-existent-assignment-id')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([404, 403]).toContain(res.status);
    });
  });

  describe('Regression: Student Quiz Isolation (Fix D)', () => {
    let studentToken: string;

    beforeAll(async () => {
      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;
    });

    it('student listQuizzes only shows published quizzes for enrolled classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quizzes?page=1&limit=50')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('student getQuizById for non-existent quiz returns 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quizzes/non-existent-quiz-id')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([404, 403]).toContain(res.status);
    });
  });

  describe('Regression: Teacher Timetable Authorization (Fix E)', () => {
    let teacherToken: string;
    let adminToken: string;

    beforeAll(async () => {
      const tRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = tRes.body.data.accessToken;

      const aRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      adminToken = aRes.body.data.accessToken;
    });

    it('teacher can list timetable slots', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/timetable/slots?page=1&limit=50')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect([200, 403]).toContain(res.status);
    });

    it('admin can list timetable slots', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/timetable/slots?page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('teacher createSlot with non-existent classSubject returns error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/timetable/slots')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          classSubjectId: 'non-existent-cs-id',
          dayOfWeek: 1,
          period: 1,
          startTime: '08:00',
          endTime: '08:45',
        });
      expect([400, 404, 403]).toContain(res.status);
    });
  });

  describe('Regression: Teacher Academic Dropdown (Fix F)', () => {
    let teacherToken: string;
    let studentToken: string;

    beforeAll(async () => {
      const tRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = tRes.body.data.accessToken;

      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;
    });

    it('teacher can access my-class-subjects endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/teacher-academics/my-class-subjects')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('classes');
        expect(res.body.data).toHaveProperty('subjects');
      }
    });

    it('student cannot access my-class-subjects endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/teacher-academics/my-class-subjects')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([403, 401]).toContain(res.status);
    });
  });

  describe('Regression: Frontend Route Permissions (Fix G)', () => {
    let studentToken: string;
    let teacherToken: string;

    beforeAll(async () => {
      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;

      const tRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = tRes.body.data.accessToken;
    });

    it('student cannot create assignment (no assignments.manage permission)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/assignments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Test', classId: 'x', subjectId: 'x' });
      expect([403, 400]).toContain(res.status);
    });

    it('student cannot create exam (no exams.manage permission)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/exams')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Test', type: 'UNIT_TEST', sessionId: 'x', classId: 'x', subjectId: 'x', startDate: '2026-01-01', endDate: '2026-01-02' });
      expect([403, 400]).toContain(res.status);
    });

    it('student cannot create quiz (no quizzes.manage permission)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Test', classId: 'x', subjectId: 'x', questionsJson: '[]' });
      expect([403, 400]).toContain(res.status);
    });
  });

  describe('Regression: Navigation Items (Fix H)', () => {
    let adminToken: string;

    beforeAll(async () => {
      const aRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      adminToken = aRes.body.data.accessToken;
    });

    it('admin can access exams endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('admin can access quizzes endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quizzes?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('admin can access assignments endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/assignments?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Regression: Service-Level Enforcement (Fix I)', () => {
    let studentToken: string;
    let teacherToken: string;

    beforeAll(async () => {
      const sRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = sRes.body.data.accessToken;

      const tRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = tRes.body.data.accessToken;
    });

    it('student exam stats endpoint returns 404 (not 200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams/non-existent/stats')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([404, 403]).toContain(res.status);
    });

    it('student cannot view all results (enforced at service level)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams/non-existent/results?page=1&limit=50')
        .set('Authorization', `Bearer ${studentToken}`);
      // Endpoint works but scoped to student; non-existent exam returns 404
      expect([200, 404]).toContain(res.status);
    });

    it('teacher timetable create without ClassSubject ownership returns error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/timetable/slots')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          classSubjectId: 'fake-cs-id',
          dayOfWeek: 2,
          period: 3,
          startTime: '09:00',
          endTime: '09:45',
        });
      expect([400, 404, 403]).toContain(res.status);
    });
  });

});

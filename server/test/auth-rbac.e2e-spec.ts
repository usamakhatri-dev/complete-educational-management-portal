import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import request from 'supertest';
import { createTestApp } from './test-app.helper.js';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return tokens for valid admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.role).toBe('super_admin');
      expect(res.body.data.permissions).toContain('users.list');
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'wrongpass' })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@eduportal.dev', password: 'Admin@123' })
        .expect(401);
    });

    it('should reject login with missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev' })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      accessToken = res.body.data.accessToken;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@eduportal.dev');
      expect(res.body.data.user.role).toBe('super_admin');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@eduportal.dev', password: 'Admin@123' });
      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject used refresh token (rotation)', async () => {
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

  describe('RBAC - Teachers cannot access admin endpoints', () => {
    let teacherToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'teacher@eduportal.dev', password: 'Teacher@123' });
      teacherToken = res.body.data.accessToken;
    });

    it('should return 403 for teacher accessing users.list', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('should return 403 for teacher accessing academics manage', async () => {
      await request(app.getHttpServer())
        .post('/api/academics/departments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'Test Dept', code: 'TST' })
        .expect(403);
    });

    it('should return 200 for teacher accessing permitted endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });
  });

  describe('RBAC - Students have restricted access', () => {
    let studentToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@eduportal.dev', password: 'Student@123' });
      studentToken = res.body.data.accessToken;
    });

    it('should return 403 for student accessing users.list', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should return 200 for student accessing announcements', async () => {
      await request(app.getHttpServer())
        .get('/api/announcements')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
    });

    it('should return 200 for student accessing their own attendance', async () => {
      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);
      const studentId = meRes.body.data.profile?.id;

      if (studentId) {
        await request(app.getHttpServer())
          .get(`/api/attendance/reports/student/${studentId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);
      } else {
        await request(app.getHttpServer())
          .get('/api/attendance/reports/student/non-existent-id')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(400);
      }
    });
  });
});

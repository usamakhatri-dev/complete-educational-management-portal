import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { AcademicsModule } from './modules/academics/academics.module.js';
import { PeopleModule } from './modules/people/people.module.js';
import { TimetableModule } from './modules/timetable/timetable.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { QuizzesModule } from './modules/quizzes/quizzes.module.js';
import { AssignmentsModule } from './modules/assignments/assignments.module.js';
import { ResultsModule } from './modules/results/results.module.js';
import { LettersModule } from './modules/letters/letters.module.js';
import { AnnouncementsModule } from './modules/announcements/announcements.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { BackupsModule } from './modules/backups/backups.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { StudyMaterialsModule } from './modules/study-materials/study-materials.module.js';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') ??
            '15m') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RbacModule,
    AcademicsModule,
    PeopleModule,
    TimetableModule,
    AttendanceModule,
    ExamsModule,
    QuizzesModule,
    AssignmentsModule,
    ResultsModule,
    LettersModule,
    AnnouncementsModule,
    NotificationsModule,
    MessagesModule,
    AnalyticsModule,
    ReportsModule,
    SettingsModule,
    BackupsModule,
    FilesModule,
    StudyMaterialsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}

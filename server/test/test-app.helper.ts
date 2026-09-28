import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from '../src/prisma/prisma.module.js';
import { AuditModule } from '../src/modules/audit/audit.module.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { UsersModule } from '../src/modules/users/users.module.js';
import { RbacModule } from '../src/modules/rbac/rbac.module.js';
import { AcademicsModule } from '../src/modules/academics/academics.module.js';
import { PeopleModule } from '../src/modules/people/people.module.js';
import { TimetableModule } from '../src/modules/timetable/timetable.module.js';
import { AttendanceModule } from '../src/modules/attendance/attendance.module.js';
import { ExamsModule } from '../src/modules/exams/exams.module.js';
import { QuizzesModule } from '../src/modules/quizzes/quizzes.module.js';
import { AssignmentsModule } from '../src/modules/assignments/assignments.module.js';
import { ResultsModule } from '../src/modules/results/results.module.js';
import { LettersModule } from '../src/modules/letters/letters.module.js';
import { AnnouncementsModule } from '../src/modules/announcements/announcements.module.js';
import { NotificationsModule } from '../src/modules/notifications/notifications.module.js';
import { MessagesModule } from '../src/modules/messages/messages.module.js';
import { AnalyticsModule } from '../src/modules/analytics/analytics.module.js';
import { ReportsModule } from '../src/modules/reports/reports.module.js';
import { SettingsModule } from '../src/modules/settings/settings.module.js';
import { BackupsModule } from '../src/modules/backups/backups.module.js';
import { FilesModule } from '../src/modules/files/files.module.js';
import { StudyMaterialsModule } from '../src/modules/study-materials/study-materials.module.js';

import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { PermissionsGuard } from '../src/common/guards/permissions.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

export async function createTestApp(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      JwtModule.registerAsync({
        global: true,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          secret: config.get<string>('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') ??
              '15m') as string,
          },
        }),
      }),
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
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
      { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    ],
  }).compile();
}

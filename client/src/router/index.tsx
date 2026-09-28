import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/app-shell';
import { RequireAuth, RequirePermission, RequireRole } from './guards';
import { Spinner } from '../components/ui/spinner';

const LoginPage = lazy(() => import('../pages/auth/login'));
const DashboardPage = lazy(() => import('../pages/dashboard'));
const UsersPage = lazy(() => import('../pages/users'));
const ActivityLogsPage = lazy(() => import('../pages/audit/activity-logs'));
const LoginHistoryPage = lazy(() => import('../pages/audit/login-history'));
const RolesPage = lazy(() => import('../pages/settings/roles'));
const AcademicsPage = lazy(() => import('../pages/academics'));
const PeoplePage = lazy(() => import('../pages/people'));
const TimetablePage = lazy(() => import('../pages/timetable'));
const AttendancePage = lazy(() => import('../pages/attendance'));
const ExamsPage = lazy(() => import('../pages/exams'));
const QuizzesPage = lazy(() => import('../pages/quizzes'));
const AssignmentsPage = lazy(() => import('../pages/assignments'));
const ResultsPage = lazy(() => import('../pages/results'));
const LettersPage = lazy(() => import('../pages/letters'));
const AnnouncementsPage = lazy(() => import('../pages/announcements'));
const NotificationsPage = lazy(() => import('../pages/notifications'));
const MessagesPage = lazy(() => import('../pages/messages'));
const AnalyticsPage = lazy(() => import('../pages/analytics'));
const ReportsPage = lazy(() => import('../pages/reports'));
const SettingsPage = lazy(() => import('../pages/settings'));
const BackupsPage = lazy(() => import('../pages/backups'));
const MaterialsPage = lazy(() => import('../pages/materials'));
const AssignmentCreatePage = lazy(() => import('../pages/assignments/create'));
const AssignmentDetailPage = lazy(() => import('../pages/assignments/detail'));
const AssignmentSubmissionsPage = lazy(() => import('../pages/assignments/submissions'));
const ExamCreatePage = lazy(() => import('../pages/exams/create'));
const ExamDetailPage = lazy(() => import('../pages/exams/detail'));
const ExamResultsPage = lazy(() => import('../pages/exams/results'));
const QuizCreatePage = lazy(() => import('../pages/quizzes/create'));
const QuizDetailPage = lazy(() => import('../pages/quizzes/detail'));
const QuizSubmissionsPage = lazy(() => import('../pages/quizzes/submissions'));
const ComingSoonPage = lazy(() => import('../pages/coming-soon'));
const NotFoundPage = lazy(() => import('../pages/not-found'));

const Loading = () => (
  <div className="flex h-screen items-center justify-center">
    <Spinner className="h-8 w-8" />
  </div>
);

const Page = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Loading />}>{children}</Suspense>
);

const soon = (title: string, description?: string) => (
  <ComingSoonPage title={title} description={description} />
);

export const router = createBrowserRouter([
  { path: '/login', element: <Page><LoginPage /></Page> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Page><DashboardPage /></Page> },

          {
            element: <RequireRole roles={['super_admin']} />,
            children: [
              { path: '/teachers', element: <Page><PeoplePage /></Page> },
              { path: '/students', element: <Page><PeoplePage /></Page> },
              {
                element: <RequirePermission permission="users.list" />,
                children: [{ path: '/users', element: <Page><UsersPage /></Page> }],
              },
              { path: '/academics', element: <Page><AcademicsPage /></Page> },
            ],
          },

          {
            element: <RequirePermission permission="timetable.view" />,
            children: [{ path: '/timetable', element: <Page><TimetablePage /></Page> }],
          },

          {
            element: <RequirePermission permission="attendance.view-own" />,
            children: [{ path: '/attendance', element: <Page><AttendancePage /></Page> }],
          },
          {
            element: <RequirePermission permission="assignments.submit" />,
            children: [
              { path: '/assignments', element: <Page><AssignmentsPage /></Page> },
              { path: '/assignments/:id', element: <Page><AssignmentDetailPage /></Page> },
            ],
          },
          {
            element: <RequirePermission permission="assignments.manage" />,
            children: [
              { path: '/assignments/new', element: <Page><AssignmentCreatePage /></Page> },
              { path: '/assignments/:id/submissions', element: <Page><AssignmentSubmissionsPage /></Page> },
            ],
          },
          {
            element: <RequirePermission permission="exams.view" />,
            children: [
              { path: '/exams', element: <Page><ExamsPage /></Page> },
              { path: '/exams/:id', element: <Page><ExamDetailPage /></Page> },
              { path: '/exams/:id/results', element: <Page><ExamResultsPage /></Page> },
            ],
          },
          {
            element: <RequirePermission permission="exams.manage" />,
            children: [
              { path: '/exams/new', element: <Page><ExamCreatePage /></Page> },
            ],
          },
          {
            element: <RequirePermission permission="letters.submit" />,
            children: [{ path: '/letters', element: <Page><LettersPage /></Page> }],
          },
          {
            element: <RequirePermission permission="quizzes.attempt" />,
            children: [
              { path: '/quizzes', element: <Page><QuizzesPage /></Page> },
              { path: '/quizzes/:id', element: <Page><QuizDetailPage /></Page> },
            ],
          },
          {
            element: <RequirePermission permission="quizzes.manage" />,
            children: [
              { path: '/quizzes/new', element: <Page><QuizCreatePage /></Page> },
              { path: '/quizzes/:id/submissions', element: <Page><QuizSubmissionsPage /></Page> },
            ],
          },
          {
            element: <RequirePermission permission="results.view" />,
            children: [{ path: '/results', element: <Page><ResultsPage /></Page> }],
          },
          {
            element: <RequirePermission permission="reports.generate" />,
            children: [{ path: '/reports', element: <Page><ReportsPage /></Page> }],
          },
          {
            element: <RequirePermission permission="announcements.view" />,
            children: [{ path: '/announcements', element: <Page><AnnouncementsPage /></Page> }],
          },
          {
            element: <RequirePermission permission="notifications.view" />,
            children: [{ path: '/notifications', element: <Page><NotificationsPage /></Page> }],
          },
          {
            element: <RequirePermission permission="messages.view" />,
            children: [{ path: '/messages', element: <Page><MessagesPage /></Page> }],
          },
          {
            element: <RequirePermission permission="materials.view" />,
            children: [{ path: '/materials', element: <Page><MaterialsPage /></Page> }],
          },
          {
            element: <RequireRole roles={['teacher', 'student']} />,
            children: [{ path: '/my-classes', element: <Page>{soon('My Classes', 'Class dashboard')}</Page> }],
          },
          {
            element: <RequirePermission permission="analytics.view" />,
            children: [{ path: '/analytics', element: <Page><AnalyticsPage /></Page> }],
          },
          {
            element: <RequirePermission permission="audit.view" />,
            children: [{ path: '/audit/logs', element: <Page><ActivityLogsPage /></Page> }],
          },
          {
            element: <RequirePermission permission="login-history.view" />,
            children: [{ path: '/audit/login-history', element: <Page><LoginHistoryPage /></Page> }],
          },
          {
            element: <RequirePermission permission="users.list" />,
            children: [{ path: '/settings/roles', element: <Page><RolesPage /></Page> }],
          },
          {
            element: <RequirePermission permission="settings.manage" />,
            children: [{ path: '/settings', element: <Page><SettingsPage /></Page> }],
          },
          {
            element: <RequirePermission permission="backups.manage" />,
            children: [{ path: '/settings/backups', element: <Page><BackupsPage /></Page> }],
          },

          { path: '*', element: <Page><NotFoundPage /></Page> },
        ],
      },
    ],
  },
]);

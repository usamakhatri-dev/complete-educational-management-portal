import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, BookOpen, ClipboardCheck, FileText, Award, TrendingUp, AlertTriangle } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuthStore } from '../../stores/auth';

interface DashboardData {
  overview?: {
    totalStudents?: number;
    totalTeachers?: number;
    totalClasses?: number;
    totalSections?: number;
    totalSubjects?: number;
    activeSession?: { name: string } | null;
    totalExams?: number;
    publishedExams?: number;
    totalQuizzes?: number;
    totalAssignments?: number;
    totalResults?: number;
    attendanceRate?: number;
    pendingLetters?: number;
    totalLetters?: number;
    totalAnnouncements?: number;
    unreadNotifications?: number;
    classesCount?: number;
    subjectsCount?: number;
    pendingGrading?: number;
    avgPercentage?: number;
    passRate?: number;
    totalExamResults?: number;
    student?: { name: string; rollNumber: string };
    enrollment?: { class: string; section: string } | null;
  };
  examPerformance?: { totalResults: number; avgPercentage: number; passRate: number };
  gradeDistribution?: Record<string, number>;
  classPerformance?: Array<{ id: string; name: string; strength: number }>;
  subjectPerformance?: Array<{ id?: string; name: string; class?: { name: string }; subject?: { name: string }; percentage?: number; avgPercentage?: number }>;
  recentActivity?: Array<{ id: string; action: string; module: string; createdAt: string; user?: { fullName: string } }>;
}

export default function AnalyticsPage() {
  const role = useAuthStore((s) => s.user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', role],
    queryFn: () => unwrap<DashboardData>(api.get('/analytics/dashboard')),
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">No data available</div>;

  const o = data.overview || {};

  if (role === 'student') return <StudentView data={data} />;
  if (role === 'teacher') return <TeacherView data={data} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Institution-wide overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{o.totalStudents || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{o.totalTeachers || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{o.totalClasses || 0}</div><p className="text-xs text-muted-foreground">{o.totalSections || 0} sections</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{o.attendanceRate || 0}%</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{o.totalExams || 0}</div><p className="text-xs text-muted-foreground">{o.publishedExams || 0} published</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.examPerformance?.avgPercentage || 0}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.examPerformance?.passRate || 0}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{o.pendingLetters || 0}</div><p className="text-xs text-muted-foreground">letters pending</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            {data.gradeDistribution && Object.keys(data.gradeDistribution).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(data.gradeDistribution).sort(([a], [b]) => a.localeCompare(b)).map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-medium">{grade}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, ((count as number) / (data.examPerformance?.totalResults || 1)) * 100)}%` }} />
                    </div>
                    <span className="w-8 text-sm text-muted-foreground text-right">{count as number}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No grade data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {data.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-2">
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground">{a.module}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No recent activity</p>}
          </CardContent>
        </Card>
      </div>

      {data.classPerformance && data.classPerformance.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Classes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.classPerformance.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.strength} students</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeacherView({ data }: { data: DashboardData }) {
  const o = data.overview || {};
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1><p className="text-muted-foreground">Your classes and subjects overview</p></div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">My Students</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.totalStudents || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Classes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.classesCount || 0}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Attendance Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.attendanceRate || 0}%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending Grading</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.pendingGrading || 0}</div></CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Performance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.avgPercentage || 0}%</div><p className="text-xs text-muted-foreground">Pass rate: {o.passRate || 0}%</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Exam Results</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.totalExamResults || 0}</div></CardContent></Card>
      </div>
      {data.subjectPerformance && data.subjectPerformance.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm font-medium">Subject Performance</CardTitle></CardHeader><CardContent><div className="space-y-2">{data.subjectPerformance.map((s, i) => (
          <div key={i} className="flex items-center justify-between p-2 border rounded">
            <div><span className="font-medium">{s.subject?.name || s.name}</span><span className="text-sm text-muted-foreground ml-2">({s.class?.name})</span></div>
            <span className="text-sm font-medium">{s.avgPercentage || s.percentage || 0}%</span>
          </div>
        ))}</div></CardContent></Card>
      )}
    </div>
  );
}

function StudentView({ data }: { data: DashboardData }) {
  const o = data.overview || {};
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">My Analytics</h1><p className="text-muted-foreground">{o.student?.name} - {o.student?.rollNumber}</p></div>
      {o.enrollment && <p className="text-sm text-muted-foreground">Class: {o.enrollment.class} | Section: {o.enrollment.section}</p>}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Attendance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.attendanceRate || 0}%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Score</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.avgPercentage || 0}%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pass Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{o.passRate || 0}%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Assessments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(o.totalExams || 0) + (o.totalQuizzes || 0) + (o.totalAssignments || 0)}</div></CardContent></Card>
      </div>
      {data.subjectPerformance && data.subjectPerformance.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm font-medium">Subject Performance</CardTitle></CardHeader><CardContent><div className="space-y-2">{data.subjectPerformance.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="font-medium w-32">{s.subject?.name || s.name}</span>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.percentage || 0}%` }} /></div>
            <span className="w-12 text-sm text-right">{s.percentage || 0}%</span>
          </div>
        ))}</div></CardContent></Card>
      )}
    </div>
  );
}

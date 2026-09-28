import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/auth';

interface ReportData {
  type: string;
  generatedAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  class?: { name: string };
  subject?: { name: string };
  student?: { name: string; email: string; rollNumber: string; class: string; section: string };
}

export default function ReportsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [reportType, setReportType] = useState(role === 'student' ? 'student' : 'summary');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', reportType],
    queryFn: () => unwrap<ReportData>(api.get('/reports', { params: { type: reportType } })),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and view academic reports</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <div className="flex gap-4 mt-4">
            <Select value={reportType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReportType(e.target.value)}>
              {role !== 'student' && <option value="summary">Institution Summary</option>}
              <option value="student">Student Report</option>
              {role !== 'student' && <option value="class">Class Report</option>}
              {role !== 'student' && <option value="subject">Subject Report</option>}
              <option value="attendance">Attendance Report</option>
            </Select>
            <Button onClick={() => refetch()}>Generate</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Generating report...</div>
          ) : !data ? (
            <div className="text-center py-8 text-muted-foreground">No report data</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Report Type: {data.type} | Generated: {new Date(data.generatedAt).toLocaleString()}
              </div>

              {data.type === 'SUMMARY' && data.data && (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Students</p><p className="text-2xl font-bold">{data.data.totalStudents as number || 0}</p></div>
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Teachers</p><p className="text-2xl font-bold">{data.data.totalTeachers as number || 0}</p></div>
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Attendance</p><p className="text-2xl font-bold">{data.data.attendanceRate as number || 0}%</p></div>
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Pass Rate</p><p className="text-2xl font-bold">{data.data.passRate as number || 0}%</p></div>
                </div>
              )}

              {data.type === 'STUDENT' && data.student && (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium">{data.student.name}</h3>
                    <p className="text-sm text-muted-foreground">{data.student.email} | Roll: {data.student.rollNumber} | Class: {data.student.class} - {data.student.section}</p>
                  </div>
                  {data.data && (
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Attendance</p><p className="text-2xl font-bold">{data.data.attendanceRate as number || 0}%</p></div>
                      <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Avg Score</p><p className="text-2xl font-bold">{data.data.avgPercentage as number || 0}%</p></div>
                      <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Pass Rate</p><p className="text-2xl font-bold">{data.data.passRate as number || 0}%</p></div>
                      <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Exams</p><p className="text-2xl font-bold">{data.data.totalExams as number || 0}</p></div>
                    </div>
                  )}
                  {data.data?.exams && Array.isArray(data.data.exams) && data.data.exams.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Exam Results</h4>
                      <div className="space-y-1">
                        {data.data.exams.map((e: Record<string, unknown>, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                            <span>{e.name as string} <span className="text-muted-foreground">({e.subject as string})</span></span>
                            <span>{e.marks as number}/{e.total as number} - {e.grade as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {data.type === 'CLASS' && data.class && data.data && (
                <div className="space-y-4">
                  <h3 className="font-medium">Class: {data.class.name}</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Students</p><p className="text-2xl font-bold">{data.data.totalStudents as number || 0}</p></div>
                    <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Avg Performance</p><p className="text-2xl font-bold">{data.data.avgPercentage as number || 0}%</p></div>
                    <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Pass Rate</p><p className="text-2xl font-bold">{data.data.passRate as number || 0}%</p></div>
                  </div>
                </div>
              )}

              {data.type === 'SUBJECT' && data.subject && data.data && (
                <div className="space-y-4">
                  <h3 className="font-medium">Subject: {data.subject.name}</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Results</p><p className="text-2xl font-bold">{data.data.totalResults as number || 0}</p></div>
                    <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Avg Performance</p><p className="text-2xl font-bold">{data.data.avgPercentage as number || 0}%</p></div>
                    <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Pass Rate</p><p className="text-2xl font-bold">{data.data.passRate as number || 0}%</p></div>
                  </div>
                </div>
              )}

              {data.type === 'ATTENDANCE' && data.data && (
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{data.data.total as number || 0}</p></div>
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Present</p><p className="text-2xl font-bold text-green-600">{data.data.present as number || 0}</p></div>
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Absent</p><p className="text-2xl font-bold text-red-600">{data.data.absent as number || 0}</p></div>
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Late</p><p className="text-2xl font-bold text-yellow-600">{data.data.late as number || 0}</p></div>
                  <div className="p-4 border rounded-lg"><p className="text-sm text-muted-foreground">Rate</p><p className="text-2xl font-bold">{data.data.attendanceRate as number || 0}%</p></div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

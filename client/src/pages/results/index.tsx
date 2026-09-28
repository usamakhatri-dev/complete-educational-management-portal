import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, BookOpen, FileText, GraduationCap, Search, Users } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { useAuthStore } from '../../stores/auth';
import type { ResultItem, ResultsOverview, StudentResultDetail, ClassResultSummary, SubjectResultSummary, AcademicClass, Subject } from '../../types';

type Tab = 'overview' | 'student' | 'class' | 'subject';

export default function ResultsPage() {
  const { user, profile } = useAuthStore();
  const isStudent = user?.role === 'student';

  const [tab, setTab] = useState<Tab>(isStudent ? 'student' : 'overview');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentSearchId, setStudentSearchId] = useState('');
  const [search, setSearch] = useState('');

  const effectiveStudentId = isStudent && profile && 'rollNumber' in profile ? profile.id : studentSearchId;

  const { data: overview } = useQuery({
    queryKey: ['results-overview'],
    queryFn: () => unwrap<ResultsOverview>(api.get('/results/overview')),
  });

  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => unwrap<{ data: AcademicClass[] }>(api.get('/academics/classes', { params: { page: 1, limit: 100 } })),
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: () => unwrap<{ data: Subject[] }>(api.get('/academics/subjects', { params: { page: 1, limit: 100 } })),
  });

  const { data: studentResult, isLoading: studentLoading } = useQuery({
    queryKey: ['student-result', effectiveStudentId],
    queryFn: () => unwrap<StudentResultDetail>(api.get('/results/student', { params: { studentId: effectiveStudentId } })),
    enabled: !!effectiveStudentId && tab === 'student',
  });

  const { data: classResult, isLoading: classLoading } = useQuery({
    queryKey: ['class-result', classId],
    queryFn: () => unwrap<ClassResultSummary>(api.get('/results/class', { params: { classId } })),
    enabled: !!classId && tab === 'class',
  });

  const { data: subjectResult, isLoading: subjectLoading } = useQuery({
    queryKey: ['subject-result', subjectId],
    queryFn: () => unwrap<SubjectResultSummary>(api.get('/results/subject', { params: { subjectId } })),
    enabled: !!subjectId && tab === 'subject',
  });

  const { data: allResults, isLoading: resultsLoading } = useQuery({
    queryKey: ['results-list', search],
    queryFn: () => unwrap<{ data: ResultItem[]; meta: any }>(api.get('/results', { params: { page: 1, limit: 50, ...(search ? { search } : {}) } })),
    enabled: tab === 'overview',
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = isStudent
    ? [{ key: 'student', label: 'My Results', icon: <GraduationCap className="h-4 w-4" /> }]
    : [
        { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
        { key: 'student', label: 'Student Results', icon: <GraduationCap className="h-4 w-4" /> },
        { key: 'class', label: 'Class Results', icon: <Users className="h-4 w-4" /> },
        { key: 'subject', label: 'Subject Results', icon: <BookOpen className="h-4 w-4" /> },
      ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results & Reports</h1>
          <p className="text-muted-foreground">Academic performance, grades, and assessment reports</p>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Results</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{overview?.totalResults || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{overview?.passRate ? `${overview.passRate}%` : 'N/A'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{overview?.averagePercentage ? `${overview.averagePercentage}%` : 'N/A'}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{overview?.publishedExamResults || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalExams || 0}</div>
                <p className="text-xs text-muted-foreground">{overview?.totalExamResults || 0} results entered</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalQuizSubmissions || 0}</div>
                <p className="text-xs text-muted-foreground">submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalAssignmentSubmissions || 0}</div>
                <p className="text-xs text-muted-foreground">submissions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search results..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="pl-10 max-w-sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !allResults?.data?.length ? (
                <div className="text-center py-8 text-muted-foreground">No results found</div>
              ) : (
                <div className="space-y-2">
                  {allResults.data.map((r: ResultItem) => (
                    <div key={`${r.type}-${r.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.type === 'EXAM' ? 'bg-blue-100 text-blue-800' : r.type === 'QUIZ' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>
                            {r.type}
                          </span>
                          <h3 className="font-medium text-sm">{r.assessmentName}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {r.studentName} | {r.subject?.name} | {r.class?.name}
                        </div>
                      </div>
                      <div className="text-right">
                        {r.marksObtained != null && r.totalMarks > 0 ? (
                          <>
                            <div className="font-medium">{r.marksObtained}/{r.totalMarks}</div>
                            <div className="text-xs text-muted-foreground">{r.percentage}% | {r.grade}</div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">Ungraded</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'student' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isStudent ? 'My Results' : 'Student Result Lookup'}</CardTitle>
              <div className="mt-4">
                {isStudent ? (
                  <p className="text-sm text-muted-foreground">Viewing your academic performance</p>
                ) : (
                  <Input placeholder="Enter Student ID..." value={studentSearchId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentSearchId(e.target.value)} className="max-w-sm" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {studentLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !studentResult ? (
                <div className="text-center py-8 text-muted-foreground">{effectiveStudentId ? 'Student not found' : 'Enter a student ID to view results'}</div>
              ) : (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg">{studentResult.student.name}</h3>
                    <p className="text-sm text-muted-foreground">Roll: {studentResult.student.rollNumber} | Email: {studentResult.student.email}</p>
                    {studentResult.student.enrollments.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Class: {studentResult.student.enrollments[0].class?.name} | Section: {studentResult.student.enrollments[0].section?.name || 'N/A'}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{studentResult.summary.percentage}%</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Grade</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{studentResult.summary.grade}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">GPA</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{studentResult.summary.gpa}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{studentResult.summary.passRate}%</div>
                        <p className="text-xs text-muted-foreground">{studentResult.summary.passedExams}/{studentResult.summary.totalExams} exams passed</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader><CardTitle>Subject Performance</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {studentResult.subjects.map((s) => (
                          <div key={s.subject.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{s.subject.name} ({s.subject.code})</h4>
                                <p className="text-xs text-muted-foreground">
                                  {s.exams.length} exams | {s.quizzes.length} quizzes | {s.assignments.length} assignments
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{s.percentage}%</div>
                                <div className={`text-sm font-medium ${s.percentage >= 40 ? 'text-green-600' : 'text-red-600'}`}>{s.grade}</div>
                              </div>
                            </div>
                            <div className="mt-2 w-full bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'class' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Performance</CardTitle>
              <div className="mt-4">
                <Select value={classId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClassId(e.target.value)}>
                  <option value="">Select a class</option>
                  {classes?.data?.map((c: AcademicClass) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {classLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !classResult ? (
                <div className="text-center py-8 text-muted-foreground">{classId ? 'No data available' : 'Select a class to view results'}</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Students</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{classResult.summary.totalStudents}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{classResult.summary.averagePercentage}%</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{classResult.summary.passRate}%</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Grade Dist.</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(classResult.summary.gradeDistribution).map(([g, c]) => (
                            <span key={g} className="px-1.5 py-0.5 bg-muted rounded text-xs">{g}: {c}</span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Student Rankings</h3>
                    <div className="space-y-2">
                      {classResult.students.map((s, i) => (
                        <div key={s.studentId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</span>
                            <div>
                              <h4 className="font-medium">{s.studentName}</h4>
                              <p className="text-xs text-muted-foreground">
                                {s.sectionName && `${s.sectionName} | `}
                                {s.examCount} exams | {s.passedExams} passed
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{s.percentage}%</div>
                            <div className={`text-sm font-medium ${s.percentage >= 40 ? 'text-green-600' : 'text-red-600'}`}>{s.grade}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'subject' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
              <div className="mt-4">
                <Select value={subjectId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubjectId(e.target.value)}>
                  <option value="">Select a subject</option>
                  {subjects?.data?.map((s: Subject) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {subjectLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !subjectResult ? (
                <div className="text-center py-8 text-muted-foreground">{subjectId ? 'No data available' : 'Select a subject to view results'}</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Students</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{subjectResult.summary.totalStudents}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{subjectResult.summary.averagePercentage}%</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                      </CardHeader>
                      <CardContent><div className="text-2xl font-bold">{subjectResult.summary.passRate}%</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">{subjectResult.summary.totalExams} exams | {subjectResult.summary.totalQuizzes} quizzes | {subjectResult.summary.totalAssignments} assignments</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Student Performance</h3>
                    <div className="space-y-2">
                      {subjectResult.students.map((s, i) => (
                        <div key={s.studentId} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</span>
                              <div>
                                <h4 className="font-medium">{s.studentName}</h4>
                                <p className="text-xs text-muted-foreground">{s.className} | {s.exams.length} exams | {s.quizzes.length} quizzes | {s.assignments.length} assignments</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{s.percentage}%</div>
                              <div className={`text-sm font-medium ${s.percentage >= 40 ? 'text-green-600' : 'text-red-600'}`}>{s.grade}</div>
                            </div>
                          </div>
                          <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

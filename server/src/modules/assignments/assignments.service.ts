import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  ListAssignmentQuery,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  ListSubmissionQuery,
} from './dto/assignment.dto.js';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ──── Assignment CRUD ────

  async createAssignment(dto: CreateAssignmentDto, actor: { id: string; role: string; ip?: string }) {
    const teacherProfile = await this.getTeacherProfile(actor.id, actor.role);
    const cls = await this.prisma.academicClass.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Class not found');
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    if (teacherProfile) {
      await this.assertClassSubjectScope(teacherProfile.id, dto.classId, dto.subjectId);
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        classId: dto.classId,
        sectionId: dto.sectionId || null,
        subjectId: dto.subjectId,
        teacherId: teacherProfile?.id ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        totalMarks: dto.totalMarks ?? 20,
        allowLate: dto.allowLate ?? false,
        attachmentIds: dto.attachmentIds || null,
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });

    await this.audit.log('assignments.create', 'assignments', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: assignment.id,
      meta: { title: dto.title, subjectId: dto.subjectId },
    });

    return assignment;
  }

  async listAssignments(query: ListAssignmentQuery, actor: { id: string; role: string }) {
    const where: Record<string, unknown> = {};

    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile) where.teacherId = profile.id;
    } else if (actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const enrollments = await this.prisma.studentEnrollment.findMany({
          where: { studentId: profile.id, status: 'ACTIVE' },
          select: { classId: true },
        });
        where.classId = { in: enrollments.map((e) => e.classId) };
      }
    }

    if (query.classId) where.classId = query.classId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          class: { select: { id: true, name: true, code: true } },
          subject: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return {
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getAssignmentById(id: string, actor?: { id: string; role: string }) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Teachers can only access their own assignments
    if (actor && actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && assignment.teacherId !== profile.id) {
        throw new NotFoundException('Assignment not found');
      }
    }

    // Students can only access assignments for their enrolled classes
    if (actor && actor.role === 'student') {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
      if (profile) {
        const enrollment = await this.prisma.studentEnrollment.findFirst({
          where: { studentId: profile.id, classId: assignment.classId, status: 'ACTIVE' },
        });
        if (!enrollment) throw new NotFoundException('Assignment not found');
      }
    }

    return assignment;
  }

  async updateAssignment(id: string, dto: UpdateAssignmentDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.assignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');

    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && existing.teacherId !== profile.id) {
        throw new BadRequestException('You can only edit your own assignments');
      }
    }

    const assignment = await this.prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.totalMarks !== undefined && { totalMarks: dto.totalMarks }),
        ...(dto.allowLate !== undefined && { allowLate: dto.allowLate }),
        ...(dto.attachmentIds !== undefined && { attachmentIds: dto.attachmentIds }),
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    await this.audit.log('assignments.update', 'assignments', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { changes: dto },
    });

    return assignment;
  }

  async deleteAssignment(id: string, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.assignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');

    if (actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && existing.teacherId !== profile.id) {
        throw new BadRequestException('You can only delete your own assignments');
      }
    }

    const hasSubmissions = await this.prisma.assignmentSubmission.count({ where: { assignmentId: id } });
    if (hasSubmissions > 0) {
      throw new BadRequestException('Cannot delete assignment with existing submissions');
    }

    await this.prisma.assignment.delete({ where: { id } });

    await this.audit.log('assignments.delete', 'assignments', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { title: existing.title },
    });

    return { message: 'Assignment deleted' };
  }

  // ──── Assignment Submissions ────

  async submitAssignment(assignmentId: string, dto: SubmitAssignmentDto, actor: { id: string; role: string; ip?: string }) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: actor.id } });
    if (!profile) throw new BadRequestException('Student profile not found');

    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: { studentId: profile.id, classId: assignment.classId, status: 'ACTIVE' },
    });
    if (!enrollment) throw new BadRequestException('You are not enrolled in this assignments class');

    // Check late submission
    let isLate = false;
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      if (!assignment.allowLate) {
        throw new BadRequestException('Submission deadline has passed');
      }
      isLate = true;
    }

    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: profile.id } },
    });

    let submission;
    if (existing) {
      // Resubmit
      submission = await this.prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          submissionText: dto.submissionText ?? existing.submissionText,
          attachmentIds: dto.attachmentIds ?? existing.attachmentIds,
          isLate,
          status: 'RESUBMITTED',
        },
        include: {
          assignment: { select: { id: true, title: true, totalMarks: true } },
          student: { include: { user: { select: { id: true, fullName: true } } } },
        },
      });
    } else {
      submission = await this.prisma.assignmentSubmission.create({
        data: {
          assignmentId,
          studentId: profile.id,
          submissionText: dto.submissionText || null,
          attachmentIds: dto.attachmentIds || null,
          isLate,
          status: 'SUBMITTED',
        },
        include: {
          assignment: { select: { id: true, title: true, totalMarks: true } },
          student: { include: { user: { select: { id: true, fullName: true } } } },
        },
      });
    }

    await this.audit.log('assignments.submit', 'assignments', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: assignmentId,
      meta: { isLate },
    });

    return submission;
  }

  async listSubmissions(query: ListSubmissionQuery, actor?: { id: string; role: string }) {
    const where: Record<string, unknown> = {};
    if (query.assignmentId) where.assignmentId = query.assignmentId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;

    // Teachers can only see submissions for their own assignments
    if (actor && actor.role === 'teacher') {
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile) {
        const teacherAssignmentIds = await this.prisma.assignment.findMany({
          where: { teacherId: profile.id },
          select: { id: true },
        });
        where.assignmentId = { in: teacherAssignmentIds.map((a) => a.id) };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.assignmentSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          assignment: { select: { id: true, title: true, totalMarks: true, dueDate: true } },
          student: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        },
      }),
      this.prisma.assignmentSubmission.count({ where }),
    ]);

    return {
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async gradeSubmission(id: string, dto: GradeSubmissionDto, actor: { id: string; role: string; ip?: string }) {
    const existing = await this.prisma.assignmentSubmission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Submission not found');

    // Teachers can only grade submissions for their own assignments
    if (actor.role === 'teacher') {
      const assignment = await this.prisma.assignment.findUnique({ where: { id: existing.assignmentId } });
      const profile = await this.getTeacherProfile(actor.id, actor.role);
      if (profile && (!assignment || assignment.teacherId !== profile.id)) {
        throw new NotFoundException('Submission not found');
      }
    }

    const submission = await this.prisma.assignmentSubmission.update({
      where: { id },
      data: {
        ...(dto.marks !== undefined && { marks: dto.marks }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.feedback !== undefined && { feedback: dto.feedback }),
        ...(dto.status !== undefined && { status: dto.status }),
        gradedById: actor.id,
        gradedAt: new Date(),
      },
      include: {
        assignment: { select: { id: true, title: true, totalMarks: true } },
        student: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    await this.audit.log('assignments.grade', 'assignments', { userId: actor.id, role: actor.role, ip: actor.ip }, {
      entityId: id,
      meta: { changes: dto },
    });

    return submission;
  }

  // ──── Helpers ────

  private async getTeacherProfile(userId: string, role: string) {
    if (role === 'super_admin') return null;
    const profile = await this.prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Teacher profile not found');
    return profile;
  }

  private async assertClassSubjectScope(teacherProfileId: string, classId: string, subjectId: string) {
    const cs = await this.prisma.classSubject.findFirst({
      where: { teacherId: teacherProfileId, classId, subjectId },
    });
    if (!cs) throw new BadRequestException('You are not assigned to teach this class-subject combination');
  }
}

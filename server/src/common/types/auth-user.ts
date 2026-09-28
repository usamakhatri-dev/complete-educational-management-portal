export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  profileId?: string; // TeacherProfile.id or StudentProfile.id when applicable
  teacherId?: string;
  studentId?: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

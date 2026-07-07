export interface FaceStudentRow {
  id: string;
  code: string;
  name: string;
  classroom: string;
  templateCount: number;
}

export interface FaceTemplateView {
  id: string;
  /** Presigned MinIO URL, valid for a limited time. */
  imageUrl: string;
  createdAt: string;
}

export interface FaceStudentDetail {
  id: string;
  code: string;
  name: string;
  consent: boolean;
  consentAt: string | null;
  templates: FaceTemplateView[];
}

export interface ClassroomFaceMember {
  id: string;
  code: string;
  name: string;
  templateCount: number;
}

export interface ClassroomFaceProgress {
  classroomId: string;
  code: string;
  gradeLevel: string;
  total: number;
  /** Students in this room with at least one face photo. */
  enrolled: number;
  members: ClassroomFaceMember[];
}

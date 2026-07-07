import type { LineLinkStatus } from "@/features/line/types";

export interface GuardianRow {
  id: string;
  fullName: string;
  relation: string;
  phone: string | null;
  lineStatus: LineLinkStatus;
  /** Pending one-time LINE link code, shown so staff can pass it to the guardian. */
  linkCode: string | null;
}

export interface StudentGuardians {
  studentId: string;
  code: string;
  name: string;
  guardians: GuardianRow[];
}

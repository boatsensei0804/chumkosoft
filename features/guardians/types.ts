import type { LineLinkStatus } from "@/features/line/types";

export interface GuardianRow {
  id: string;
  fullName: string;
  relation: string;
  phone: string | null;
  prefix: string | null;
  nationalId: string | null;
  occupation: string | null;
  monthlyIncome: number | null;
  bloodType: string | null;
  lineStatus: LineLinkStatus;
  lineDisplayName: string | null;
  /** Pending one-time LINE link code, shown so staff can pass it to the guardian. */
  linkCode: string | null;
}

export interface StudentGuardians {
  studentId: string;
  code: string;
  name: string;
  /** Active-term classroom code, or "—" when not enrolled. */
  classroom: string;
  guardians: GuardianRow[];
  lineAccounts: { id: string; linked: boolean; linkCode: string | null; lineDisplayName: string | null }[];
}

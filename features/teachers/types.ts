export type StaffKind = "TEACHER" | "PERSONNEL" | "ADMIN";

export interface StaffSummary {
  id: string;
  code: string;
  prefix: string | null;
  firstName: string;
  lastName: string;
  type: StaffKind;
  position: string | null;
  email: string | null;
  /** Email on the linked login account, if this staff record can sign in. */
  loginEmail: string | null;
  phone: string | null;
  subjectsCount: number;

  // Government education-personnel record. Dates are ISO `yyyy-mm-dd` strings so
  // they can back a native <input type="date"> directly.
  birthDate: string | null;
  nationalId: string | null;
  positionNumber: string | null;
  salary: number | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;

  degreeBachelor: string | null;
  fieldBachelor: string | null;
  universityBachelor: string | null;
  degreeMaster: string | null;
  fieldMaster: string | null;
  universityMaster: string | null;
}

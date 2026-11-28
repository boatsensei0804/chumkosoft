export interface LiveScan {
  id: string;
  direction: "in" | "out";
  alreadyRecorded: boolean;
  firstName: string;
  time: string;
  visibleForMs: number;
}

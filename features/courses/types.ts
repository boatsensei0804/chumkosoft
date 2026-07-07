export interface CourseSummary {
  id: string;
  code: string;
  name: string;
  credits: number | null;
  description: string | null;
  offeringsCount: number;
}

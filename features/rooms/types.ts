export interface RoomRow {
  id: string;
  code: string;
  name: string | null;
  building: string | null;
  capacity: number | null;
  offeringCount: number;
}

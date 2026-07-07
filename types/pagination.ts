export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const DEFAULT_PAGE_SIZE = 20;

/** Clamps a raw ?page value to a valid 1-based page number. */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Builds a Paginated result from rows + total + the requested page/size. */
export function paginate<T>(rows: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

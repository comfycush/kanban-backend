/**
 * Return this from a controller handler so the response envelope includes
 * `meta.pagination` (after `data` = `items`).
 */
export type PaginatedListPayload<T> = {
  __envelope: 'paginated';
  items: T[];
  total: number;
  skip: number;
  take: number;
};

export function toPaginatedList<T>(
  items: T[],
  total: number,
  skip: number,
  take: number,
): PaginatedListPayload<T> {
  return { __envelope: 'paginated', items, total, skip, take };
}

export function isPaginatedList<T>(v: unknown): v is PaginatedListPayload<T> {
  return (
    v !== null &&
    typeof v === 'object' &&
    (v as PaginatedListPayload<unknown>).__envelope === 'paginated'
  );
}

export function buildPagination(
  total: number,
  skip: number,
  take: number,
): { page: number; limit: number; total: number; totalPages: number } {
  const limit = take > 0 ? take : 1;
  const page = take > 0 ? Math.floor(skip / take) + 1 : 1;
  const totalPages = take > 0 ? Math.ceil(total / take) : total > 0 ? 1 : 0;
  return { page, limit, total, totalPages };
}

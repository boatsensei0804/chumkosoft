"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

export interface ListParamState {
  q: string;
  page: number;
  filter?: string;
}

export interface UseListParams {
  navigate: (next: Partial<ListParamState>) => void;
  isPending: boolean;
}

/**
 * Syncs list search/filter/page to the URL (server-driven lists). `navigate`
 * merges the change over the current state and pushes a new URL, wrapped in a
 * transition so the list can show a pending state while the server re-fetches.
 * `navigate` is stable (reads current state via a ref) so it is safe to use in
 * effect dependency arrays for debounced search. Default values are omitted to
 * keep URLs clean.
 */
export function useListParams(basePath: string, current: ListParamState): UseListParams {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const ref = useRef(current);
  useEffect(() => {
    ref.current = current;
  });

  const navigate = useCallback(
    (next: Partial<ListParamState>) => {
      const cur = ref.current;
      const q = next.q ?? cur.q;
      const filter = next.filter ?? cur.filter;
      const page = next.page ?? 1;

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filter && filter !== "all") params.set("filter", filter);
      if (page > 1) params.set("page", String(page));

      const qs = params.toString();
      startTransition(() => router.push(qs ? `${basePath}?${qs}` : basePath));
    },
    [basePath, router],
  );

  return { navigate, isPending };
}

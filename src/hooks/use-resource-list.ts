"use client";

import { useCallback, useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

export function useResourceList<T>(basePath: string, filters: Record<string, string | number | undefined> = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<T[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const filterKey = JSON.stringify(filters);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError(null);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const parsed = JSON.parse(filterKey) as Record<string, string | number | undefined>;
      for (const [key, value] of Object.entries(parsed)) if (value !== undefined && value !== "") params.set(key, String(value));
      try { const result = await apiList<T>(`${basePath}?${params}`); if (!controller.signal.aborted) { setData(result.data); setTotalPages(result.totalPages); } }
      catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load data"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, search ? 300 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [basePath, filterKey, page, search, version]);
  return { data, page, setPage, search, setSearch: (value: string) => { setPage(1); setSearch(value); }, totalPages, loading, error, refresh };
}

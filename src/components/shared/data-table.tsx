"use client";

import { getCoreRowModel, useReactTable, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import type { ReactNode } from "react";

export function DataTable<T>({ data, columns, page, totalPages, search, onSearch, onPageChange, loading, error, emptyTitle, action, filter }: { data: T[]; columns: ColumnDef<T>[]; page: number; totalPages: number; search?: string; onSearch?: (value: string) => void; onPageChange: (page: number) => void; loading?: boolean; error?: string | null; emptyTitle: string; action?: ReactNode; filter?: ReactNode }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return <div className="space-y-4"><div className="flex flex-wrap gap-2">{onSearch && <Input aria-label="Search" placeholder="Search…" className="max-w-sm" value={search ?? ""} onChange={(event) => onSearch(event.target.value)} />}{filter}{action}</div>{error ? <EmptyState title="Could not load data" description={error} action={<Button variant="outline" onClick={() => onPageChange(page)}>Try again</Button>} /> : loading ? <div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div> : data.length === 0 ? <EmptyState title={emptyTitle} action={action} /> : <div className="overflow-x-auto rounded-md border"><Table><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody></Table></div>}<div className="flex items-center justify-end gap-2 text-sm text-muted-foreground"><span>Page {page} of {Math.max(1, totalPages)}</span><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)}>Next</Button></div></div>;
}

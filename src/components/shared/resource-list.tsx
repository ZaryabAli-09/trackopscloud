"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResourceList } from "@/hooks/use-resource-list";

type Row = { _id: string; [key: string]: unknown };
type Field = { key: string; label: string; format?: (value: unknown, row: Row) => React.ReactNode };

export function ResourceList({ title, description, path, fields, filterName, filterOptions, searchable = true, emptyTitle, action }: { title: string; description: string; path: string; fields: Field[]; filterName?: string; filterOptions?: Array<{ value: string; label: string }>; searchable?: boolean; emptyTitle: string; action?: React.ReactNode }) {
  const [filter, setFilter] = useState("");
  const list = useResourceList<Row>(path, filterName ? { [filterName]: filter } : {});
  const columns: ColumnDef<Row>[] = fields.map((field) => ({ id: field.key, header: field.label, cell: ({ row }) => field.format ? field.format(row.original[field.key], row.original) : String(row.original[field.key] ?? "—") }));
  return <div className="space-y-6"><PageHeader title={title} description={description} action={action} /><DataTable data={list.data} columns={columns} page={list.page} totalPages={list.totalPages} search={list.search} onSearch={searchable ? list.setSearch : undefined} onPageChange={list.setPage} loading={list.loading} error={list.error} emptyTitle={emptyTitle} action={action} filter={filterName && filterOptions && <Select value={filter || "all"} onValueChange={(value) => { setFilter(value === "all" ? "" : String(value)); list.setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{filterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>} /></div>;
}

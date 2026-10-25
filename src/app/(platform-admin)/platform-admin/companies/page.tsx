"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useResourceList } from "@/hooks/use-resource-list";
import { Button } from "@/components/ui/button";

type CompanyRow = {
  _id: string;
  name: string;
  email: string;
  status: string;
  userCount: number;
  createdAt: string;
};

export default function CompaniesPage() {
  const list = useResourceList<CompanyRow>("/api/platform-admin/companies");
  const columns: ColumnDef<CompanyRow>[] = [
    { accessorKey: "name", header: "Company", cell: ({ row }) => <Link className="font-medium underline-offset-4 hover:underline" href={`/platform-admin/companies/${row.original._id}`}>{row.original.name}</Link> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "userCount", header: "Users" },
    { accessorKey: "createdAt", header: "Registered", cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
    { id: "actions", header: "Actions", cell: ({ row }) => <Button nativeButton={false} size="sm" variant="outline" render={<Link href={`/platform-admin/companies/${row.original._id}`} />}><ExternalLink className="size-4" /> Review</Button> },
  ];

  return <div className="space-y-6">
    <PageHeader title="Companies" description="Review registrations and manage company access." />
    <DataTable data={list.data} columns={columns} page={list.page} totalPages={list.totalPages} search={list.search} onSearch={list.setSearch} onPageChange={list.setPage} loading={list.loading} error={list.error} emptyTitle="No companies found" />
  </div>;
}

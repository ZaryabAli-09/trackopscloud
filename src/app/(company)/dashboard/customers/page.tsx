"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { useResourceList } from "@/hooks/use-resource-list";
import { apiRequest } from "@/lib/client/api";

type CustomerRow = { _id: string; name: string; phone: string; email?: string; address?: string; notes?: string };
const schema = z.object({ name: z.string().min(1), phone: z.string().min(1), email: z.string().refine((value) => !value || z.email().safeParse(value).success, "Invalid email"), address: z.string(), notes: z.string() });
const fields = [{ name: "name", label: "Name" }, { name: "phone", label: "Phone" }, { name: "email", label: "Email", type: "email" as const }, { name: "address", label: "Address" }, { name: "notes", label: "Notes", type: "textarea" as const }];

export default function CustomersPage() {
  const { data: session } = useSession();
  const admin = session?.user?.role === "company_admin";
  const list = useResourceList<CustomerRow>("/api/company/customers");
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [open, setOpen] = useState(false);
  const columns: ColumnDef<CustomerRow>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <Link href={`/dashboard/customers/${row.original._id}`} className="underline">{row.original.name}</Link> },
    { accessorKey: "phone", header: "Phone" }, { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "—" },
    { id: "actions", header: "Actions", cell: ({ row }) => admin && <Button variant="outline" size="sm" onClick={() => { setEditing(row.original); setOpen(true); }}>Edit</Button> },
  ];
  return <div className="space-y-6"><PageHeader title="Customers" description="Customer profiles and purchase history." action={admin && <Button onClick={() => { setEditing(null); setOpen(true); }}>Add customer</Button>} /><DataTable data={list.data} columns={columns} page={list.page} totalPages={list.totalPages} search={list.search} onSearch={list.setSearch} onPageChange={list.setPage} loading={list.loading} error={list.error} emptyTitle="No customers found" action={admin && <Button onClick={() => { setEditing(null); setOpen(true); }}>Add customer</Button>} /><FormSheet open={open} onOpenChange={setOpen} title={editing ? "Edit customer" : "Add customer"} fields={fields} defaults={{ name: editing?.name ?? "", phone: editing?.phone ?? "", email: editing?.email ?? "", address: editing?.address ?? "", notes: editing?.notes ?? "" }} schema={schema} onSubmit={async (values) => { await apiRequest(editing ? `/api/company/customers/${editing._id}` : "/api/company/customers", { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...values, email: values.email || null, address: values.address || null, notes: values.notes || null }) }); list.refresh(); }} /></div>;
}

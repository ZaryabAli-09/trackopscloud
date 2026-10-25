"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useResourceList } from "@/hooks/use-resource-list";
import { apiRequest } from "@/lib/client/api";
import { formatMoney } from "@/lib/money";
import { appConfig } from "@/config/app.config";

type SaleRow = { _id: string; saleNumber: string; customerId?: { name: string } | null; saleDate: string; grandTotal: number; outstandingBalance: number; paymentStatus: string };

export default function SalesPage() {
  const { data: session } = useSession();
  const [paymentStatus, setPaymentStatus] = useState("");
  const [currency, setCurrency] = useState<string>(appConfig.defaultCurrency);
  const list = useResourceList<SaleRow>("/api/company/sales", { paymentStatus });
  useEffect(() => { void apiRequest<{ settings?: { defaultCurrency?: string } }>("/api/company/settings").then((data) => setCurrency(data.settings?.defaultCurrency ?? appConfig.defaultCurrency)).catch(() => {}); }, []);
  const columns: ColumnDef<SaleRow>[] = [{ accessorKey: "saleNumber", header: "Sale", cell: ({ row }) => <Link href={`/dashboard/sales/${row.original._id}`} className="underline">{row.original.saleNumber}</Link> }, { id: "customer", header: "Customer", cell: ({ row }) => row.original.customerId?.name ?? "Walk-in" }, { accessorKey: "saleDate", header: "Date", cell: ({ row }) => new Date(row.original.saleDate).toLocaleDateString() }, { accessorKey: "grandTotal", header: "Total", cell: ({ row }) => formatMoney(row.original.grandTotal, currency) }, { accessorKey: "outstandingBalance", header: "Outstanding", cell: ({ row }) => formatMoney(row.original.outstandingBalance, currency) }, { accessorKey: "paymentStatus", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} /> }];
  const action = session?.user?.role === "company_admin" ? <Button nativeButton={false} render={<Link href="/dashboard/sales/new" />}>New sale</Button> : null;
  return <div className="space-y-6"><PageHeader title="Sales" description="Transactions, payments and balances." action={action} /><DataTable data={list.data} columns={columns} page={list.page} totalPages={list.totalPages} onPageChange={list.setPage} loading={list.loading} error={list.error} emptyTitle="No sales yet" action={action} filter={<Select value={paymentStatus || "all"} onValueChange={(value) => { setPaymentStatus(value === "all" ? "" : String(value)); list.setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="voided">Voided</SelectItem></SelectContent></Select>} /></div>;
}

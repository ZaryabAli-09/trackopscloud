"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiRequest } from "@/lib/client/api";
import { formatMoney } from "@/lib/money";

type Detail = { customer: { name: string; phone: string; email?: string }; sales: Array<{ _id: string; saleNumber: string; saleDate: string; grandTotal: number; outstandingBalance: number; paymentStatus: string }>; payments: Array<{ _id: string; amount: number; paymentDate: string }>; balance: number };

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSale, setPaymentSale] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const load = () => { void apiRequest<Detail>(`/api/company/customers/${id}`).then(setDetail).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load customer")); };
  useEffect(() => { load(); void apiRequest<{ settings?: { defaultCurrency?: string } }>("/api/company/settings").then((data) => setCurrency(data.settings?.defaultCurrency ?? "USD")); }, [id]);
  if (error) return <EmptyState title="Could not load customer" description={error} action={<Button onClick={load}>Try again</Button>} />;
  if (!detail) return <p className="text-sm text-muted-foreground">Loading customer…</p>;
  return <div className="space-y-6"><PageHeader title={detail.customer.name} description={`${detail.customer.phone}${detail.customer.email ? ` · ${detail.customer.email}` : ""}`} action={<Button variant="outline" render={<Link href="/dashboard/customers" />}>Back to customers</Button>} /><Card><CardHeader><CardTitle>Outstanding balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatMoney(detail.balance, currency)}</CardContent></Card><Card><CardHeader><CardTitle>Purchase history</CardTitle></CardHeader><CardContent>{detail.sales.length ? <Table><TableHeader><TableRow><TableHead>Sale</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Outstanding</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{detail.sales.map((sale) => <TableRow key={sale._id}><TableCell><Link href={`/dashboard/sales/${sale._id}`} className="underline">{sale.saleNumber}</Link></TableCell><TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell><TableCell>{formatMoney(sale.grandTotal, currency)}</TableCell><TableCell>{formatMoney(sale.outstandingBalance, currency)}</TableCell><TableCell><StatusBadge status={sale.paymentStatus} /></TableCell><TableCell>{session?.user?.role === "company_admin" && sale.outstandingBalance > 0 && <Button variant="outline" size="sm" onClick={() => { setPaymentSale(sale._id); setAmount(""); }}>Record payment</Button>}</TableCell></TableRow>)}</TableBody></Table> : <EmptyState title="No purchases yet" />}</CardContent></Card><Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent>{detail.payments.length ? <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader><TableBody>{detail.payments.map((payment) => <TableRow key={payment._id}><TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell><TableCell>{formatMoney(payment.amount, currency)}</TableCell></TableRow>)}</TableBody></Table> : <EmptyState title="No payments yet" />}</CardContent></Card><Dialog open={!!paymentSale} onOpenChange={(open) => { if (!open) setPaymentSale(null); }}><DialogContent><DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader><div className="space-y-2"><Label htmlFor="payment-amount">Amount</Label><Input id="payment-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><DialogFooter><Button onClick={async () => { if (!paymentSale || !z.coerce.number().positive().safeParse(amount).success) return; try { await apiRequest("/api/company/payments", { method: "POST", body: JSON.stringify({ saleId: paymentSale, amount: Math.round(Number(amount) * 100) }) }); toast.success("Payment recorded"); setPaymentSale(null); load(); } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Payment failed"); } }}>Save payment</Button></DialogFooter></DialogContent></Dialog></div>;
}

"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiRequest } from "@/lib/client/api";
import { formatMoney } from "@/lib/money";
import { appConfig } from "@/config/app.config";

type Detail = { sale: { _id: string; saleNumber: string; saleDate: string; customerId?: { name: string } | null; items: Array<{ productId: string; productName: string; sku: string; quantity: number; unitPrice: number; discount: number; lineTotal: number }>; grandTotal: number; amountPaid: number; outstandingBalance: number; paymentStatus: string; notes?: string }; payments: Array<{ _id: string; amount: number; paymentDate: string }>; movements: Array<{ _id: string; quantity: number; resultingQuantity: number }> };

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>(appConfig.defaultCurrency);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const load = useCallback(() => { void apiRequest<Detail>(`/api/company/sales/${id}`).then(setDetail).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load sale")); }, [id]);
  useEffect(() => { load(); void apiRequest<{ settings?: { defaultCurrency?: string } }>("/api/company/settings").then((data) => setCurrency(data.settings?.defaultCurrency ?? appConfig.defaultCurrency)).catch(() => {}); }, [load]);
  if (error) return <EmptyState title="Could not load sale" description={error} action={<Button onClick={load}>Try again</Button>} />;
  if (!detail) return <p className="text-sm text-muted-foreground">Loading sale…</p>;
  const { sale } = detail;
  const admin = session?.user?.role === "company_admin";
  return <div className="space-y-6"><PageHeader title={`Sale ${sale.saleNumber}`} description={`${new Date(sale.saleDate).toLocaleDateString()} · ${sale.customerId?.name ?? "Walk-in customer"}`} action={<Button variant="outline" render={<Link href="/dashboard/sales" />}>Back to sales</Button>} /><div className="grid gap-4 sm:grid-cols-3"><StatCard title="Total" value={formatMoney(sale.grandTotal, currency)} /><StatCard title="Paid" value={formatMoney(sale.amountPaid, currency)} /><StatCard title="Outstanding" value={formatMoney(sale.outstandingBalance, currency)} /></div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={sale.paymentStatus} />{admin && sale.outstandingBalance > 0 && sale.paymentStatus !== "voided" && <Button onClick={() => setPayOpen(true)}>Record payment</Button>}{admin && sale.paymentStatus !== "voided" && <ConfirmDialog trigger="Void sale" title="Void this sale?" description="Stock will be restored. Enter a reason before confirming." confirmLabel="Void sale" onConfirm={async () => { if (!reason.trim()) throw new Error("Enter a reason"); await apiRequest(`/api/company/sales/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }); toast.success("Sale voided"); load(); }} />}{admin && sale.paymentStatus !== "voided" && <Input className="max-w-xs" placeholder="Reason to void" value={reason} onChange={(event) => setReason(event.target.value)} />}</div><Card><CardHeader><CardTitle>Items</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Qty</TableHead><TableHead>Unit price</TableHead><TableHead>Discount</TableHead><TableHead>Total</TableHead></TableRow></TableHeader><TableBody>{sale.items.map((item, index) => <TableRow key={`${item.productId}-${index}`}><TableCell>{item.productName}</TableCell><TableCell>{item.sku}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatMoney(item.unitPrice, currency)}</TableCell><TableCell>{formatMoney(item.discount, currency)}</TableCell><TableCell>{formatMoney(item.lineTotal, currency)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent>{detail.payments.length ? <Table><TableBody>{detail.payments.map((payment) => <TableRow key={payment._id}><TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell><TableCell>{formatMoney(payment.amount, currency)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No payments yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Stock movements</CardTitle></CardHeader><CardContent>{detail.movements.length ? <Table><TableBody>{detail.movements.map((movement) => <TableRow key={movement._id}><TableCell>{movement.quantity} units</TableCell><TableCell>{movement.resultingQuantity} remaining</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No movements.</p>}</CardContent></Card></div>{sale.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent>{sale.notes}</CardContent></Card>}<Dialog open={payOpen} onOpenChange={setPayOpen}><DialogContent><DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader><div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><DialogFooter><Button onClick={async () => { try { await apiRequest("/api/company/payments", { method: "POST", body: JSON.stringify({ saleId: id, amount: Math.round(Number(amount) * 100) }) }); toast.success("Payment recorded"); setPayOpen(false); load(); } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Payment failed"); } }}>Save payment</Button></DialogFooter></DialogContent></Dialog></div>;
}

"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { apiRequest } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";

type Company = { _id: string; name: string; email: string; status: string; contactNumber?: string | null; businessAddress?: string | null; createdAt: string; approvedAt?: string | null; rejectionReason?: string | null; suspensionReason?: string | null };
type User = { _id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; lastLoginAt?: string | null };
type CompanyDetails = { company: Company; users: User[]; productCount: number; saleCount: number };

export default function CompanyReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<CompanyDetails>(`/api/platform-admin/companies/${id}`).then(setDetails).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load company")).finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: "approved" | "rejected" | "suspended") {
    if (!id) return;
    setAction(status); setError(null);
    try {
      await apiRequest(`/api/platform-admin/companies/${id}/status`, { method: "POST", body: JSON.stringify({ status, reason: reason || undefined }) });
      const refreshed = await apiRequest<CompanyDetails>(`/api/platform-admin/companies/${id}`);
      setDetails(refreshed); setReason("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update company"); }
    finally { setAction(null); }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading company review...</p>;
  if (!details) return <p className="text-sm text-destructive">{error ?? "Company not found"}</p>;
  const { company, users } = details;

  return <div className="space-y-6">
    <PageHeader title={company.name} description={company.email} action={<Button nativeButton={false} variant="outline" render={<Link href="/platform-admin/companies" />}><ArrowLeft className="size-4" /> Back to companies</Button>} />
    {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardTitle>Status</CardTitle></CardHeader><CardContent><StatusBadge status={company.status} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Products</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{details.productCount}</CardContent></Card>
      <Card><CardHeader><CardTitle>Sales</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{details.saleCount}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Registration details</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2">
      <p><strong>Email:</strong> {company.email}</p><p><strong>Phone:</strong> {company.contactNumber || "—"}</p><p><strong>Address:</strong> {company.businessAddress || "—"}</p><p><strong>Registered:</strong> {new Date(company.createdAt).toLocaleString()}</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Review decision</CardTitle></CardHeader><CardContent className="space-y-4">
      <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional reason for rejection or suspension" />
      <div className="flex flex-wrap gap-2">
        {company.status !== "approved" && <Button onClick={() => void updateStatus("approved")} disabled={!!action}><Check className="size-4" /> {action === "approved" && <Loader2 className="size-4 animate-spin" />} Approve</Button>}
        {company.status === "pending" && <Button variant="destructive" onClick={() => void updateStatus("rejected")} disabled={!!action}><X className="size-4" /> Reject</Button>}
        {company.status === "approved" && <Button variant="destructive" onClick={() => void updateStatus("suspended")} disabled={!!action}>Suspend</Button>}
      </div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Users ({users.length})</CardTitle></CardHeader><CardContent><div className="space-y-3">{users.map((user) => <div key={user._id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm last:border-0"><span>{user.firstName} {user.lastName} · {user.email}</span><span className="text-muted-foreground">{user.role} · {user.isActive ? "Active" : "Inactive"}</span></div>)}</div></CardContent></Card>
  </div>;
}

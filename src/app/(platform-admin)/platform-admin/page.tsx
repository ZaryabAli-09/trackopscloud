import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricChart } from "@/components/shared/metric-chart";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { platformOverview } from "@/lib/services/overview";

export default async function PlatformAdminPage() {
  const data = await platformOverview();
  return <div className="space-y-6">
    <PageHeader title="Platform overview" description="Company registrations and recent activity." action={<Button nativeButton={false} render={<Link href="/platform-admin/companies" />}>Review companies</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Total companies" value={data.total} /><StatCard title="Pending approval" value={data.pending} /><StatCard title="Approved" value={data.approved} /><StatCard title="Suspended" value={data.suspended} /></div>
    <Card><CardHeader><CardTitle>Registrations over 30 days</CardTitle></CardHeader><CardContent><MetricChart data={data.registrations} xKey="day" yKey="count" label="Registrations" /></CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Recent registrations</CardTitle></CardHeader><CardContent>{data.recent.length ? <Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.recent.map((item) => <TableRow key={item.id}><TableCell><Link href={`/platform-admin/companies/${item.id}`} className="underline">{item.name}</Link></TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No companies yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Platform activity</CardTitle></CardHeader><CardContent>{data.activity.length ? <Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Entity</TableHead></TableRow></TableHeader><TableBody>{data.activity.map((item) => <TableRow key={item.id}><TableCell>{item.action}</TableCell><TableCell>{item.entity}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No activity yet.</p>}</CardContent></Card>
    </div>
  </div>;
}

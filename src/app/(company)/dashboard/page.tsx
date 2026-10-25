import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricChart } from "@/components/shared/metric-chart";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getValidatedViewer } from "@/lib/auth/guard";
import { formatMoney } from "@/lib/money";
import { companyOverview } from "@/lib/services/overview";

export default async function CompanyDashboardPage() {
  const viewer = await getValidatedViewer();
  if (!viewer?.companyId) redirect("/login");
  const data = await companyOverview(viewer.companyId);
  return <div className="space-y-6">
    <PageHeader title="Overview" description={`Welcome back, ${viewer.name}.`} action={<Button render={<Link href="/dashboard/sales" />}>View sales</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Active products" value={data.activeProducts} />
      <StatCard title="Low stock" value={data.lowStock} />
      <StatCard title="Sales today" value={formatMoney(data.salesToday, data.currency)} />
      <StatCard title="Sales this period" value={formatMoney(data.salesPeriod, data.currency)} />
      <StatCard title="Payments received" value={formatMoney(data.paymentsPeriod, data.currency)} note={`Against ${formatMoney(data.salesPeriod, data.currency)} in sales`} />
      <StatCard title="Outstanding balances" value={formatMoney(data.outstanding, data.currency)} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Sales over 30 days</CardTitle></CardHeader><CardContent><MetricChart data={data.salesChart} xKey="day" yKey="value" label="Sales" /></CardContent></Card>
      <Card><CardHeader><CardTitle>Stock by product</CardTitle></CardHeader><CardContent>{data.stockChart.length ? <MetricChart data={data.stockChart} xKey="name" yKey="stock" label="Stock" kind="bar" /> : <p className="text-sm text-muted-foreground">Add products to see stock levels.</p>}</CardContent></Card>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Recent sales</CardTitle></CardHeader><CardContent>{data.recentSales.length ? <Table><TableHeader><TableRow><TableHead>Sale</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.recentSales.map((sale) => <TableRow key={sale.id}><TableCell>{sale.number}</TableCell><TableCell>{sale.date}</TableCell><TableCell>{formatMoney(sale.total, data.currency)}</TableCell><TableCell><StatusBadge status={sale.status} /></TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No sales yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent stock movements</CardTitle></CardHeader><CardContent>{data.recentMovements.length ? <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Movement</TableHead><TableHead>Quantity</TableHead><TableHead>Stock</TableHead></TableRow></TableHeader><TableBody>{data.recentMovements.map((movement) => <TableRow key={movement.id}><TableCell>{movement.product}</TableCell><TableCell><StatusBadge status={movement.type} /></TableCell><TableCell>{movement.quantity}</TableCell><TableCell>{movement.stock}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No stock movements yet.</p>}</CardContent></Card>
    </div>
  </div>;
}

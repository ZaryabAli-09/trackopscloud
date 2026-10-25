import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">View business analytics and reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex flex-col gap-2">
            <CardTitle>Total Sales</CardTitle>
            <div className="text-2xl font-bold">$0.00</div>
            <CardDescription>All-time revenue</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2">
            <CardTitle>Total Products</CardTitle>
            <div className="text-2xl font-bold">0</div>
            <CardDescription>Active products</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2">
            <CardTitle>Total Customers</CardTitle>
            <div className="text-2xl font-bold">0</div>
            <CardDescription>Registered customers</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

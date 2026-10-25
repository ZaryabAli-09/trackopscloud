import { ResourceList } from "@/components/shared/resource-list";
import { StatusBadge } from "@/components/shared/status-badge";

export default function StockMovementsPage() {
  return <ResourceList title="Stock movements" description="A read-only record of every stock change." path="/api/company/stock-movements" searchable={false} emptyTitle="No stock movements yet" filterName="movementType" filterOptions={[{ value: "opening_stock", label: "Opening stock" }, { value: "stock_addition", label: "Addition" }, { value: "stock_reduction", label: "Reduction" }, { value: "sale_reduction", label: "Sale" }, { value: "customer_return", label: "Return" }]} fields={[{ key: "productId", label: "Product", format: (value) => typeof value === "object" && value !== null && "name" in value ? String(value.name) : "—" }, { key: "movementType", label: "Type", format: (value) => <StatusBadge status={String(value)} /> }, { key: "quantity", label: "Quantity" }, { key: "previousQuantity", label: "Before" }, { key: "resultingQuantity", label: "After" }, { key: "createdAt", label: "Date", format: (value) => new Date(String(value)).toLocaleDateString() }]} />;
}

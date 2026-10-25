"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet, type FormField } from "@/components/shared/form-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useResourceList } from "@/hooks/use-resource-list";
import { apiRequest } from "@/lib/client/api";
import { formatMoney } from "@/lib/money";
import { appConfig } from "@/config/app.config";

type ProductRow = { _id: string; name: string; sku: string; category?: string; unitOfMeasurement: string; sellingPrice: number; currentStock: number; lowStockThreshold: number; isArchived: boolean; imageUrl?: string };
const fields: FormField[] = [
  { name: "name", label: "Name" }, { name: "sku", label: "SKU" }, { name: "category", label: "Category" },
  { name: "unitOfMeasurement", label: "Unit" }, { name: "sellingPrice", label: "Selling price", type: "number" },
  { name: "costPrice", label: "Cost price", type: "number" }, { name: "lowStockThreshold", label: "Low stock threshold", type: "number" },
  { name: "openingStock", label: "Opening stock", type: "number" }, { name: "description", label: "Description", type: "textarea" },
];
const productFormSchema = z.object({ name: z.string().min(1), sku: z.string().min(1), category: z.string(), unitOfMeasurement: z.string().min(1), sellingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/), costPrice: z.string().regex(/^(|\d+(\.\d{1,2})?)$/), lowStockThreshold: z.string().regex(/^\d+$/), openingStock: z.string().regex(/^\d+$/), description: z.string() });
const blank = { name: "", sku: "", category: "", unitOfMeasurement: "piece", sellingPrice: "0", costPrice: "", lowStockThreshold: "0", openingStock: "0", description: "" };
const toMinor = (value: string) => Math.round(Number(value) * 100);

export default function ProductsPage() {
  const { data: session } = useSession();
  const admin = session?.user?.role === "company_admin";
  const [status, setStatus] = useState("active");
  const list = useResourceList<ProductRow>("/api/company/products", { status });
  const [currency, setCurrency] = useState<string>(appConfig.defaultCurrency);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<ProductRow | null>(null);
  const [movementType, setMovementType] = useState("stock_addition");
  const [quantity, setQuantity] = useState("1");
  const [imageProduct, setImageProduct] = useState<ProductRow | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  useEffect(() => { void apiRequest<{ settings?: { defaultCurrency?: string } }>("/api/company/settings").then((data) => setCurrency(data.settings?.defaultCurrency ?? appConfig.defaultCurrency)).catch(() => {}); }, []);
  const defaults = editing ? { name: editing.name, sku: editing.sku, category: editing.category ?? "", unitOfMeasurement: editing.unitOfMeasurement, sellingPrice: String(editing.sellingPrice / 100), costPrice: "", lowStockThreshold: String(editing.lowStockThreshold), openingStock: "0", description: "" } : blank;
  async function save(values: Record<string, string>) {
    const payload = { name: values.name, sku: values.sku, category: values.category || null, unitOfMeasurement: values.unitOfMeasurement, sellingPrice: toMinor(values.sellingPrice), costPrice: values.costPrice ? toMinor(values.costPrice) : null, lowStockThreshold: Number(values.lowStockThreshold), description: values.description || null, ...(!editing ? { openingStock: Number(values.openingStock) } : {}) };
    await apiRequest(editing ? `/api/company/products/${editing._id}` : "/api/company/products", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
    list.refresh();
  }
  const columns: ColumnDef<ProductRow>[] = [
    { accessorKey: "name", header: "Product" }, { accessorKey: "sku", header: "SKU" }, { accessorKey: "category", header: "Category", cell: ({ row }) => row.original.category || "—" },
    { accessorKey: "sellingPrice", header: "Price", cell: ({ row }) => formatMoney(row.original.sellingPrice, currency) },
    { accessorKey: "currentStock", header: "Stock", cell: ({ row }) => <span>{row.original.currentStock}{row.original.currentStock <= row.original.lowStockThreshold ? " · low" : ""}</span> },
    { accessorKey: "isArchived", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.isArchived ? "archived" : "active"} /> },
    { id: "actions", header: "Actions", cell: ({ row }) => admin ? <div className="flex flex-wrap gap-1"><Button variant="outline" size="sm" onClick={() => { setEditing(row.original); setSheetOpen(true); }}>Edit</Button><Button variant="outline" size="sm" onClick={() => setAdjusting(row.original)}>Adjust</Button><Button variant="outline" size="sm" onClick={() => setImageProduct(row.original)}>Image</Button>{!row.original.isArchived && <ConfirmDialog trigger="Archive" title="Archive product?" description="This product will no longer be available for new sales." confirmLabel="Archive" onConfirm={async () => { await apiRequest(`/api/company/products/${row.original._id}`, { method: "DELETE" }); toast.success("Product archived"); list.refresh(); }} />}</div> : null },
  ];
  return <div className="space-y-6"><PageHeader title="Products" description="Search products, manage stock and update your catalog." action={admin && <Button onClick={() => { setEditing(null); setSheetOpen(true); }}>Add product</Button>} /><DataTable data={list.data} columns={columns} page={list.page} totalPages={list.totalPages} search={list.search} onSearch={list.setSearch} onPageChange={list.setPage} loading={list.loading} error={list.error} emptyTitle="No products found" action={admin && <Button onClick={() => { setEditing(null); setSheetOpen(true); }}>Add product</Button>} filter={<Select value={status} onValueChange={(value) => { setStatus(String(value)); list.setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem><SelectItem value="all">All</SelectItem></SelectContent></Select>} />
    <FormSheet open={sheetOpen} onOpenChange={setSheetOpen} title={editing ? "Edit product" : "Add product"} fields={editing ? fields.filter((field) => field.name !== "openingStock") : fields} defaults={defaults} schema={productFormSchema} onSubmit={save} />
    <Dialog open={!!adjusting} onOpenChange={(open) => { if (!open) setAdjusting(null); }}><DialogContent><DialogHeader><DialogTitle>Adjust stock: {adjusting?.name}</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Movement</Label><Select value={movementType} onValueChange={(value) => setMovementType(String(value))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stock_addition">Add stock</SelectItem><SelectItem value="stock_reduction">Reduce stock</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="adjust-quantity">Quantity</Label><Input id="adjust-quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div></div><DialogFooter><Button onClick={async () => { if (!adjusting) return; try { await apiRequest("/api/company/stock-adjustments", { method: "POST", body: JSON.stringify({ productId: adjusting._id, movementType, quantity: Number(quantity) }) }); toast.success("Stock updated"); setAdjusting(null); list.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Adjustment failed"); } }}>Save adjustment</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!imageProduct} onOpenChange={(open) => { if (!open) setImageProduct(null); }}><DialogContent><DialogHeader><DialogTitle>Product image</DialogTitle></DialogHeader><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /><DialogFooter><Button disabled={!imageFile} onClick={async () => { if (!imageProduct || !imageFile) return; try { const body = new FormData(); body.set("image", imageFile); await apiRequest(`/api/company/products/${imageProduct._id}/image`, { method: "POST", body }); toast.success("Image updated"); setImageProduct(null); setImageFile(null); list.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); } }}>Upload image</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

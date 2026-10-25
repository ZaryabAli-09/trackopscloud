"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { apiList, apiRequest } from "@/lib/client/api";
import { formatMoney } from "@/lib/money";
import { appConfig } from "@/config/app.config";

type Product = { _id: string; name: string; sku: string; sellingPrice: number; currentStock: number };
type Customer = { _id: string; name: string };
const schema = z.object({ customerId: z.string(), amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"), notes: z.string(), items: z.array(z.object({ productId: z.string().min(1, "Choose a product"), quantity: z.string().regex(/^[1-9]\d*$/, "Enter a positive quantity"), discount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid discount") })).min(1) });
type Values = z.infer<typeof schema>;

export default function NewSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currency, setCurrency] = useState<string>(appConfig.defaultCurrency);
  const [loading, setLoading] = useState(true);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { customerId: "", amountPaid: "0", notes: "", items: [{ productId: "", quantity: "1", discount: "0" }] } });
  const lines = useFieldArray({ control: form.control, name: "items" });
  const watched = form.watch();
  const total = watched.items.reduce((sum, item) => { const product = products.find((candidate) => candidate._id === item.productId); return sum + Math.max(0, (product?.sellingPrice ?? 0) * Number(item.quantity || 0) - Math.round(Number(item.discount || 0) * 100)); }, 0);
  useEffect(() => { void Promise.all([apiList<Product>("/api/company/products?limit=100&status=active"), apiList<Customer>("/api/company/customers?limit=100"), apiRequest<{ settings?: { defaultCurrency?: string } }>("/api/company/settings")]).then(([productResult, customerResult, settings]) => { setProducts(productResult.data); setCustomers(customerResult.data); setCurrency(settings.settings?.defaultCurrency ?? appConfig.defaultCurrency); }).catch((caught) => toast.error(caught instanceof Error ? caught.message : "Could not load sale form")).finally(() => setLoading(false)); }, []);
  async function submit(values: Values) {
    try { const sale = await apiRequest<{ _id: string }>("/api/company/sales", { method: "POST", body: JSON.stringify({ customerId: values.customerId || null, amountPaid: Math.round(Number(values.amountPaid) * 100), notes: values.notes || null, items: values.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), discount: Math.round(Number(item.discount) * 100) })) }) }); toast.success("Sale recorded"); router.push(`/dashboard/sales/${sale._id}`); }
    catch (caught) { toast.error(caught instanceof Error ? caught.message : "Sale failed"); }
  }
  return <div className="max-w-4xl space-y-6"><PageHeader title="New sale" description="Product prices and names are verified by the server when saved." action={<Button variant="outline" render={<Link href="/dashboard/sales" />}>Back to sales</Button>} /><Card><CardHeader><CardTitle>Line items</CardTitle></CardHeader><CardContent><form className="space-y-5" onSubmit={form.handleSubmit(submit)}>{lines.fields.map((line, index) => <div key={line.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_7rem_8rem_auto]"><Field><FieldLabel>Product</FieldLabel><Select value={watched.items[index]?.productId || undefined} onValueChange={(value) => form.setValue(`items.${index}.productId`, String(value), { shouldValidate: true })}><SelectTrigger className="w-full"><SelectValue placeholder="Choose a product" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product._id} value={product._id}>{product.name} · {formatMoney(product.sellingPrice, currency)} · {product.currentStock} in stock</SelectItem>)}</SelectContent></Select>{form.formState.errors.items?.[index]?.productId && <FieldError>{form.formState.errors.items[index]?.productId?.message}</FieldError>}</Field><Field><FieldLabel>Quantity</FieldLabel><Input type="number" min="1" {...form.register(`items.${index}.quantity`)} />{form.formState.errors.items?.[index]?.quantity && <FieldError>{form.formState.errors.items[index]?.quantity?.message}</FieldError>}</Field><Field><FieldLabel>Discount</FieldLabel><Input type="number" min="0" step="0.01" {...form.register(`items.${index}.discount`)} />{form.formState.errors.items?.[index]?.discount && <FieldError>{form.formState.errors.items[index]?.discount?.message}</FieldError>}</Field><Button type="button" variant="outline" className="self-end" disabled={lines.fields.length === 1} onClick={() => lines.remove(index)}>Remove</Button></div>)}<Button type="button" variant="outline" onClick={() => lines.append({ productId: "", quantity: "1", discount: "0" })}>Add line</Button><div className="grid gap-4 md:grid-cols-2"><Field><FieldLabel>Customer</FieldLabel><Select value={watched.customerId || "walk-in"} onValueChange={(value) => form.setValue("customerId", value === "walk-in" ? "" : String(value))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="walk-in">Walk-in customer</SelectItem>{customers.map((customer) => <SelectItem key={customer._id} value={customer._id}>{customer.name}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel>Amount paid</FieldLabel><Input type="number" min="0" step="0.01" {...form.register("amountPaid")} />{form.formState.errors.amountPaid && <FieldError>{form.formState.errors.amountPaid.message}</FieldError>}</Field></div><Field><FieldLabel>Notes</FieldLabel><Textarea {...form.register("notes")} /></Field><div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Estimated total</p><p className="text-2xl font-semibold">{formatMoney(total, currency)}</p><p className="text-xs text-muted-foreground">Final total is calculated by the server.</p></div><Button type="submit" disabled={loading || form.formState.isSubmitting || products.length === 0}>{form.formState.isSubmitting ? "Saving…" : "Record sale"}</Button></form></CardContent></Card></div>;
}

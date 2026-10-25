import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connection";
import { Company } from "@/models/Company";
import { Product } from "@/models/Product";
import { Sale } from "@/models/Sale";
import { Payment } from "@/models/Payment";
import { StockMovement } from "@/models/StockMovement";
import { AuditLog } from "@/models/AuditLog";

export async function companyOverview(companyId: string) {
  await connectToDatabase();
  const id = new Types.ObjectId(companyId);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const startPeriod = new Date(); startPeriod.setDate(startPeriod.getDate() - 29); startPeriod.setHours(0, 0, 0, 0);
  const [company, activeProducts, lowStock, sales, payments, recentSales, recentMovements, stockProducts] = await Promise.all([
    Company.findById(id).select("settings").lean(),
    Product.countDocuments({ companyId: id, isArchived: false }),
    Product.countDocuments({ companyId: id, isArchived: false, $expr: { $lte: ["$currentStock", "$lowStockThreshold"] } }),
    Sale.find({ companyId: id, saleDate: { $gte: startPeriod }, paymentStatus: { $ne: "voided" } }).select("saleNumber saleDate grandTotal outstandingBalance paymentStatus").sort({ saleDate: -1 }).lean(),
    Payment.find({ companyId: id, paymentDate: { $gte: startPeriod } }).select("amount").lean(),
    Sale.find({ companyId: id }).sort({ createdAt: -1 }).limit(5).select("saleNumber saleDate grandTotal paymentStatus").lean(),
    StockMovement.find({ companyId: id }).populate("productId", "name").sort({ createdAt: -1 }).limit(5).select("productId movementType quantity resultingQuantity createdAt").lean(),
    Product.find({ companyId: id, isArchived: false }).sort({ currentStock: -1 }).limit(8).select("name currentStock").lean(),
  ]);
  const allOutstanding = await Sale.aggregate<{ total: number }>([{ $match: { companyId: id, paymentStatus: { $ne: "voided" } } }, { $group: { _id: null, total: { $sum: "$outstandingBalance" } } }]);
  const daily = new Map<string, number>();
  for (let offset = 29; offset >= 0; offset--) { const day = new Date(); day.setDate(day.getDate() - offset); daily.set(day.toISOString().slice(0, 10), 0); }
  for (const sale of sales) { const key = sale.saleDate.toISOString().slice(0, 10); daily.set(key, (daily.get(key) ?? 0) + sale.grandTotal); }
  return {
    currency: company?.settings?.defaultCurrency ?? "USD", activeProducts, lowStock,
    salesToday: sales.filter((sale) => sale.saleDate >= startToday).reduce((sum, sale) => sum + sale.grandTotal, 0),
    salesPeriod: sales.reduce((sum, sale) => sum + sale.grandTotal, 0),
    paymentsPeriod: payments.reduce((sum, payment) => sum + payment.amount, 0),
    outstanding: allOutstanding[0]?.total ?? 0,
    salesChart: [...daily].map(([day, value]) => ({ day: day.slice(5), value })),
    stockChart: stockProducts.map((product) => ({ name: product.name, stock: product.currentStock })),
    recentSales: recentSales.map((sale) => ({ id: sale._id.toString(), number: sale.saleNumber, date: sale.saleDate.toISOString().slice(0, 10), total: sale.grandTotal, status: sale.paymentStatus })),
    recentMovements: recentMovements.map((movement) => ({ id: movement._id.toString(), product: movement.productId && typeof movement.productId === "object" && "name" in movement.productId ? String(movement.productId.name) : "Product", type: movement.movementType, quantity: movement.quantity, stock: movement.resultingQuantity })),
  };
}

export async function platformOverview() {
  await connectToDatabase();
  const [companies, recent, activity] = await Promise.all([
    Company.find().select("status createdAt name").lean(),
    Company.find().sort({ createdAt: -1 }).limit(5).select("name status createdAt").lean(),
    AuditLog.find().sort({ createdAt: -1 }).limit(5).select("action entityType createdAt").lean(),
  ]);
  const daily = new Map<string, number>();
  for (let offset = 29; offset >= 0; offset--) { const day = new Date(); day.setDate(day.getDate() - offset); daily.set(day.toISOString().slice(0, 10), 0); }
  for (const company of companies) { const key = company.createdAt.toISOString().slice(0, 10); if (daily.has(key)) daily.set(key, daily.get(key)! + 1); }
  return { total: companies.length, pending: companies.filter((item) => item.status === "pending").length, approved: companies.filter((item) => item.status === "approved").length, suspended: companies.filter((item) => item.status === "suspended").length, registrations: [...daily].map(([day, count]) => ({ day: day.slice(5), count })), recent: recent.map((item) => ({ id: item._id.toString(), name: item.name, status: item.status })), activity: activity.map((item) => ({ id: item._id.toString(), action: item.action, entity: item.entityType })) };
}

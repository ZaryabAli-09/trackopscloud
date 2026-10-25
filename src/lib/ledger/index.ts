import { Types, ClientSession, type SessionOptions as MongooseSessionOptions } from "mongoose";
import { Product } from "@/models/Product";
import { Sale } from "@/models/Sale";
import { Payment } from "@/models/Payment";
import { StockMovement } from "@/models/StockMovement";
import { Customer } from "@/models/Customer";
import { AuditLog } from "@/models/AuditLog";
import { connectToDatabase } from "@/lib/db/connection";
import { AppError } from "@/lib/api/response";
import { StockMovementType } from "@/types";

export interface StockAdjustmentInput {
  productId: Types.ObjectId;
  movementType: StockMovementType;
  quantity: number;
  notes?: string | null;
  referenceType: "sale" | "adjustment" | "opening" | "return";
  referenceId?: Types.ObjectId | null;
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
}

export async function recordStockAdjustment(
  input: StockAdjustmentInput,
  session: ClientSession | null = null
): Promise<void> {
  await connectToDatabase();

  const product = await Product.findById(input.productId).session(session as ClientSession | undefined);
  if (!product) {
    throw new AppError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  }

  if (product.companyId.toString() !== input.companyId.toString()) {
    throw new AppError({
      status: 403,
      code: "TENANT_ISOLATION_VIOLATION",
      message: "Product does not belong to your company",
    });
  }

  const previousQuantity = product.currentStock;
  let resultingQuantity: number;

  switch (input.movementType) {
    case "stock_addition":
    case "opening_stock":
    case "customer_return":
      resultingQuantity = previousQuantity + input.quantity;
      break;
    case "stock_reduction":
    case "sale_reduction":
    case "stock_adjustment":
      resultingQuantity = previousQuantity - input.quantity;
      break;
    default:
      resultingQuantity = previousQuantity;
  }

  if (resultingQuantity < 0 && input.movementType !== "stock_adjustment") {
    throw new AppError({
      status: 400,
      code: "INSUFFICIENT_STOCK",
      message: `Insufficient stock. Available: ${previousQuantity}, Requested: ${input.quantity}`,
    });
  }

  product.currentStock = resultingQuantity;
  await product.save({ session });

  await StockMovement.create(
    [
      {
        companyId: input.companyId,
        productId: input.productId,
        movementType: input.movementType,
        quantity: input.quantity,
        previousQuantity,
        resultingQuantity,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        userId: input.userId,
        notes: input.notes,
      },
    ],
    { session }
  );
}

export interface CreateSaleInput {
  companyId: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  items: Array<{ productId: Types.ObjectId; productName: string; sku: string; quantity: number; unitPrice: number; discount: number }>;
  paymentStatus: "pending" | "partial" | "paid" | "overdue" | "voided";
  amountPaid: number;
  notes?: string | null;
  recordedBy: Types.ObjectId;
  saleDate: Date;
}

export async function createSale(input: CreateSaleInput): Promise<any> {
  await connectToDatabase();
  const session = await mongooseSession();
  try {
    await session.withTransaction(async () => {
      const validatedItems: any[] = [];
      let subtotal = 0;
      let discountTotal = 0;

      for (const item of input.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw new AppError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "Product not found" });
        if (product.companyId.toString() !== input.companyId.toString()) {
          throw new AppError({ status: 403, code: "TENANT_ISOLATION_VIOLATION", message: "Product does not belong to your company" });
        }
        if (product.isArchived) throw new AppError({ status: 400, code: "PRODUCT_ARCHIVED", message: "Product is archived" });
        if (product.currentStock < item.quantity) {
          throw new AppError({ status: 400, code: "INSUFFICIENT_STOCK", message: "Insufficient stock" });
        }
        const lineTotal = item.unitPrice * item.quantity - item.discount;
        subtotal += item.unitPrice * item.quantity;
        discountTotal += item.discount;
        validatedItems.push({ productId: item.productId, productName: item.productName, sku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, lineTotal });
        await recordStockAdjustment({ productId: item.productId, movementType: "sale_reduction", quantity: item.quantity, referenceType: "sale", referenceId: new Types.ObjectId(), userId: input.recordedBy, companyId: input.companyId }, session);
      }

      const grandTotal = subtotal - discountTotal;
      const outstandingBalance = grandTotal - input.amountPaid;
      const saleCount = await Sale.countDocuments({ companyId: input.companyId }).session(session);
      const saleNumber = `SAL-${String(saleCount + 1).padStart(6, "0")}`;

      const sale = await Sale.create([{ companyId: input.companyId, saleNumber, customerId: input.customerId ?? null, items: validatedItems, subtotal, discountTotal, taxTotal: 0, grandTotal, paymentStatus: input.paymentStatus, amountPaid: input.amountPaid, outstandingBalance, notes: input.notes ?? null, recordedBy: input.recordedBy, saleDate: input.saleDate }], { session });
      const saleDoc = sale[0];

      await StockMovement.updateMany({ companyId: input.companyId, referenceType: "sale", userId: input.recordedBy, createdAt: { $gte: new Date(Date.now() - 60000) } }, { $set: { referenceId: saleDoc._id } }, { session });

      if (input.customerId && input.amountPaid > 0) {
        await Payment.create([{ companyId: input.companyId, saleId: saleDoc._id, customerId: input.customerId, amount: input.amountPaid, paymentDate: input.saleDate, paymentMethod: "cash", recordedBy: input.recordedBy }], { session });
      }

      await AuditLog.create([{ userId: input.recordedBy, companyId: input.companyId, action: "sale.create", entityType: "Sale", entityId: saleDoc._id, metadata: { saleNumber, grandTotal, itemCount: validatedItems.length } }], { session });
      return saleDoc;
    });

    return await Sale.findOne({ companyId: input.companyId, recordedBy: input.recordedBy }).sort({ createdAt: -1 });
  } finally {
    await session.endSession();
  }
}

import mongoose from "mongoose";

async function mongooseSession(): Promise<ClientSession> {
  await connectToDatabase();
  return await mongoose.startSession();
}

export async function recordPayment(input: { companyId: Types.ObjectId; saleId: Types.ObjectId; customerId: Types.ObjectId; amount: number; paymentDate: Date; paymentMethod: string; referenceNumber?: string | null; notes?: string | null; recordedBy: Types.ObjectId }): Promise<void> {
  await connectToDatabase();
  const session = await mongooseSession();
  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findById(input.saleId).session(session);
      if (!sale) throw new AppError({ status: 404, code: "SALE_NOT_FOUND", message: "Sale not found" });
      if (sale.companyId.toString() !== input.companyId.toString()) {
        throw new AppError({ status: 403, code: "TENANT_ISOLATION_VIOLATION", message: "Sale does not belong to your company" });
      }
      if (sale.paymentStatus === "voided") throw new AppError({ status: 400, code: "SALE_VOIDED", message: "Cannot record payment on a voided sale" });
      const newAmountPaid = sale.amountPaid + input.amount;
      const newOutstandingBalance = Math.max(0, sale.grandTotal - newAmountPaid);
      let newPaymentStatus: "pending" | "partial" | "paid" | "overdue" | "voided" = sale.paymentStatus;
      if (newOutstandingBalance === 0) newPaymentStatus = "paid";
      else if (newAmountPaid > 0) newPaymentStatus = "partial";
      await Sale.findByIdAndUpdate(input.saleId, { amountPaid: newAmountPaid, outstandingBalance: newOutstandingBalance, paymentStatus: newPaymentStatus }, { session });
      await Payment.create([{ companyId: input.companyId, saleId: input.saleId, customerId: input.customerId, amount: input.amount, paymentDate: input.paymentDate, paymentMethod: input.paymentMethod as any, referenceNumber: input.referenceNumber ?? null, notes: input.notes ?? null, recordedBy: input.recordedBy }], { session });
      await AuditLog.create([{ userId: input.recordedBy, companyId: input.companyId, action: "payment.record", entityType: "Payment", entityId: new Types.ObjectId(), metadata: { saleId: input.saleId, amount: input.amount, newOutstandingBalance } }], { session });
    });
  } finally { await session.endSession(); }
}

export async function voidSale(input: { companyId: Types.ObjectId; saleId: Types.ObjectId; voidedBy: Types.ObjectId; voidReason?: string | null }): Promise<void> {
  await connectToDatabase();
  const session = await mongooseSession();
  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findById(input.saleId).session(session);
      if (!sale) throw new AppError({ status: 404, code: "SALE_NOT_FOUND", message: "Sale not found" });
      if (sale.companyId.toString() !== input.companyId.toString()) {
        throw new AppError({ status: 403, code: "TENANT_ISOLATION_VIOLATION", message: "Sale does not belong to your company" });
      }
      if (sale.paymentStatus === "voided") throw new AppError({ status: 400, code: "SALE_ALREADY_VOIDED", message: "Sale is already voided" });
      for (const item of sale.items) {
        await recordStockAdjustment({ productId: item.productId, movementType: "customer_return", quantity: item.quantity, referenceType: "return", referenceId: sale._id, userId: input.voidedBy, companyId: input.companyId }, session);
      }
      await Sale.findByIdAndUpdate(input.saleId, { paymentStatus: "voided", voidedAt: new Date(), voidedBy: input.voidedBy, voidReason: input.voidReason ?? null }, { session });
      await AuditLog.create([{ userId: input.voidedBy, companyId: input.companyId, action: "sale.void", entityType: "Sale", entityId: sale._id, metadata: { saleNumber: sale.saleNumber, voidReason: input.voidReason } }], { session });
    });
  } finally { await session.endSession(); }
}

export async function getCustomerOutstandingBalance(companyId: Types.ObjectId, customerId: Types.ObjectId): Promise<number> {
  await connectToDatabase();
  const payments = await Payment.aggregate([{ $match: { companyId, customerId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  const sales = await Sale.aggregate([{ $match: { companyId, customerId, paymentStatus: { $ne: "voided" } } }, { $group: { _id: null, total: { $sum: "$grandTotal" } } }]);
  const totalSales = sales[0]?.total ?? 0;
  const totalPayments = payments[0]?.total ?? 0;
  return Math.max(0, totalSales - totalPayments);
}
import mongoose, { type ClientSession, Types } from "mongoose";
import { AppError } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connection";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";
import { Customer } from "@/models/Customer";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { Sale, type ISale, type ISaleItem } from "@/models/Sale";
import { StockMovement } from "@/models/StockMovement";
import type { StockMovementType } from "@/types";

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

export async function recordStockAdjustment(input: StockAdjustmentInput, session: ClientSession | null = null): Promise<void> {
  await connectToDatabase();
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new AppError({ status: 400, code: "INVALID_QUANTITY", message: "Quantity must be a positive integer" });
  }
  const product = await Product.findOne({ _id: input.productId, companyId: input.companyId }).session(session);
  if (!product) throw new AppError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const addition = ["stock_addition", "opening_stock", "customer_return"].includes(input.movementType);
  const previousQuantity = product.currentStock;
  const resultingQuantity = previousQuantity + (addition ? input.quantity : -input.quantity);
  if (!Number.isSafeInteger(resultingQuantity)) {
    throw new AppError({ status: 400, code: "INVALID_QUANTITY", message: "Stock quantity is too large" });
  }
  if (resultingQuantity < 0) {
    const company = await Company.findById(input.companyId).select("settings.allowCustomNegativeStock").session(session);
    const allowNegative = input.movementType === "stock_adjustment" && company?.settings?.allowCustomNegativeStock === true;
    if (!allowNegative) throw new AppError({ status: 400, code: "INSUFFICIENT_STOCK", message: "Insufficient stock" });
  }
  product.currentStock = resultingQuantity;
  await product.save({ session });
  await StockMovement.create([{ ...input, previousQuantity, resultingQuantity }], { session });
}

export interface CreateSaleInput {
  companyId: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  items: Array<{ productId: Types.ObjectId; quantity: number; discount: number }>;
  amountPaid: number;
  notes?: string | null;
  recordedBy: Types.ObjectId;
  saleDate: Date;
}

export async function createSale(input: CreateSaleInput): Promise<ISale> {
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    const sale = await session.withTransaction(async () => {
      if (!input.items.length) throw new AppError({ status: 400, code: "EMPTY_SALE", message: "A sale needs at least one item" });
      if (!Number.isSafeInteger(input.amountPaid) || input.amountPaid < 0) throw new AppError({ status: 400, code: "INVALID_PAYMENT", message: "Payment must be a nonnegative amount in minor units" });
      if (input.customerId && !await Customer.exists({ _id: input.customerId, companyId: input.companyId }).session(session)) {
        throw new AppError({ status: 404, code: "CUSTOMER_NOT_FOUND", message: "Customer not found" });
      }

      const saleId = new Types.ObjectId();
      const items: ISaleItem[] = [];
      let subtotal = 0;
      let discountTotal = 0;
      for (const item of input.items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isSafeInteger(item.discount) || item.discount < 0) {
          throw new AppError({ status: 400, code: "INVALID_LINE_ITEM", message: "Invalid quantity or discount" });
        }
        const product = await Product.findOne({ _id: item.productId, companyId: input.companyId, isArchived: false }).session(session);
        if (!product) throw new AppError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "Product not found" });
        if (!Number.isSafeInteger(product.sellingPrice) || product.sellingPrice < 0) {
          throw new AppError({ status: 409, code: "INVALID_PRICE", message: "Product price must be stored in integer minor units" });
        }
        const lineSubtotal = product.sellingPrice * item.quantity;
        if (!Number.isSafeInteger(lineSubtotal) || item.discount > lineSubtotal) {
          throw new AppError({ status: 400, code: "INVALID_DISCOUNT", message: "Discount exceeds line total" });
        }
        subtotal += lineSubtotal;
        discountTotal += item.discount;
        if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(discountTotal)) {
          throw new AppError({ status: 400, code: "INVALID_TOTAL", message: "Sale total is too large" });
        }
        items.push({ productId: product._id, productName: product.name, sku: product.sku, quantity: item.quantity, unitPrice: product.sellingPrice, discount: item.discount, lineTotal: lineSubtotal - item.discount });
        await recordStockAdjustment({ companyId: input.companyId, productId: product._id, userId: input.recordedBy, movementType: "sale_reduction", quantity: item.quantity, referenceType: "sale", referenceId: saleId }, session);
      }

      const grandTotal = subtotal - discountTotal;
      if (input.amountPaid > grandTotal) throw new AppError({ status: 400, code: "OVERPAYMENT", message: "Amount paid exceeds sale total" });
      const company = await Company.findOneAndUpdate({ _id: input.companyId, status: "approved" }, { $inc: { saleCounter: 1 } }, { new: true, session });
      if (!company) throw new AppError({ status: 403, code: "COMPANY_NOT_APPROVED", message: "Company access is not approved" });
      const saleNumber = `SAL-${String(company.saleCounter).padStart(6, "0")}`;
      const outstandingBalance = grandTotal - input.amountPaid;
      const paymentStatus = outstandingBalance === 0 ? "paid" : input.amountPaid > 0 ? "partial" : "pending";
      const [created] = await Sale.create([{ _id: saleId, companyId: input.companyId, saleNumber, customerId: input.customerId ?? null, items, subtotal, discountTotal, taxTotal: 0, grandTotal, amountPaid: input.amountPaid, outstandingBalance, paymentStatus, notes: input.notes ?? null, recordedBy: input.recordedBy, saleDate: input.saleDate }], { session });
      if (input.amountPaid > 0) {
        await Payment.create([{ companyId: input.companyId, saleId, customerId: input.customerId ?? null, amount: input.amountPaid, paymentDate: input.saleDate, paymentMethod: "cash", recordedBy: input.recordedBy }], { session });
      }
      await AuditLog.create([{ userId: input.recordedBy, companyId: input.companyId, action: "sale.create", entityType: "Sale", entityId: saleId, metadata: { saleNumber, grandTotal, itemCount: items.length } }], { session });
      return created;
    });
    if (!sale) throw new Error("Sale transaction returned no document");
    return sale;
  } finally { await session.endSession(); }
}

export interface RecordPaymentInput {
  companyId: Types.ObjectId;
  saleId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: "cash" | "bank_transfer" | "check" | "mobile_money" | "other";
  referenceNumber?: string | null;
  notes?: string | null;
  recordedBy: Types.ObjectId;
}

export async function recordPayment(input: RecordPaymentInput) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const sale = await Sale.findOne({ _id: input.saleId, companyId: input.companyId }).session(session);
      if (!sale) throw new AppError({ status: 404, code: "SALE_NOT_FOUND", message: "Sale not found" });
      if (sale.paymentStatus === "voided") throw new AppError({ status: 400, code: "SALE_VOIDED", message: "Cannot record payment on a voided sale" });
      if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > sale.outstandingBalance) {
        throw new AppError({ status: 400, code: "INVALID_PAYMENT", message: "Payment exceeds the outstanding balance or is invalid" });
      }
      sale.amountPaid += input.amount;
      sale.outstandingBalance -= input.amount;
      sale.paymentStatus = sale.outstandingBalance === 0 ? "paid" : "partial";
      await sale.save({ session });
      const [payment] = await Payment.create([{ companyId: input.companyId, saleId: sale._id, customerId: sale.customerId ?? null, amount: input.amount, paymentDate: input.paymentDate, paymentMethod: input.paymentMethod, referenceNumber: input.referenceNumber ?? null, notes: input.notes ?? null, recordedBy: input.recordedBy }], { session });
      await AuditLog.create([{ userId: input.recordedBy, companyId: input.companyId, action: "payment.record", entityType: "Payment", entityId: payment._id, metadata: { saleId: sale._id, amount: input.amount } }], { session });
      return payment;
    });
  } finally { await session.endSession(); }
}

export async function voidSale(input: { companyId: Types.ObjectId; saleId: Types.ObjectId; voidedBy: Types.ObjectId; voidReason?: string | null }): Promise<void> {
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findOne({ _id: input.saleId, companyId: input.companyId }).session(session);
      if (!sale) throw new AppError({ status: 404, code: "SALE_NOT_FOUND", message: "Sale not found" });
      if (sale.paymentStatus === "voided") throw new AppError({ status: 400, code: "SALE_ALREADY_VOIDED", message: "Sale is already voided" });
      const movements = await StockMovement.find({ companyId: input.companyId, referenceType: "sale", referenceId: sale._id, movementType: "sale_reduction" }).session(session);
      if (!movements.length) throw new AppError({ status: 409, code: "MISSING_MOVEMENTS", message: "Sale has no recorded stock movements" });
      for (const movement of movements) {
        await recordStockAdjustment({ companyId: input.companyId, productId: movement.productId, movementType: "customer_return", quantity: movement.quantity, referenceType: "return", referenceId: sale._id, userId: input.voidedBy }, session);
      }
      sale.paymentStatus = "voided";
      sale.outstandingBalance = 0;
      sale.voidedAt = new Date();
      sale.voidedBy = input.voidedBy;
      sale.voidReason = input.voidReason ?? null;
      await sale.save({ session });
      await AuditLog.create([{ userId: input.voidedBy, companyId: input.companyId, action: "sale.void", entityType: "Sale", entityId: sale._id, metadata: { saleNumber: sale.saleNumber, voidReason: input.voidReason } }], { session });
    });
  } finally { await session.endSession(); }
}

export async function getCustomerOutstandingBalance(companyId: Types.ObjectId, customerId: Types.ObjectId): Promise<number> {
  await connectToDatabase();
  const result: Array<{ total: number }> = await Sale.aggregate([
    { $match: { companyId, customerId, paymentStatus: { $ne: "voided" } } },
    { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
  ]);
  return result[0]?.total ?? 0;
}

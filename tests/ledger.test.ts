import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { NextRequest } from "next/server";
import { connectToDatabase, disconnectDatabase } from "../src/lib/db/connection";
import { createSale, recordPayment, recordStockAdjustment } from "../src/lib/ledger";
import { hashToken } from "../src/lib/auth/tokens";
import { POST as activate } from "../src/app/api/auth/activate/route";
import { AccountActivationToken } from "../src/models/AccountActivationToken";
import { Company } from "../src/models/Company";
import { Payment } from "../src/models/Payment";
import { Product } from "../src/models/Product";
import { Sale } from "../src/models/Sale";
import { StockMovement } from "../src/models/StockMovement";
import { User } from "../src/models/User";

let replica: MongoMemoryReplSet;

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replica.getUri();
  process.env.AUTH_SECRET = "test-secret-at-least-thirty-two-characters-long";
  process.env.RATE_LIMIT_MAX_REQUESTS = "2";
  await connectToDatabase();
  await Promise.all([Company.init(), User.init(), Product.init(), Sale.init(), Payment.init(), StockMovement.init(), AccountActivationToken.init()]);
}, 120000);

afterAll(async () => {
  await disconnectDatabase();
  await replica?.stop();
});

beforeEach(async () => {
  for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
});

async function fixture(stock = 10) {
  const company = await Company.create({ name: "Test Company", email: "company@example.test", status: "approved", saleCounter: 0 });
  const user = await User.create({ email: "admin@example.test", password: "hashed", firstName: "Test", lastName: "Admin", role: "company_admin", companyId: company._id, isActive: true, emailVerified: true, sessionVersion: 1 });
  const product = await Product.create({ companyId: company._id, name: "Widget", sku: "W-1", unitOfMeasurement: "piece", sellingPrice: 2500, currentStock: stock, lowStockThreshold: 2 });
  return { company, user, product };
}

describe("transactional sales ledger", () => {
  it("snapshots the server price, reduces stock, links the movement and records walk-in payment", async () => {
    const { company, user, product } = await fixture();
    const sale = await createSale({ companyId: company._id, recordedBy: user._id, saleDate: new Date(), items: [{ productId: product._id, quantity: 2, discount: 300 }], amountPaid: 2000 });
    expect(sale.items[0]).toMatchObject({ productName: "Widget", sku: "W-1", quantity: 2, unitPrice: 2500, discount: 300, lineTotal: 4700 });
    expect(sale.grandTotal).toBe(4700);
    expect(sale.outstandingBalance).toBe(2700);
    expect((await Product.findById(product._id))?.currentStock).toBe(8);
    expect(await StockMovement.countDocuments({ companyId: company._id, referenceId: sale._id, movementType: "sale_reduction" })).toBe(1);
    expect(await Payment.countDocuments({ saleId: sale._id, customerId: null, amount: 2000 })).toBe(1);
    await Product.updateOne({ _id: product._id }, { $set: { sellingPrice: 3900 } });
    expect((await Sale.findById(sale._id))?.items[0].unitPrice).toBe(2500);
  });

  it("rejects insufficient stock without leaving sale, movement, payment or counter changes", async () => {
    const { company, user, product } = await fixture(1);
    await expect(createSale({ companyId: company._id, recordedBy: user._id, saleDate: new Date(), items: [{ productId: product._id, quantity: 2, discount: 0 }], amountPaid: 0 })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(await Sale.countDocuments({ companyId: company._id })).toBe(0);
    expect(await Payment.countDocuments({ companyId: company._id })).toBe(0);
    expect(await StockMovement.countDocuments({ companyId: company._id })).toBe(0);
    expect((await Product.findById(product._id))?.currentStock).toBe(1);
    expect((await Company.findById(company._id))?.saleCounter).toBe(0);
  });

  it("rejects foreign products, excessive discounts and overpayment", async () => {
    const { company, user, product } = await fixture();
    const otherCompany = await Company.create({ name: "Other", email: "other@example.test", status: "approved" });
    await expect(createSale({ companyId: otherCompany._id, recordedBy: user._id, saleDate: new Date(), items: [{ productId: product._id, quantity: 1, discount: 0 }], amountPaid: 0 })).rejects.toMatchObject({ status: 404 });
    await expect(createSale({ companyId: company._id, recordedBy: user._id, saleDate: new Date(), items: [{ productId: product._id, quantity: 1, discount: 2501 }], amountPaid: 0 })).rejects.toMatchObject({ code: "INVALID_DISCOUNT" });
    await expect(createSale({ companyId: company._id, recordedBy: user._id, saleDate: new Date(), items: [{ productId: product._id, quantity: 1, discount: 0 }], amountPaid: 2501 })).rejects.toMatchObject({ code: "OVERPAYMENT" });
  });

  it("updates payment balances and rejects overpayment", async () => {
    const { company, user, product } = await fixture();
    const sale = await createSale({ companyId: company._id, recordedBy: user._id, saleDate: new Date(), items: [{ productId: product._id, quantity: 1, discount: 0 }], amountPaid: 0 });
    await recordPayment({ companyId: company._id, saleId: sale._id, recordedBy: user._id, amount: 1000, paymentDate: new Date(), paymentMethod: "cash" });
    const changed = await Sale.findById(sale._id);
    expect(changed?.outstandingBalance).toBe(1500);
    expect(changed?.paymentStatus).toBe("partial");
    await expect(recordPayment({ companyId: company._id, saleId: sale._id, recordedBy: user._id, amount: 1501, paymentDate: new Date(), paymentMethod: "cash" })).rejects.toMatchObject({ code: "INVALID_PAYMENT" });
    expect(await Payment.countDocuments({ saleId: sale._id })).toBe(1);
  });

  it("assigns unique sale numbers during concurrent transactions", async () => {
    const { company, user, product } = await fixture(20);
    const sales = await Promise.all(Array.from({ length: 5 }, () => createSale({ companyId: company._id, recordedBy: user._id, saleDate: new Date(), items: [{ productId: product._id, quantity: 1, discount: 0 }], amountPaid: 0 })));
    expect(new Set(sales.map((sale) => sale.saleNumber)).size).toBe(5);
    expect(await Sale.countDocuments({ companyId: company._id })).toBe(5);
  });

  it("does not allow negative ordinary stock adjustments", async () => {
    const { company, user, product } = await fixture(1);
    await expect(recordStockAdjustment({ companyId: company._id, userId: user._id, productId: product._id, movementType: "stock_reduction", quantity: 2, referenceType: "adjustment", referenceId: new Types.ObjectId() })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect((await Product.findById(product._id))?.currentStock).toBe(1);
  });
});

describe("single-use activation tokens", () => {
  it("rejects reuse and expiry", async () => {
    const { company, user } = await fixture();
    user.isActive = false;
    await user.save();
    const token = "raw-secret-activation-token";
    await AccountActivationToken.create({ companyId: company._id, userId: user._id, token: hashToken(token), expiresAt: new Date(Date.now() + 60_000), isUsed: false });
    const request = () => new NextRequest("http://localhost/api/auth/activate", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.1" }, body: JSON.stringify({ token, password: "StrongPass123" }) });
    const first = await activate(request());
    expect(first.status).toBe(200);
    const second = await activate(request());
    expect(second.status).toBe(400);
    expect((await AccountActivationToken.findOne({ token: hashToken(token) }))?.isUsed).toBe(true);
    expect((await User.findById(user._id))?.isActive).toBe(true);
    const expired = "expired-activation-token";
    await AccountActivationToken.create({ companyId: company._id, userId: user._id, token: hashToken(expired), expiresAt: new Date(Date.now() - 1000), isUsed: false });
    const expiryResponse = await activate(new NextRequest("http://localhost/api/auth/activate", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.2" }, body: JSON.stringify({ token: expired, password: "StrongPass123" }) }));
    expect(expiryResponse.status).toBe(400);
  });
});

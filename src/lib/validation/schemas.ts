import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

// Company schemas
export const companyRegistrationSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  contactNumber: z.string().optional().nullable(),
  businessAddress: z.string().max(500).optional().nullable(),
});

export const companyStatusUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: z.string().trim().min(1).max(500).optional(),
}).superRefine((value, context) => {
  if (value.status !== "approved" && !value.reason) context.addIssue({ code: "custom", path: ["reason"], message: "A reason is required" });
});

// User schemas
export const userRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(["company_admin", "company_employee"]).optional(),
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const inviteEmployeeSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(["company_employee"]),
});

// Product schemas
export const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  unitOfMeasurement: z.string().min(1).max(50),
  packageSize: z.string().max(100).optional().nullable(),
  sellingPrice: z.number().int().nonnegative(),
  costPrice: z.number().int().nonnegative().optional().nullable(),
  openingStock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(0),
});

export const productUpdateSchema = productSchema.omit({ openingStock: true }).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

// Customer schemas
export const customerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(50),
  email: emailSchema.optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const customerUpdateSchema = customerSchema.partial();

// Sale schemas
export const saleLineItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().positive(),
  discount: z.number().int().nonnegative().default(0),
});

export const saleSchema = z.object({
  customerId: objectIdSchema.optional().nullable(),
  items: z.array(saleLineItemSchema).min(1),
  amountPaid: z.number().int().nonnegative().default(0),
  notes: z.string().max(1000).optional().nullable(),
  saleDate: z.iso.datetime().optional(),
});

export const saleUpdateSchema = z.object({
  paymentStatus: z.enum(["pending", "partial", "paid", "overdue", "voided"]).optional(),
  amountPaid: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const recordPaymentSchema = z.object({
  saleId: objectIdSchema,
  amount: z.number().int().positive(),
  paymentDate: z.string().datetime().optional().nullable(),
  referenceNumber: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// Stock movement schemas
export const stockAdjustmentSchema = z.object({
  productId: objectIdSchema,
  movementType: z.enum(["stock_addition", "stock_reduction", "stock_adjustment"]),
  quantity: z.number().int().positive(),
  notes: z.string().max(1000).optional().nullable(),
});

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Token schemas
export const tokenQuerySchema = z.object({
  token: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

// Export types
export type CompanyRegistrationInput = z.infer<typeof companyRegistrationSchema>;
export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

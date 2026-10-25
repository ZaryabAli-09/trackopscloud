import { Types } from "mongoose";

export type Role = "platform_admin" | "company_admin" | "company_employee";

export type CompanyStatus = "pending" | "approved" | "rejected" | "suspended";

export type StockMovementType =
  | "opening_stock"
  | "stock_addition"
  | "stock_reduction"
  | "stock_adjustment"
  | "sale_reduction"
  | "customer_return";

export type PaymentStatus = "pending" | "partial" | "paid" | "overdue" | "voided";

export type SaleStatus = "draft" | "completed" | "voided" | "corrected";

export interface BaseDocument {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogContext {
  userId: Types.ObjectId;
  userEmail: string;
  userRole: Role;
  companyId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
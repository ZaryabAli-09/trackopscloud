"use client";

import { ResourceList } from "@/components/shared/resource-list";

export default function AuditLogsPage() {
  return <ResourceList title="Audit logs" description="Platform and company activity." path="/api/platform-admin/audit-logs" searchable={false} emptyTitle="No audit events found" filterName="action" filterOptions={[{ value: "company", label: "Company activity" }, { value: "sale", label: "Sales" }, { value: "product", label: "Products" }, { value: "employee", label: "Employees" }]} fields={[{ key: "action", label: "Action" }, { key: "entityType", label: "Entity" }, { key: "userEmail", label: "User" }, { key: "companyId", label: "Company ID" }, { key: "createdAt", label: "Date", format: (value) => new Date(String(value)).toLocaleString() }]} />;
}

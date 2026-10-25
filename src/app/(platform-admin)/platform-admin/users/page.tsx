import { ResourceList } from "@/components/shared/resource-list";
import { StatusBadge } from "@/components/shared/status-badge";

export default function PlatformUsersPage() {
  return <ResourceList title="Users" description="All user accounts across the platform." path="/api/platform-admin/users" emptyTitle="No users found" filterName="role" filterOptions={[{ value: "platform_admin", label: "Platform admins" }, { value: "company_admin", label: "Company admins" }, { value: "company_employee", label: "Employees" }]} fields={[{ key: "firstName", label: "Name", format: (_value, row) => `${row.firstName ?? ""} ${row.lastName ?? ""}` }, { key: "email", label: "Email" }, { key: "role", label: "Role", format: (value) => <StatusBadge status={String(value)} /> }, { key: "companyId", label: "Company", format: (value) => typeof value === "object" && value !== null && "name" in value ? String(value.name) : "—" }, { key: "isActive", label: "Status", format: (value) => <StatusBadge status={value ? "active" : "inactive"} /> }]} />;
}

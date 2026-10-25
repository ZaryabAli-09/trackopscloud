import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "../src/lib/permissions";

vi.mock("@/lib/permissions", () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    userId: "507f1f77bcf86cd799439011",
    userEmail: "employee@example.test",
    userRole: "company_employee",
    companyId: "507f1f77bcf86cd799439012",
    companyStatus: "approved",
  })),
}));

import { POST as createProduct } from "../src/app/api/company/products/route";
import { PATCH as updateProduct, DELETE as archiveProduct } from "../src/app/api/company/products/[id]/route";
import { POST as uploadProductImage } from "../src/app/api/company/products/[id]/image/route";
import { POST as adjustStock } from "../src/app/api/company/stock-adjustments/route";
import { POST as createSale } from "../src/app/api/company/sales/route";
import { POST as voidSale } from "../src/app/api/company/sales/[id]/void/route";
import { POST as recordPayment } from "../src/app/api/company/payments/route";
import { POST as createCustomer } from "../src/app/api/company/customers/route";
import { PATCH as updateCustomer } from "../src/app/api/company/customers/[id]/route";
import { POST as inviteEmployee } from "../src/app/api/company/employees/route";
import { DELETE as deactivateEmployee } from "../src/app/api/company/employees/[id]/route";
import { POST as resendInvitation } from "../src/app/api/company/invitations/[id]/resend/route";
import { PATCH as updateSettings } from "../src/app/api/company/settings/route";
import { POST as replaceLogo } from "../src/app/api/company/logo/route";
import { POST as platformStatus } from "../src/app/api/platform-admin/companies/[id]/status/route";

const params = { params: Promise.resolve({ id: "507f1f77bcf86cd799439013" }) };

describe("mutating route authorization", () => {
  const routes = [
    ["create product", "POST", createProduct],
    ["update product", "PATCH", updateProduct],
    ["archive product", "DELETE", archiveProduct],
    ["upload product image", "POST", uploadProductImage],
    ["adjust stock", "POST", adjustStock],
    ["create sale", "POST", createSale],
    ["void sale", "POST", voidSale],
    ["record payment", "POST", recordPayment],
    ["create customer", "POST", createCustomer],
    ["update customer", "PATCH", updateCustomer],
    ["invite employee", "POST", inviteEmployee],
    ["deactivate employee", "DELETE", deactivateEmployee],
    ["resend invitation", "POST", resendInvitation],
    ["update settings", "PATCH", updateSettings],
    ["replace logo", "POST", replaceLogo],
    ["change platform status", "POST", platformStatus],
  ] as const;

  for (const [name, method, route] of routes) {
    it(`returns a standard 403 to an employee who tries to ${name}`, async () => {
      const request = new NextRequest("http://localhost/api/test", { method, headers: { "content-type": "application/json" }, body: method === "DELETE" ? undefined : "{}" });
      const response = await route(request, params);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ success: false, data: null, meta: null, error: { code: "FORBIDDEN" } });
      expect(response.headers.get("x-correlation-id")).toBeTruthy();
    });
  }

  it("allows only platform administrators to change company status", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({ userId: "507f1f77bcf86cd799439011", userEmail: "admin@example.test", userRole: "company_admin", companyId: "507f1f77bcf86cd799439012", companyStatus: "approved" });
    const request = new NextRequest("http://localhost/api/platform-admin/companies/507f1f77bcf86cd799439013/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
    const response = await platformStatus(request, params);
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  });
});

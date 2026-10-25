import { describe, expect, it } from "vitest";
import { appConfig } from "../src/config/app.config";

describe("public application configuration", () => {
  it("provides consistent pagination limits and a currency", () => {
    expect(appConfig.pagination.defaultLimit).toBeGreaterThan(0);
    expect(appConfig.pagination.defaultLimit).toBeLessThanOrEqual(appConfig.pagination.maxLimit);
    expect(appConfig.defaultCurrency).toMatch(/^[A-Z]{3}$/);
  });
});

import { appConfig } from "@/config/app.config";

export function formatMoney(minorUnits: number, currency: string = appConfig.defaultCurrency) {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(minorUnits / 10 ** digits);
}

/** Values in this module are safe to read from client components. */
export const appConfig = {
  name: "TrackOpsCloud",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  contactEmail: process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ?? "",
  supportEmail: process.env.NEXT_PUBLIC_PLATFORM_SUPPORT_EMAIL ?? process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ?? "",
  pagination: { defaultLimit: 20, maxLimit: 100 },
  defaultCurrency: "USD",
} as const;

export type AppConfig = typeof appConfig;

export type Plan = "standard" | "premium" | "enterprise";

export type Feature =
  | "dashboard"
  | "projects"
  | "clients"
  | "team"
  | "files"
  | "chat"
  | "invoices"
  | "payments"
  | "analytics"
  | "ads"
  | "notifications";

const base: Feature[] = ["dashboard", "projects", "clients", "team", "files", "notifications"];

const entitlementsByPlan: Record<Plan, Set<Feature>> = {
  standard: new Set([...base]),
  premium: new Set([...base, "chat", "invoices", "payments", "analytics"]),
  enterprise: new Set([...base, "chat", "invoices", "payments", "analytics"]),
};

export function hasFeature(plan: Plan, feature: Feature, adsEnabled: boolean = false): boolean {
  if (feature === "ads") return adsEnabled;
  return entitlementsByPlan[plan]?.has(feature) ?? false;
}

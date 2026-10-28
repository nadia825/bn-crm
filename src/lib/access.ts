import type { Account, Store, WorkItem, Barrel } from "./data.ts";
import type { DemoUser, Role } from "./model.ts";
export const ROLES: Role[] = [
  "System Admin",
  "Sales Manager",
  "Account Manager",
  "Operations Manager",
  "Operations Member",
  "Finance",
  "Viewer",
];
export const roleDescriptions: Record<Role, string> = {
  "System Admin":
    "All modules, user roles, shared configuration, and audit history.",
  "Sales Manager":
    "Sales pipelines, account assignments, team activities, and performance.",
  "Account Manager":
    "Assigned brands and affiliates, notes, follow-ups, cases, and tasks.",
  "Operations Manager":
    "Business work, team assignments, support, onboarding, and activation approvals.",
  "Operations Member":
    "Assigned work and support cases, operational notes, and assigned onboarding checks.",
  Finance: "Billing, payment follow-ups, billing cases, and financial reports.",
  Viewer: "Read-only access to designated accounts and reports.",
};
export type Action =
  | "accounts.read"
  | "accounts.create"
  | "accounts.edit"
  | "accounts.assign"
  | "accounts.note"
  | "pipeline.edit"
  | "tasks.read"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.assign"
  | "cases.read"
  | "cases.create"
  | "cases.edit"
  | "cases.assign"
  | "onboarding.read"
  | "onboarding.edit"
  | "onboarding.verify"
  | "onboarding.submit"
  | "onboarding.approve"
  | "barrels.read"
  | "barrels.edit"
  | "retailers.read"
  | "retailers.edit"
  | "activities.read"
  | "activities.edit"
  | "billing.read"
  | "billing.edit"
  | "users.edit"
  | "configuration.edit"
  | "audit.read"
  | "views.shared";
type RecordLike = {
  id?: string;
  manager?: string;
  assignee?: string;
  accountId?: string;
  type?: string;
  affiliateId?: string;
  supplierId?: string;
  checkOwners?: string[];
  owner?: string;
  category?: string;
};
const memberAccount = (u: DemoUser, a: RecordLike, d: Store) =>
  (a.type === "Corporate Brand" && a.checkOwners?.includes(u.name)) ||
  [...d.tasks, ...d.cases].some(
    (t) => t.accountId === a.id && t.assignee === u.name,
  );
const financeAccount = (a: RecordLike, d: Store) =>
  d.billing.some((b) => b.accountId === a.id) ||
  d.cases.some((c) => c.accountId === a.id && c.category === "Billing");
export function can(
  u: DemoUser,
  action: Action,
  record: RecordLike | undefined,
  d: Store,
): boolean {
  if (!u.active) return false;
  return u.roles.some((role) => {
    if (role === "System Admin") return true;
    const own = record?.manager === u.name;
    const assigned = record?.assignee === u.name;
    const linked = record?.accountId
      ? d.accounts.find((a) => a.id === record.accountId)
      : undefined;
    if (action === "accounts.read") {
      if (!record) return true;
      if (role === "Sales Manager") return record.type !== "Supplier";
      if (role === "Account Manager")
        return (
          (own && record.type !== "Supplier") ||
          (record.type === "Supplier" &&
            d.barrels.some(
              (b) =>
                b.supplierId === record.id &&
                d.accounts.find((x) => x.id === b.affiliateId)?.manager ===
                  u.name,
            ))
        );
      if (role === "Operations Manager") return true;
      if (role === "Operations Member") return !!memberAccount(u, record, d);
      if (role === "Finance") return !!financeAccount(record, d);
      return !!u.accountIds?.includes(record.id || "");
    }
    if (
      [
        "accounts.create",
        "accounts.edit",
        "accounts.assign",
        "accounts.note",
        "pipeline.edit",
      ].includes(action)
    ) {
      if (role === "Viewer" || role === "Finance") return false;
      if (role === "Sales Manager") return record?.type !== "Supplier";
      if (role === "Account Manager")
        return (
          !record ||
          (record.type !== "Supplier" &&
            own &&
            (action !== "accounts.assign" || record.manager === u.name))
        );
      if (role === "Operations Manager")
        return action === "accounts.note" || record?.type === "Supplier";
      return (
        action === "accounts.note" && !!record && !!memberAccount(u, record, d)
      );
    }
    if (action.startsWith("onboarding.")) {
      if (record && record.type !== "Corporate Brand") return false;
      if (action === "onboarding.approve") return role === "Operations Manager";
      if (role === "Operations Manager") return true;
      if (role === "Operations Member")
        return !record || !!memberAccount(u, record, d);
      if (role === "Account Manager") return !record || own;
      if (action === "onboarding.read")
        return (
          role === "Sales Manager" ||
          (role === "Viewer" &&
            !!record &&
            !!u.accountIds?.includes(record.id || ""))
        );
      return false;
    }
    if (action.startsWith("tasks.") || action.startsWith("cases.")) {
      const caseAction = action.startsWith("cases.");
      if (role === "Operations Manager") return true;
      if (role === "Viewer")
        return (
          action.endsWith(".read") &&
          !!record &&
          !!u.accountIds?.includes(record.accountId || "")
        );
      if (role === "Sales Manager")
        return (
          action === "tasks.read" && (!record || linked?.type !== "Supplier")
        );
      if (role === "Account Manager")
        return (
          !record ||
          (linked?.manager === u.name &&
            (!action.endsWith(".assign") || assigned))
        );
      if (role === "Operations Member")
        return action.endsWith(".read") || action.endsWith(".edit")
          ? !record || assigned
          : false;
      if (role === "Finance")
        return (
          caseAction &&
          (!record || record.category === "Billing") &&
          !action.endsWith(".assign")
        );
      return false;
    }
    if (action.startsWith("barrels.")) {
      const affiliate = d.accounts.find((a) => a.id === record?.affiliateId);
      if (role === "Operations Manager") return true;
      if (role === "Account Manager")
        return !record || affiliate?.manager === u.name;
      if (action === "barrels.read")
        return (
          role === "Sales Manager" ||
          (role === "Viewer" &&
            !!u.accountIds?.includes(record?.affiliateId || ""))
        );
      return false;
    }
    if (action.startsWith("retailers."))
      return (
        role === "Operations Manager" ||
        (action === "retailers.read" &&
          ["Sales Manager", "Account Manager", "Viewer"].includes(role))
      );
    if (action.startsWith("activities.")) {
      if (role === "Viewer")
        return (
          action === "activities.read" &&
          !!record &&
          !!u.accountIds?.includes(record.accountId || "")
        );
      if (role === "Finance") return false;
      if (role === "Sales Manager" || role === "Operations Manager")
        return true;
      if (role === "Account Manager")
        return !record || linked?.manager === u.name;
      return !record || record.owner === u.name;
    }
    if (action.startsWith("billing.")) return role === "Finance";
    return false;
  });
}

const moduleActions: Record<string, Action | undefined> = {
  Accounts: "accounts.read",
  "All Accounts": "accounts.read",
  Contacts: "accounts.read",
  "Affiliate Pipeline": "accounts.read",
  "Supplier Pipeline": "retailers.edit",
  "Work Board": "tasks.read",
  Tasks: "tasks.read",
  "Support Cases": "cases.read",
  "Brand Onboarding": "onboarding.read",
  "Pending Approvals": "onboarding.approve",
  "Barrel Management": "barrels.read",
  Retailers: "retailers.read",
  Activities: "activities.read",
  "Follow-ups": "activities.read",
  Billing: "billing.read",
  "Payment Follow-ups": "billing.read",
  "Finance Reports": "billing.read",
  "Users & Roles": "users.edit",
  Configuration: "configuration.edit",
  "Audit Log": "audit.read",
  Settings: "configuration.edit",
  "Team Assignments": "accounts.assign",
};
export function canPage(u: DemoUser, page: string, d: Store): boolean {
  if (page === "Dashboard") return u.active;
  if (page === "Reports")
    return u.active && u.roles.some((r) => r !== "Operations Member");
  if (page === "Team Assignments")
    return u.roles.some((r) => ["System Admin", "Sales Manager"].includes(r));
  if (page === "Company Overview") return u.roles.includes("System Admin");
  if (page === "Affiliate Pipeline")
    return u.roles.some((r) =>
      ["System Admin", "Sales Manager", "Account Manager", "Viewer"].includes(
        r,
      ),
    );
  if (page === "Work Board")
    return u.roles.some((r) =>
      ["System Admin", "Operations Manager", "Operations Member"].includes(r),
    );
  const action = moduleActions[page];
  return !!action && can(u, action, undefined, d);
}
export function visibleStore(raw: Store, u: DemoUser): Store {
  const financial = can(u, "billing.read", undefined, raw);
  const accounts = raw.accounts
    .filter((a) => can(u, "accounts.read", a, raw))
    .map((a) =>
      financial
        ? a
        : {
            ...a,
            customFields: Object.fromEntries(
              Object.entries(a.customFields || {}).filter(
                ([k]) =>
                  !raw.configuration.customFields.find((f) => f.id === k)
                    ?.sensitive,
              ),
            ),
          },
    );
  const ids = new Set(accounts.map((a) => a.id));
  const relatedRetailers = new Set(accounts.flatMap((a) => a.retailers));
  return {
    ...raw,
    accounts,
    tasks: raw.tasks.filter(
      (t) => ids.has(t.accountId) && can(u, "tasks.read", t, raw),
    ),
    cases: raw.cases.filter(
      (c) => ids.has(c.accountId) && can(u, "cases.read", c, raw),
    ),
    barrels: raw.barrels.filter(
      (b) => ids.has(b.affiliateId) && can(u, "barrels.read", b, raw),
    ),
    billing: financial ? raw.billing : [],
    activities: raw.activities.filter(
      (a) => ids.has(a.accountId) && can(u, "activities.read", a, raw),
    ),
    audit: can(u, "audit.read", undefined, raw) ? raw.audit : [],
    views: raw.views.filter(
      (v) => v.ownerId === u.id || v.visibility === "Shared",
    ),
    retailerRecords: raw.retailerRecords.filter(
      (r) =>
        u.roles.some((x) =>
          ["System Admin", "Operations Manager"].includes(x),
        ) || relatedRetailers.has(r.name),
    ),
    retailers: raw.retailers.filter(
      (r) =>
        u.roles.some((x) =>
          ["System Admin", "Operations Manager"].includes(x),
        ) || relatedRetailers.has(r),
    ),
    configuration: {
      ...raw.configuration,
      customFields: raw.configuration.customFields.filter(
        (f) => financial || !f.sensitive,
      ),
    },
  };
}
export function defaultWorkspace(
  u: DemoUser,
): "brands" | "affiliates" | "operations" {
  return u.roles.some((r) =>
    ["Operations Manager", "Operations Member"].includes(r),
  )
    ? "operations"
    : u.roles.includes("Sales Manager")
      ? "affiliates"
      : "brands";
}
export function allowedWorkspaces(
  u: DemoUser,
): ("brands" | "affiliates" | "operations")[] {
  return (["brands", "affiliates", "operations"] as const).filter((w) =>
    u.roles.some((r) =>
      r === "System Admin" || r === "Operations Member"
        ? r === "System Admin" || w === "operations"
        : r === "Operations Manager"
          ? w !== "affiliates"
          : w !== "operations",
    ),
  );
}

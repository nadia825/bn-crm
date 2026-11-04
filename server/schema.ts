import {
  affiliateStages,
  barrelStages,
  caseStages,
  workStages,
  type Store,
} from "../src/lib/data.ts";
import { ROLES } from "../src/lib/access.ts";
function fail(message: string): never {
  throw new Error(message);
}
function obj(x: unknown): asserts x is Record<string, any> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    fail("Expected a record object.");
}
function strings(x: unknown): asserts x is string[] {
  if (!Array.isArray(x) || x.some((v) => typeof v !== "string"))
    fail("Expected a list of text values.");
}
function text(x: unknown) {
  if (typeof x !== "string") fail("Expected a text value.");
}
function fields(x: Record<string, any>, keys: string[]) {
  for (const key of keys) text(x[key]);
}
function one(x: unknown, options: readonly string[]) {
  if (typeof x !== "string" || !options.includes(x))
    fail("Invalid business status or type.");
}
function list(x: unknown): asserts x is Record<string, any>[] {
  if (!Array.isArray(x) || x.length > 10000) fail("Invalid record collection.");
  const ids = new Set();
  for (const row of x) {
    obj(row);
    if (typeof row.id !== "string" || !row.id || ids.has(row.id))
      fail("Record IDs must be present and unique.");
    ids.add(row.id);
  }
}
function events(x: unknown) {
  list(x);
  for (const event of x) fields(event, ["text", "author", "at"]);
}
function date(x: unknown) {
  text(x);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(x as string) ||
    !Number.isFinite(Date.parse(x as string)) ||
    new Date(x as string).toISOString().slice(0, 10) !== x
  )
    fail("Choose a valid date.");
}
/** Validate untrusted JSON before policy code touches it and before SQLite commits it. */
export function validateStore(value: unknown): asserts value is Store {
  obj(value);
  if (value.version !== 1) fail("Unsupported mock data version.");
  text(value.workspace);
  if (!value.workspace.trim()) fail("Organization name is required.");
  obj(value.settings);
  if (
    typeof value.settings.reminders !== "boolean" ||
    typeof value.settings.digest !== "boolean" ||
    typeof value.notificationsRead !== "boolean"
  )
    fail("Invalid preferences.");
  for (const key of [
    "accounts",
    "tasks",
    "cases",
    "barrels",
    "billing",
    "activities",
    "users",
    "views",
    "retailerRecords",
    "audit",
    "bnxDirectory",
  ])
    list(value[key]);
  obj(value.configuration);
  strings(value.configuration.affiliateExtras);
  strings(value.configuration.supplierStages);
  list(value.configuration.customFields);
  for (const f of value.configuration.customFields) {
    fields(f, ["label"]);
    one(f.type, ["Text", "Select"]);
    one(f.scope, ["All accounts", "Corporate Brand", "Affiliate"]);
    strings(f.options);
    if (typeof f.sensitive !== "boolean") fail("Invalid field sensitivity.");
  }
  strings(value.retailers);
  for (const u of value.users) {
    fields(u, ["name", "email"]);
    strings(u.roles);
    if (
      !u.roles.length ||
      u.roles.some((r: string) => !ROLES.includes(r as any)) ||
      typeof u.active !== "boolean"
    )
      fail("Users require predefined roles and an active flag.");
    if (u.accountIds !== undefined) strings(u.accountIds);
  }
  if (
    !value.users.some((u: any) => u.active && u.roles.includes("System Admin"))
  )
    fail("Keep an active System Admin.");
  for (const r of value.retailerRecords) {
    fields(r, ["name", "email", "region"]);
    one(r.status, ["Active", "Onboarding", "Inactive"]);
  }
  if (
    new Set(value.retailerRecords.map((r: any) => r.name)).size !==
    value.retailerRecords.length
  )
    fail("Retailer names must be unique.");
  const accountIds = new Set(value.accounts.map((a: any) => a.id));
  const userNames = new Set(value.users.map((u: any) => u.name));
  const retailerNames = new Set(value.retailerRecords.map((r: any) => r.name));
  for (const a of value.accounts) {
    fields(a, [
      "name",
      "email",
      "manager",
      "status",
      "stage",
      "shopify",
      "lastActivity",
      "color",
      "description",
    ]);
    date(a.followUp);
    if (!a.name.trim() || !a.email.trim() || !userNames.has(a.manager))
      fail("Account names, email and an existing owner are required.");
    one(a.type, ["Corporate Brand", "Affiliate", "Supplier"]);
    strings(a.retailers);
    strings(a.attachments);
    events(a.notes);
    events(a.history);
    if (
      !Array.isArray(a.contacts) ||
      a.contacts.some(
        (c: any) =>
          !c || [c.name, c.email, c.role].some((x) => typeof x !== "string"),
      )
    )
      fail("Invalid contacts.");
    if (
      !Array.isArray(a.checks) ||
      a.checks.length !== 6 ||
      a.checks.some((x: any) => typeof x !== "boolean")
    )
      fail("Keep all six onboarding checks.");
    one(a.verification, ["Pending", "Verified"]);
    one(a.approval, [
      "Not submitted",
      "Pending approval",
      "Approved",
      "Rejected",
    ]);
    if (a.bnxId !== undefined) text(a.bnxId);
    if (a.bnxVerified !== undefined && typeof a.bnxVerified !== "boolean")
      fail("Invalid BNX verification.");
    if (a.checkOwners !== undefined) strings(a.checkOwners);
    if (a.customFields !== undefined) {
      obj(a.customFields);
      Object.values(a.customFields).forEach(text);
    }
    if (a.retailers.some((r: string) => !retailerNames.has(r)))
      fail("Unknown retailer relationship.");
    if (a.type === "Corporate Brand") {
      one(a.status, ["Onboarding", "Active"]);
      if (a.stage !== a.status)
        fail("Brand stage must match its lifecycle status.");
      if (
        (a.verification === "Verified" ||
          a.approval === "Pending approval" ||
          a.approval === "Approved") &&
        !a.checks.every(Boolean)
      )
        fail("All six checks are required before verification and approval.");
      if (
        ["Pending approval", "Approved"].includes(a.approval) &&
        a.verification !== "Verified"
      )
        fail("Verification is required before approval.");
      if (a.status === "Active" && a.approval !== "Approved")
        fail("Operations approval is required for activation.");
    } else if (a.type === "Affiliate") {
      one(a.stage, [
        ...affiliateStages,
        ...value.configuration.affiliateExtras,
      ]);
      const status =
        a.stage === "Live"
          ? "Active"
          : ["On Hold", "Rejected", "Inactive"].includes(a.stage)
            ? a.stage
            : "Prospect";
      if (a.status !== status)
        fail("Affiliate lifecycle status must match its stage.");
    } else one(a.stage, value.configuration.supplierStages);
  }
  for (const kind of ["tasks", "cases"]) {
    for (const r of value[kind]) {
      fields(r, [
        "title",
        "description",
        "accountId",
        "category",
        "assignee",
        "priority",
        "status",
        "resolution",
        "reminder",
      ]);
      date(r.due);
      strings(r.attachments);
      events(r.comments);
      events(r.history);
      if (
        !r.title.trim() ||
        !accountIds.has(r.accountId) ||
        !userNames.has(r.assignee)
      )
        fail("Work requires a title, existing account and assigned owner.");
      one(r.status, kind === "tasks" ? workStages : caseStages);
      one(r.priority, ["Low", "Medium", "High", "Urgent"]);
      if (
        kind === "cases" &&
        ["Resolved", "Closed"].includes(r.status) &&
        !r.resolution.trim()
      )
        fail("A resolution is required.");
      if (
        r.caseId &&
        !value.cases.some(
          (c: any) => c.id === r.caseId && c.accountId === r.accountId,
        )
      )
        fail("Linked cases must belong to the same account.");
    }
  }
  for (const b of value.barrels) {
    fields(b, ["name", "affiliateId", "supplierId", "retailer"]);
    one(b.status, barrelStages);
    if (
      !value.accounts.some(
        (a: any) => a.id === b.affiliateId && a.type === "Affiliate",
      ) ||
      !value.accounts.some(
        (a: any) => a.id === b.supplierId && a.type === "Supplier",
      ) ||
      !retailerNames.has(b.retailer)
    )
      fail("Invalid barrel relationships.");
    for (const key of ["stock", "sales"])
      if (!Number.isFinite(b[key]) || b[key] < 0)
        fail("Barrel quantities cannot be negative.");
  }
  for (const b of value.billing) {
    fields(b, ["accountId", "description", "reference"]);
    date(b.due);
    one(b.status, ["Draft", "Open", "Overdue", "Paid"]);
    if (
      !value.accounts.some(
        (a: any) => a.id === b.accountId && a.type !== "Supplier",
      ) ||
      !Number.isFinite(b.amount) ||
      b.amount < 0
    )
      fail("Invalid mock invoice.");
  }
  for (const a of value.activities) {
    fields(a, ["accountId", "owner", "title", "due", "notes"]);
    one(a.kind, ["Meeting", "Call", "Note", "Follow-up"]);
    one(a.status, ["Scheduled", "Done"]);
    if (
      !accountIds.has(a.accountId) ||
      !userNames.has(a.owner) ||
      !a.title.trim() ||
      !Number.isFinite(Date.parse(a.due))
    )
      fail("Invalid account activity.");
  }
  for (const v of value.views) {
    fields(v, ["name", "module", "ownerId"]);
    one(v.visibility, ["Personal", "Shared"]);
    obj(v.snapshot);
    if (!value.users.some((u: any) => u.id === v.ownerId))
      fail("Saved views require an existing owner.");
  }
  for (const e of value.audit) {
    fields(e, ["at", "actorId", "actor", "action", "recordId", "detail"]);
    strings(e.roles);
    one(e.outcome, ["Allowed", "Denied"]);
  }
  for (const b of value.bnxDirectory) {
    fields(b, ["name"]);
    one(b.type, ["Corporate Brand", "Affiliate", "Supplier"]);
  }
}

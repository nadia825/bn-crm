import {
  seed,
  affiliateStages,
  workStages,
  caseStages,
  type Store,
  type Account,
} from "./data.ts";
import { can, ROLES, visibleStore, type Action } from "./access.ts";
import type { AuditEntry, DemoUser } from "./model.ts";

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const stamp = () => new Date().toISOString();
function audit(
  u: DemoUser,
  action: string,
  recordId: string,
  detail: string,
  outcome: "Allowed" | "Denied" = "Allowed",
): AuditEntry {
  return {
    id: crypto.randomUUID(),
    at: stamp(),
    actorId: u.id,
    actor: u.name,
    roles: [...u.roles],
    action,
    recordId,
    detail,
    outcome,
  };
}
export function migrateStore(input: Partial<Store>): Store {
  const defaults = seed();
  const merged = {
    ...defaults,
    ...input,
    configuration: { ...defaults.configuration, ...input.configuration },
    settings: { ...defaults.settings, ...input.settings },
  } as Store;
  merged.accounts = merged.accounts.map((a) => {
    const original = defaults.accounts.find((b) => b.id === a.id);
    return {
      ...a,
      bnxId: a.bnxId ?? original?.bnxId,
      bnxVerified: a.bnxVerified ?? original?.bnxVerified ?? false,
      customFields: a.customFields || {},
      checkOwners:
        a.checkOwners || original?.checkOwners || Array(6).fill(a.manager),
    };
  });
  // An additive migration keeps every pre-existing business record and edit.
  merged.billing = merged.billing.filter((b) =>
    merged.accounts.some((a) => a.id === b.accountId),
  );
  merged.activities = merged.activities.filter((a) =>
    merged.accounts.some((x) => x.id === a.accountId),
  );
  merged.retailerRecords = merged.retailerRecords.filter((r) =>
    merged.retailers.includes(r.name),
  );
  merged.retailers.forEach((name, i) => {
    if (!merged.retailerRecords.some((r) => r.name === name))
      merged.retailerRecords.push({
        id: `RET-LOCAL-${i}`,
        name,
        email: "",
        status: "Active",
        region: "Unspecified",
      });
  });
  return merged;
}
export function possibleDuplicates(
  d: Store,
  name: string,
  email: string,
  except?: string,
) {
  const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return d.accounts.filter(
    (a) =>
      a.id !== except &&
      ((name.trim().length > 2 && normalized(a.name) === normalized(name)) ||
        (email.trim() && a.email.toLowerCase() === email.toLowerCase())),
  );
}
function criticalAccountActions(
  old: Account | undefined,
  next: Account,
): Action[] {
  if (!old) return ["accounts.create"];
  const out: Action[] = [];
  if (old.manager !== next.manager) out.push("accounts.assign");
  if (
    old.type === "Supplier" &&
    (old.stage !== next.stage || old.status !== next.status)
  )
    out.push("accounts.edit");
  if (
    old.type === "Corporate Brand" &&
    old.status !== next.status &&
    next.status !== "Active"
  )
    out.push("accounts.edit");
  if (
    old.type === "Affiliate" &&
    (old.stage !== next.stage || old.status !== next.status)
  )
    out.push("pipeline.edit");
  if (!same(old.checks, next.checks)) out.push("onboarding.edit");
  if (old.verification !== next.verification)
    out.push(
      next.verification === "Verified"
        ? "onboarding.verify"
        : "onboarding.edit",
    );
  if (old.approval !== next.approval)
    out.push(
      ["Approved", "Rejected"].includes(next.approval)
        ? "onboarding.approve"
        : next.approval === "Pending approval"
          ? "onboarding.submit"
          : "onboarding.edit",
    );
  const ignore = [
    "manager",
    "stage",
    "status",
    "checks",
    "verification",
    "approval",
    "history",
    "lastActivity",
    "notes",
    "attachments",
  ];
  if (
    Object.keys(next).some(
      (k) =>
        !ignore.includes(k) &&
        !same(old[k as keyof Account], next[k as keyof Account]),
    )
  )
    out.push("accounts.edit");
  if (!same(old.notes, next.notes) || !same(old.attachments, next.attachments))
    out.push("accounts.note");
  return out.length ? out : ["accounts.note"];
}

export function applyMutation(
  raw: Store,
  proposed: Store,
  actor: DemoUser,
): { store: Store; error?: string } {
  const visible = visibleStore(raw, actor);
  const next = { ...raw };
  const events: AuditEntry[] = [];
  let attempted = "record.update",
    recordId = "workspace";
  const require = (action: Action, record?: Parameters<typeof can>[2]) => {
    attempted = action;
    recordId = record?.id || "workspace";
    if (!can(actor, action, record, raw))
      throw new Error(
        `Your demo roles do not allow ${action.replaceAll(".", " ")} for this record.`,
      );
  };
  const fixAuthors = (item: any, old: any) => {
    const copy = { ...item };
    for (const field of ["history", "comments", "notes"]) {
      if (Array.isArray(item[field])) {
        const previous = new Set((old?.[field] || []).map((e: any) => e.id));
        copy[field] = item[field].map((e: any) =>
          previous.has(e.id) ? e : { ...e, author: actor.name },
        );
      }
    }
    return copy;
  };
  try {
    for (const collection of [
      "accounts",
      "tasks",
      "cases",
      "barrels",
      "billing",
      "activities",
      "users",
      "views",
      "retailerRecords",
    ] as const) {
      const before = visible[collection] as any[],
        after = proposed[collection] as any[];
      if (!Array.isArray(after))
        throw new Error("A record collection is invalid.");
      const updates = new Map<string, any>();
      const removals = new Set<string>();
      for (const item of after) {
        const old = before.find((x) => x.id === item.id);
        const actual = (raw[collection] as any[]).find((x) => x.id === item.id);
        if (actual && !old)
          throw new Error("That record is outside your authorized demo scope.");
        if (old && same(old, item)) continue;
        recordId = item.id;
        if (!item.id || after.filter((x) => x.id === item.id).length !== 1)
          throw new Error("Record IDs must be unique.");
        if (collection === "accounts") {
          const a = item as Account;
          for (const action of criticalAccountActions(old, a))
            require(action, old || a);
          if (
            old &&
            old.manager !== a.manager &&
            !actor.roles.some(
              (r) =>
                r === "System Admin" ||
                r === "Sales Manager" ||
                (r === "Operations Manager" && a.type === "Supplier"),
            )
          )
            throw new Error(
              "Account Manager reassignment requires Sales Manager access.",
            );
          if (old && a.type !== old.type)
            throw new Error(
              "Account types are protected business relationships.",
            );
          if (old?.bnxVerified && a.bnxId !== old.bnxId)
            throw new Error("A verified BNX identifier cannot be changed.");
          const match = a.bnxId
            ? raw.bnxDirectory.find((b) => b.id === a.bnxId)
            : undefined;
          if (
            a.bnxId &&
            raw.accounts.some(
              (b) =>
                b.id !== a.id &&
                b.bnxId === a.bnxId &&
                (b.bnxVerified || !!match),
            )
          )
            throw new Error(
              "Confirmed duplicate: that verified BNX ID is already linked to an account.",
            );
          if (match && match.type !== a.type)
            throw new Error(
              "The mock BNX record has a different account type.",
            );
          a.bnxVerified = !!match || !!old?.bnxVerified;
          if (!a.name.trim() || !a.email.trim())
            throw new Error("Account name and email are required.");
          if (a.retailers.some((r) => !raw.retailers.includes(r)))
            throw new Error(
              "Choose an existing retailer to preserve the relationship.",
            );
          if (a.checks.length !== 6)
            throw new Error(
              "All six protected onboarding requirements must be retained.",
            );
          if (
            actor.roles.includes("Operations Member") &&
            !actor.roles.some(
              (r) =>
                ["System Admin", "Operations Manager"].includes(r) ||
                (r === "Account Manager" && a.manager === actor.name),
            ) &&
            old
          ) {
            for (let i = 0; i < 6; i++)
              if (
                old.checks[i] !== a.checks[i] &&
                old.checkOwners?.[i] !== actor.name
              )
                throw new Error(
                  "Only the assigned owner can change this onboarding requirement.",
                );
          }
          if (a.verification === "Verified" && !a.checks.every(Boolean))
            throw new Error(
              "All six requirements must be complete before verification.",
            );
          if (
            a.approval === "Pending approval" &&
            (!a.checks.every(Boolean) || a.verification !== "Verified")
          )
            throw new Error("Verification is required before submission.");
          if (
            (a.approval === "Approved" || a.status === "Active") &&
            a.type === "Corporate Brand" &&
            (!a.checks.every(Boolean) ||
              a.verification !== "Verified" ||
              a.approval !== "Approved")
          )
            throw new Error(
              "Brand activation requires six checks, verification, and approval.",
            );
          if (
            a.type === "Corporate Brand" &&
            old &&
            old.status !== a.status &&
            a.status === "Active"
          )
            require("onboarding.approve", old);
          if (
            old &&
            old.checks.some((x: boolean, i: number) => x !== a.checks[i]) &&
            (a.verification !== "Pending" || a.approval !== "Not submitted")
          )
            throw new Error(
              "Changing setup must invalidate verification and approval.",
            );
          if (
            old &&
            old.approval !== a.approval &&
            a.approval === "Approved" &&
            old.approval !== "Pending approval"
          )
            throw new Error(
              "Submit the brand for Operations review before approval.",
            );
          if (
            a.type === "Affiliate" &&
            ![
              ...affiliateStages,
              ...raw.configuration.affiliateExtras,
            ].includes(a.stage)
          )
            throw new Error("Choose a configured affiliate stage.");
          if (
            a.type === "Supplier" &&
            !raw.configuration.supplierStages.includes(a.stage)
          )
            throw new Error("Choose a configured supplier stage.");
          a.customFields = {
            ...(actual?.customFields || {}),
            ...(a.customFields || {}),
          };
          for (const f of raw.configuration.customFields.filter(
            (f) => f.sensitive,
          ))
            if (
              !same(actual?.customFields?.[f.id], a.customFields?.[f.id]) &&
              !can(actor, "billing.edit", undefined, raw)
            )
              throw new Error(
                "Financial fields are restricted to Finance roles.",
              );
        } else if (collection === "tasks" || collection === "cases") {
          const kind = collection;
          require(`${kind}.${old ? "edit" : "create"}` as Action, old || item);
          if (old && old.assignee !== item.assignee) {
            require(`${kind}.assign` as Action, old);
            if (
              !actor.roles.some((r) =>
                ["System Admin", "Operations Manager"].includes(r),
              ) &&
              item.assignee !== actor.name
            )
              throw new Error(
                "Task delegation requires an Operations Manager.",
              );
          }
          if (
            !raw.accounts.some(
              (a) =>
                a.id === item.accountId && can(actor, "accounts.read", a, raw),
            )
          )
            throw new Error("Choose an account available to your demo roles.");
          if (
            !old &&
            !actor.roles.some((r) =>
              ["System Admin", "Operations Manager"].includes(r),
            ) &&
            item.assignee !== actor.name
          )
            throw new Error(
              "New work must be assigned to you in this demo role.",
            );
          if (
            !(kind === "tasks" ? workStages : caseStages).includes(item.status)
          )
            throw new Error("Invalid workflow status.");
          if (
            kind === "cases" &&
            ["Resolved", "Closed"].includes(item.status) &&
            !item.resolution.trim()
          )
            throw new Error("A case resolution is required.");
          if (
            item.caseId &&
            !raw.cases.some(
              (c) => c.id === item.caseId && c.accountId === item.accountId,
            )
          )
            throw new Error("Linked cases must belong to the same account.");
        } else if (collection === "barrels") {
          require("barrels.edit", old || item);
          if (
            !raw.accounts.some(
              (a) => a.id === item.affiliateId && a.type === "Affiliate",
            ) ||
            !raw.accounts.some(
              (a) => a.id === item.supplierId && a.type === "Supplier",
            ) ||
            !raw.retailers.includes(item.retailer)
          )
            throw new Error(
              "Barrel relationships must reference existing affiliates, suppliers, and retailers.",
            );
          if (item.stock < 0 || item.sales < 0)
            throw new Error("Stock and sales cannot be negative.");
        } else if (collection === "billing") {
          require("billing.edit");
          if (
            !raw.accounts.some(
              (a) => a.id === item.accountId && a.type !== "Supplier",
            ) ||
            !Number.isFinite(item.amount) ||
            item.amount < 0
          )
            throw new Error("Choose a client account and a valid mock amount.");
        } else if (collection === "activities") {
          require("activities.edit", old || item);
          if (
            !raw.accounts.some(
              (a) =>
                a.id === item.accountId && can(actor, "accounts.read", a, raw),
            )
          )
            throw new Error("Choose an authorized account.");
          if (
            !actor.roles.some((r) =>
              ["System Admin", "Sales Manager", "Operations Manager"].includes(
                r,
              ),
            ) &&
            item.owner !== actor.name
          )
            throw new Error("Activities must be assigned to you.");
        } else if (collection === "users") {
          require("users.edit");
          if (
            !item.roles.length ||
            item.roles.some((r: string) => !ROLES.includes(r as any))
          )
            throw new Error("Every user needs at least one predefined role.");
        } else if (collection === "views") {
          if (old?.visibility === "Shared" || item.visibility === "Shared")
            require("views.shared");
          if (item.visibility !== "Shared" && item.ownerId !== actor.id)
            throw new Error("Personal views belong to their creator.");
          attempted = "views.save";
        } else if (collection === "retailerRecords") {
          require("retailers.edit");
          if (
            old &&
            old.name !== item.name &&
            raw.accounts.some((a) => a.retailers.includes(old.name))
          )
            throw new Error(
              "Names of linked retailers are preserved. Edit contact details instead.",
            );
        }
        updates.set(item.id, fixAuthors(item, actual));
        events.push(
          audit(
            actor,
            `${collection}.${old ? "updated" : "created"}`,
            item.id,
            old
              ? `Updated ${item.name || item.title || item.id}`
              : `Created ${item.name || item.title || item.id}`,
          ),
        );
      }
      for (const old of before.filter(
        (x) => !after.some((y) => y.id === x.id),
      )) {
        if (collection !== "views")
          throw new Error(
            "Business records cannot be deleted from this prototype.",
          );
        if (old.visibility === "Shared") require("views.shared");
        else if (old.ownerId !== actor.id)
          throw new Error("You can only delete your own personal views.");
        removals.add(old.id);
        events.push(
          audit(actor, "views.deleted", old.id, `Deleted view ${old.name}`),
        );
      }
      (next as any)[collection] = [
        ...(raw[collection] as any[])
          .filter((x) => !removals.has(x.id))
          .map((x) => updates.get(x.id) || x),
        ...Array.from(updates.values()).filter(
          (x) => !(raw[collection] as any[]).some((y) => y.id === x.id),
        ),
      ];
    }
    if (!same(visible.configuration, proposed.configuration)) {
      require("configuration.edit");
      const cfg = proposed.configuration;
      if (
        cfg.affiliateExtras.some((s) => affiliateStages.includes(s)) ||
        new Set(cfg.affiliateExtras).size !== cfg.affiliateExtras.length
      )
        throw new Error(
          "Additional stage names must be unique and cannot replace protected stages.",
        );
      if (
        raw.accounts.some(
          (a) => a.type === "Supplier" && !cfg.supplierStages.includes(a.stage),
        )
      )
        throw new Error("Supplier stages in use cannot be removed.");
      if (
        raw.accounts.some(
          (a) =>
            a.type === "Affiliate" &&
            !affiliateStages.includes(a.stage) &&
            !cfg.affiliateExtras.includes(a.stage),
        )
      )
        throw new Error("Affiliate stages in use cannot be removed.");
      if (
        cfg.customFields.some((f) => !f.id || !f.label.trim()) ||
        new Set(cfg.customFields.map((f) => f.id)).size !==
          cfg.customFields.length
      )
        throw new Error("Custom fields need unique IDs and labels.");
      next.configuration = cfg;
      events.push(
        audit(
          actor,
          "configuration.updated",
          "organization",
          "Updated controlled pipeline or field configuration",
        ),
      );
    }
    if (proposed.workspace !== visible.workspace) {
      require("configuration.edit");
      next.workspace = proposed.workspace.trim();
      events.push(
        audit(
          actor,
          "organization.updated",
          "organization",
          "Updated organization name",
        ),
      );
    }
    if (!next.users.some((u) => u.active && u.roles.includes("System Admin")))
      throw new Error("Keep at least one active System Admin.");
    next.settings = proposed.settings;
    next.notificationsRead = proposed.notificationsRead;
    next.retailers = next.retailerRecords.map((r) => r.name);
    // Caller-supplied audit records and BNX reference catalogs are never accepted.
    next.audit = [...events, ...raw.audit];
    return { store: next };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Change denied";
    return {
      store: {
        ...raw,
        audit: [
          audit(actor, attempted, recordId, message, "Denied"),
          ...raw.audit,
        ],
      },
      error: message,
    };
  }
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/data.ts";
import {
  can,
  canPage,
  visibleStore,
  allowedWorkspaces,
} from "../src/lib/access.ts";
import {
  applyMutation,
  migrateStore,
  possibleDuplicates,
} from "../src/lib/mutations.ts";
const setup = (id) => {
  const d = seed();
  return { d, u: d.users.find((u) => u.id === id) };
};
const change = (d, u, fn) => {
  const v = structuredClone(visibleStore(d, u));
  fn(v);
  return applyMutation(d, v, u);
};
test("each role exposes its intended modules and business workspaces", () => {
  const expected = {
    olivia: [
      "Users & Roles",
      "Audit Log",
      "Configuration",
      "Billing",
      "Pending Approvals",
    ],
    james: ["Affiliate Pipeline", "Team Assignments", "Activities"],
    sofia: ["Accounts", "Support Cases", "Tasks", "Follow-ups"],
    marcus: ["Work Board", "Pending Approvals", "Support Cases"],
    avery: ["Work Board", "Brand Onboarding", "Activities"],
    taylor: ["Billing", "Payment Follow-ups", "Finance Reports"],
    riley: ["All Accounts", "Reports"],
    maya: ["Billing", "Accounts", "Tasks"],
  };
  for (const [id, pages] of Object.entries(expected)) {
    const { d, u } = setup(id);
    for (const p of pages) assert.ok(canPage(u, p, d), `${id} ${p}`);
    assert.ok(allowedWorkspaces(u).length);
  }
  for (const id of [
    "james",
    "sofia",
    "marcus",
    "avery",
    "taylor",
    "riley",
    "maya",
  ]) {
    const { d, u } = setup(id);
    assert.equal(canPage(u, "Users & Roles", d), false);
    assert.equal(canPage(u, "Configuration", d), false);
  }
});
test("record scopes and financial redaction combine correctly for multiple roles", () => {
  for (const id of ["sofia", "avery", "taylor", "riley", "maya"]) {
    const { d, u } = setup(id),
      v = visibleStore(d, u);
    assert.ok(v.accounts.length < d.accounts.length);
    if (id === "sofia")
      assert.ok(
        v.accounts
          .filter((a) => a.type !== "Supplier")
          .every((a) => a.manager === u.name),
      );
    if (id === "avery") {
      assert.ok(v.tasks.every((t) => t.assignee === u.name));
      assert.ok(v.cases.every((t) => t.assignee === u.name));
    }
    if (id === "riley") assert.equal(v.accounts.length, 4);
    if (id === "taylor")
      assert.ok(v.cases.every((c) => c.category === "Billing"));
    assert.equal(v.billing.length > 0, ["taylor", "maya"].includes(id));
  }
  const { d, u } = setup("maya");
  const outside = d.accounts.find(
    (a) => a.manager !== u.name && d.billing.some((b) => b.accountId === a.id),
  );
  assert.ok(can(u, "accounts.read", outside, d));
  assert.equal(can(u, "accounts.edit", outside, d), false);
  d.configuration.customFields = [
    {
      id: "fee",
      label: "Fee",
      sensitive: true,
      type: "Text",
      scope: "All accounts",
      options: [],
    },
  ];
  d.accounts.forEach((a) => (a.customFields = { fee: "private" }));
  assert.ok(
    visibleStore(
      d,
      d.users.find((x) => x.id === "sofia"),
    ).accounts.every((a) => !a.customFields.fee),
  );
  assert.ok(visibleStore(d, u).accounts.some((a) => a.customFields.fee));
});
test("viewer writes and hidden record changes fail in the mutation layer", () => {
  const { d, u } = setup("riley");
  const denied = change(d, u, (v) => (v.accounts[0].name = "Forged"));
  assert.ok(denied.error);
  assert.equal(denied.store.accounts[0].name, d.accounts[0].name);
  assert.equal(denied.store.audit[0].outcome, "Denied");
  const { u: am } = setup("sofia");
  const hidden = d.accounts.find((a) => !can(am, "accounts.read", a, d));
  const forged = change(d, am, (v) =>
    v.accounts.push({ ...hidden, name: "Forged" }),
  );
  assert.ok(forged.error);
});
test("authorized partial changes preserve hidden records, sensitive values and actor audit", () => {
  const { d, u } = setup("sofia");
  d.configuration.customFields = [
    {
      id: "fee",
      label: "Fee",
      sensitive: true,
      type: "Text",
      scope: "All accounts",
      options: [],
    },
  ];
  const own = d.accounts.find(
    (a) => a.manager === u.name && a.type === "Corporate Brand",
  );
  own.customFields = { fee: "hidden" };
  const result = change(d, u, (v) => {
    const a = v.accounts.find((a) => a.id === own.id);
    a.description = "New description";
    a.history.unshift({
      id: "forged",
      text: "Edited",
      author: "Someone else",
      at: new Date().toISOString(),
    });
    v.audit = [{ id: "forged" }];
  });
  assert.equal(result.error, undefined);
  assert.equal(result.store.accounts.length, d.accounts.length);
  assert.equal(
    result.store.accounts.find((a) => a.id === own.id).customFields.fee,
    "hidden",
  );
  assert.equal(
    result.store.accounts.find((a) => a.id === own.id).history[0].author,
    u.name,
  );
  assert.equal(result.store.audit[0].actor, u.name);
  assert.equal(
    result.store.audit.some((e) => e.id === "forged"),
    false,
  );
});
test("role administration requires fixed roles and an active admin", () => {
  const { d, u } = setup("olivia");
  assert.ok(change(d, u, (v) => (v.users[1].roles = [])).error);
  assert.ok(change(d, u, (v) => (v.users[0].active = false)).error);
  assert.equal(
    change(d, u, (v) => (v.users[1].roles = ["Sales Manager", "Finance"]))
      .error,
    undefined,
  );
});
test("Operations Member can update assigned work and only assigned checklist items", () => {
  const { d, u } = setup("avery");
  const t = d.tasks.find((t) => t.assignee === u.name);
  assert.equal(
    change(
      d,
      u,
      (v) => (v.tasks.find((x) => x.id === t.id).status = "In Progress"),
    ).error,
    undefined,
  );
  assert.ok(
    change(
      d,
      u,
      (v) => (v.tasks.find((x) => x.id === t.id).assignee = "Sofia Chen"),
    ).error,
  );
  const a = d.accounts.find(
    (a) => a.status === "Onboarding" && a.checkOwners.includes(u.name),
  );
  const own = a.checkOwners.findIndex((n) => n === u.name),
    other = a.checkOwners.findIndex((n) => n !== u.name);
  const toggle = (v, i) => {
    const b = v.accounts.find((b) => b.id === a.id);
    b.checks[i] = !b.checks[i];
    b.verification = "Pending";
    b.approval = "Not submitted";
  };
  assert.equal(change(d, u, (v) => toggle(v, own)).error, undefined);
  assert.ok(change(d, u, (v) => toggle(v, other)).error);
});
test("activation requires six checks, verification, submission and an Operations approver", () => {
  const { d, u } = setup("sofia");
  const a = d.accounts.find(
    (a) =>
      a.manager === u.name &&
      a.status === "Onboarding" &&
      a.type === "Corporate Brand",
  );
  assert.ok(
    change(d, u, (v) => {
      const b = v.accounts.find((b) => b.id === a.id);
      b.verification = "Verified";
    }).error,
  );
  let step = change(d, u, (v) => {
    const b = v.accounts.find((b) => b.id === a.id);
    b.checks = Array(6).fill(true);
    b.verification = "Pending";
    b.approval = "Not submitted";
  });
  assert.equal(step.error, undefined);
  step = change(
    step.store,
    u,
    (v) => (v.accounts.find((b) => b.id === a.id).verification = "Verified"),
  );
  assert.equal(step.error, undefined);
  step = change(
    step.store,
    u,
    (v) =>
      (v.accounts.find((b) => b.id === a.id).approval = "Pending approval"),
  );
  assert.equal(step.error, undefined);
  const approve = (v) => {
    const b = v.accounts.find((b) => b.id === a.id);
    b.approval = "Approved";
    b.status = "Active";
    b.stage = "Active";
  };
  assert.ok(change(step.store, u, approve).error);
  const ops = d.users.find((u) => u.id === "marcus");
  const approved = change(step.store, ops, approve);
  assert.equal(approved.error, undefined);
  assert.equal(
    visibleStore(approved.store, u).accounts.find((b) => b.id === a.id).status,
    "Active",
  );
});
test("verified BNX duplicates block creation and synced identifiers stay protected", () => {
  const { d, u } = setup("olivia");
  const existing = d.accounts.find((a) => a.type === "Affiliate");
  const draft = {
    ...structuredClone(existing),
    id: "AF-NEW",
    name: "New mock affiliate",
    bnxVerified: false,
  };
  assert.ok(change(d, u, (v) => v.accounts.push(draft)).error);
  draft.bnxId = "BNX-AF-901";
  const result = change(d, u, (v) => v.accounts.push(draft));
  assert.equal(result.error, undefined);
  assert.equal(
    result.store.accounts.find((a) => a.id === "AF-NEW").bnxVerified,
    true,
  );
  assert.ok(change(d, u, (v) => (v.accounts[0].bnxId = "different")).error);
  assert.ok(possibleDuplicates(d, existing.name, "").length);
});
test("protected configuration and business relationships cannot be removed", () => {
  const { d, u } = setup("olivia");
  assert.ok(
    change(d, u, (v) => v.configuration.affiliateExtras.push("Live")).error,
  );
  assert.ok(change(d, u, (v) => (v.configuration.supplierStages = [])).error);
  assert.ok(change(d, u, (v) => (v.accounts[0].retailers = ["Missing"])).error);
  assert.ok(change(d, u, (v) => v.accounts.pop()).error);
});
test("personal views survive scope changes and shared views require admin", () => {
  const { d, u } = setup("sofia");
  const view = {
    id: "VIEW-1",
    ownerId: u.id,
    name: "My list",
    visibility: "Personal",
    module: "accounts",
    snapshot: { query: "Oak", columns: ["Account"] },
  };
  assert.equal(change(d, u, (v) => v.views.push(view)).error, undefined);
  assert.ok(
    change(d, u, (v) => v.views.push({ ...view, visibility: "Shared" })).error,
  );
});
test("additive migration retains existing records and local edits", () => {
  const old = seed();
  old.accounts[0].description = "Previously saved edit";
  const n = old.accounts.length;
  for (const k of [
    "users",
    "views",
    "billing",
    "audit",
    "activities",
    "retailerRecords",
    "configuration",
    "bnxDirectory",
  ])
    delete old[k];
  old.accounts.forEach((a) => {
    delete a.bnxId;
    delete a.bnxVerified;
    delete a.customFields;
    delete a.checkOwners;
  });
  const migrated = migrateStore(old);
  assert.equal(migrated.accounts.length, n);
  assert.equal(migrated.accounts[0].description, "Previously saved edit");
  assert.ok(migrated.users.length);
  assert.ok(migrated.accounts[0].bnxId);
  assert.equal(migrated.version, 1);
});

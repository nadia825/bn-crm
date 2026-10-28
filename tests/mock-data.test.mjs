import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, affiliateStages, supplierStages } from "../src/lib/data.ts";
import {
  WORKSPACES,
  navigationFor,
  scopedAccounts,
  scopedItems,
  parseRoute,
  routeHash,
  workspaceForPage,
} from "../src/lib/workspaces.ts";
const data = seed();
test("requested entity counts and unique record IDs", () => {
  for (const [type, count] of [
    ["Corporate Brand", 20],
    ["Affiliate", 35],
    ["Supplier", 12],
  ])
    assert.equal(data.accounts.filter((a) => a.type === type).length, count);
  assert.equal(data.retailers.length, 15);
  assert.equal(data.tasks.length, 40);
  assert.equal(data.cases.length, 15);
  assert.equal(data.barrels.length, 20);
  const ids = [
    ...data.accounts,
    ...data.tasks,
    ...data.cases,
    ...data.barrels,
  ].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
});
test("operational records and barrel relationships point to the correct entities", () => {
  for (const item of [...data.tasks, ...data.cases])
    assert.ok(
      data.accounts.some((a) => a.id === item.accountId),
      item.id,
    );
  for (const item of data.tasks.filter((t) => t.caseId))
    assert.equal(
      data.cases.find((c) => c.id === item.caseId)?.accountId,
      item.accountId,
    );
  for (const b of data.barrels) {
    assert.equal(
      data.accounts.find((a) => a.id === b.affiliateId)?.type,
      "Affiliate",
    );
    assert.equal(
      data.accounts.find((a) => a.id === b.supplierId)?.type,
      "Supplier",
    );
    assert.ok(data.retailers.includes(b.retailer));
    assert.ok(b.stock >= 0 && b.sales >= 0);
    if (b.status === "Sold Out") assert.equal(b.stock, 0);
  }
  for (const a of data.accounts)
    for (const r of a.retailers) assert.ok(data.retailers.includes(r));
});
test("active brands satisfy all activation gates and resolved cases document outcomes", () => {
  for (const a of data.accounts.filter(
    (a) => a.type === "Corporate Brand" && a.status === "Active",
  )) {
    assert.ok(a.checks.every(Boolean));
    assert.equal(a.verification, "Verified");
    assert.equal(a.approval, "Approved");
  }
  for (const c of data.cases.filter((c) =>
    ["Resolved", "Closed"].includes(c.status),
  ))
    assert.ok(c.resolution.trim());
});
test("fictional contact domains and separate configurable pipeline stages", () => {
  for (const a of data.accounts) {
    assert.ok(a.email.endsWith(".example"));
    for (const c of a.contacts) assert.ok(c.email.endsWith(".example"));
    if (a.type === "Affiliate") assert.ok(affiliateStages.includes(a.stage));
    if (a.type === "Supplier") assert.ok(supplierStages.includes(a.stage));
  }
  assert.notDeepEqual(affiliateStages, supplierStages);
});

test("workspace directories partition clients without copying or losing records", () => {
  const brands = scopedAccounts(data, "brands"),
    affiliates = scopedAccounts(data, "affiliates");
  assert.equal(brands.length, 20);
  assert.equal(affiliates.length, 35);
  assert.ok(brands.every((a) => a.type === "Corporate Brand"));
  assert.ok(affiliates.every((a) => a.type === "Affiliate"));
  assert.equal(new Set([...brands, ...affiliates].map((a) => a.id)).size, 55);
  for (const a of [...brands, ...affiliates])
    assert.equal(
      a,
      data.accounts.find((x) => x.id === a.id),
    );
  assert.equal(scopedAccounts(data, "operations"), data.accounts);
});
test("tasks and cases retain the same IDs and records in account and Operations scopes", () => {
  for (const kind of ["tasks", "cases"]) {
    assert.equal(scopedItems(data, kind, "operations"), data[kind]);
    for (const scope of ["brands", "affiliates"]) {
      const ids = new Set(scopedAccounts(data, scope).map((a) => a.id));
      for (const item of scopedItems(data, kind, scope)) {
        assert.ok(ids.has(item.accountId));
        assert.equal(
          item,
          scopedItems(data, kind, "operations").find((x) => x.id === item.id),
        );
      }
    }
  }
  const store = seed();
  const brandCase = scopedItems(store, "cases", "brands")[0];
  store.cases = store.cases.map((c) =>
    c.id === brandCase.id
      ? { ...c, status: "Resolved", resolution: "Verified shared outcome" }
      : c,
  );
  assert.equal(
    scopedItems(store, "cases", "brands").find((c) => c.id === brandCase.id)
      .resolution,
    "Verified shared outcome",
  );
  assert.equal(
    scopedItems(store, "cases", "operations").find((c) => c.id === brandCase.id)
      .status,
    "Resolved",
  );
  const brand = store.accounts.find(
    (a) => a.type === "Corporate Brand" && a.status === "Onboarding",
  );
  store.accounts = store.accounts.map((a) =>
    a.id === brand.id
      ? {
          ...a,
          checks: Array(6).fill(true),
          verification: "Verified",
          approval: "Pending approval",
        }
      : a,
  );
  assert.equal(
    scopedAccounts(store, "operations").filter(
      (a) => a.approval === "Pending approval",
    ).length,
    1,
  );
  store.accounts = store.accounts.map((a) =>
    a.id === brand.id ? { ...a, approval: "Approved", status: "Active" } : a,
  );
  assert.equal(
    scopedAccounts(store, "brands").find((a) => a.id === brand.id).status,
    "Active",
  );
});
test("workspace routes round-trip, shared pages stay available, and old links migrate", () => {
  for (const workspace of Object.keys(WORKSPACES)) {
    const pages = navigationFor(workspace).flatMap((g) => g.items);
    for (const item of pages)
      assert.deepEqual(
        parseRoute(routeHash({ workspace, page: item.page }), workspace),
        { workspace, page: item.page },
      );
    for (const page of ["Company Overview", "Reports", "Settings"])
      assert.ok(pages.some((i) => i.page === page));
  }
  assert.deepEqual(parseRoute("", "affiliates"), {
    workspace: "affiliates",
    page: "Dashboard",
  });
  assert.deepEqual(parseRoute("#affiliate-pipeline"), {
    workspace: "affiliates",
    page: "Affiliate Pipeline",
  });
  assert.deepEqual(parseRoute("#work-board"), {
    workspace: "operations",
    page: "Work Board",
  });
  assert.deepEqual(parseRoute("#dashboard"), {
    workspace: "brands",
    page: "Company Overview",
  });
  assert.deepEqual(parseRoute("#brands/work-board"), {
    workspace: "brands",
    page: "Dashboard",
  });
  assert.equal(workspaceForPage("Brand Onboarding", "affiliates"), "brands");
  assert.equal(workspaceForPage("Work Board", "brands"), "operations");
});

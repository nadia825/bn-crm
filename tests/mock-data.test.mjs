import { test } from "node:test";
import assert from "node:assert/strict";
import { seed, affiliateStages, supplierStages } from "../src/lib/data.ts";
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

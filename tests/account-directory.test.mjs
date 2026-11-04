import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/data.ts";
import {
  accountNextStep,
  accountUpdatedAt,
  compareAccounts,
} from "../src/lib/account-directory.ts";

test("next action identifies an unchecked requirement even when later checks are complete", () => {
  const account = seed().accounts[0];
  account.checks = [true, false, true, true, true, true];
  const before = structuredClone(account);
  assert.equal(accountNextStep(account).label, "Set up users & permissions");
  assert.equal(accountNextStep(account).section, "Onboarding");
  assert.deepEqual(account, before);
});

test("completed setup still distinguishes verification, submission, review, rejection, and activation", () => {
  const account = seed().accounts[0];
  account.checks = Array(6).fill(true);
  assert.equal(accountNextStep(account).label, "Verify setup");
  account.verification = "Verified";
  assert.equal(accountNextStep(account).label, "Submit to Operations");
  account.approval = "Pending approval";
  assert.equal(accountNextStep(account).label, "Awaiting Operations");
  account.approval = "Rejected";
  assert.equal(accountNextStep(account).label, "Review requested changes");
  account.approval = "Approved";
  account.status = "Active";
  assert.equal(accountNextStep(account).label, "Setup complete");
});

test("partners never receive corporate brand setup actions", () => {
  for (const type of ["Affiliate", "Supplier"]) {
    const account = seed().accounts.find((a) => a.type === type);
    const action = accountNextStep(account);
    assert.equal(action.section, "Overview");
    assert.match(action.description, new RegExp(account.stage));
  }
});

test("recent ordering uses valid history and note timestamps rather than relative display text", () => {
  const [older, newer] = seed().accounts;
  newer.notes.push({
    id: "recent-note",
    text: "New context",
    author: newer.manager,
    at: "2026-10-29T12:00:00Z",
  });
  newer.history.push({
    id: "invalid",
    at: "invalid",
    text: "",
    author: newer.manager,
  });
  assert.equal(accountUpdatedAt(newer), Date.parse("2026-10-29T12:00:00Z"));
  assert.equal(
    [older, newer].sort((a, b) => compareAccounts(a, b, "updated", false))[0]
      .id,
    newer.id,
  );
  assert.equal(accountUpdatedAt({ ...older, notes: [], history: [] }), 0);
});

test("setup ordering is numeric and name ordering supports both directions", () => {
  const [a, b] = seed().accounts;
  a.checks = [true, false, false, false, false, false];
  b.checks = Array(6).fill(true);
  assert.ok(compareAccounts(a, b, "setup", true) < 0);
  assert.ok(compareAccounts(a, b, "setup", false) > 0);
  assert.equal(
    Math.sign(compareAccounts(a, b, "name", false)),
    -Math.sign(compareAccounts(a, b, "name", true)),
  );
});

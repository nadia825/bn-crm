import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/data.ts";
import { dailyActions } from "../src/lib/daily-actions.ts";
import { todayDate } from "../src/lib/dates.ts";
import { bulkWorkUpdate } from "../src/lib/work-actions.ts";
import { diffStore, assertPatchBaseline, shareSnapshot } from "../src/lib/patch.ts";
import { visibleStore } from "../src/lib/access.ts";
import { applyMutation } from "../src/lib/mutations.ts";

test("form baselines allow unrelated refreshes but reject changes to an edited record", () => {
  const baseline = seed(), current = structuredClone(baseline);
  current.accounts[1].description = "Another person's update";
  const proposed = structuredClone(current);
  proposed.accounts[0].description = "My edit";
  assert.doesNotThrow(() => assertPatchBaseline(current, diffStore(current, proposed), baseline));
  current.accounts[0].description = "Concurrent edit";
  assert.throws(() => assertPatchBaseline(current, diffStore(current, proposed), baseline), /record changed/);
  const settings = structuredClone(current);
  settings.workspace = "My renamed workspace";
  current.workspace = "Concurrent rename";
  assert.throws(() => assertPatchBaseline(current, diffStore(current, settings), baseline), /settings changed/);
});

test("API snapshot sharing retains unaffected collections and record references", () => {
  const before = seed(), incoming = structuredClone(before);
  incoming.tasks[0].priority = "Urgent";
  const shared = shareSnapshot(before, incoming);
  assert.equal(shared.accounts, before.accounts);
  assert.equal(shared.tasks[1], before.tasks[1]);
  assert.notEqual(shared.tasks[0], before.tasks[0]);
  assert.equal(shared.tasks[0].priority, "Urgent");
});

test("daily actions use the current date, exclude completed work and respect roles and workspaces", () => {
  const raw = seed(), actor = raw.users.find((u) => u.id === "marcus");
  const tasks = raw.tasks.filter((t) => raw.accounts.find((a) => a.id === t.accountId)?.type === "Corporate Brand");
  Object.assign(tasks[0], { status: "In Progress", due: "2030-06-09", assignee: actor.name });
  Object.assign(tasks[1], { status: "On Hold / Under Review", due: "2030-06-11", assignee: actor.name });
  Object.assign(tasks[2], { status: "Done", due: "2030-06-01" });
  const actions = dailyActions(visibleStore(raw, actor), actor, "brands", "2030-06-10");
  assert.equal(actions.find((a) => a.id === `tasks:${tasks[0].id}`).group, "Overdue");
  assert.equal(actions.find((a) => a.id === `tasks:${tasks[1].id}`).group, "Blocked");
  assert.ok(!actions.some((a) => a.id === `tasks:${tasks[2].id}`));
  assert.ok(actions.every((a) => a.kind === "account" || a.kind === "approval" || raw.accounts.find((r) => r.id === a.record.accountId)?.type === "Corporate Brand"));
  const member = raw.users.find((u) => u.id === "james");
  const scoped = dailyActions(visibleStore(raw, member), member, "operations", "2030-06-10");
  assert.ok(scoped.every((a) => a.kind !== "approval"));
  const viewer = raw.users.find((u) => u.id === "riley");
  assert.equal(dailyActions(visibleStore(raw, viewer), viewer, "brands", "2030-06-10").length, 0);
  assert.equal(todayDate(new Date(2030, 5, 10, 0, 1)), "2030-06-10");
});

test("bulk work respects delegation, resolutions and unchanged records", () => {
  const data = seed(), admin = data.users.find((u) => u.id === "olivia");
  const ids = data.tasks.slice(0, 2).map((r) => r.id);
  const updated = bulkWorkUpdate(data, admin, "tasks", ids, { priority: "Urgent", assignee: "Marcus Reed" });
  assert.equal(updated.tasks[2], data.tasks[2]);
  assert.ok(ids.every((id) => updated.tasks.find((r) => r.id === id).assignee === "Marcus Reed"));
  assert.equal(applyMutation(data, updated, admin).error, undefined);
  const viewer = data.users.find((u) => u.id === "riley");
  assert.throws(() => bulkWorkUpdate(data, viewer, "tasks", ids, { priority: "High" }), /scope/);
  const openCase = data.cases.find((r) => !r.resolution.trim());
  assert.throws(() => bulkWorkUpdate(data, admin, "cases", [openCase.id], { status: "Resolved" }), /resolution/);
  const resolved = bulkWorkUpdate(data, admin, "cases", [openCase.id], { status: "Resolved", resolution: "Customer confirmed the fix" });
  assert.equal(applyMutation(data, resolved, admin).error, undefined);
  assert.equal(data.cases.find((r) => r.id === openCase.id).resolution, "");
});

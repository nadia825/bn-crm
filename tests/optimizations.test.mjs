import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/data.ts";
import { dailyActions, attentionPreview, filterDailyActions, defaultActionFilters, compareWorkAttention } from "../src/lib/daily-actions.ts";
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


function attentionFixture() {
  const data = seed(), actor = data.users.find((u) => u.id === "marcus");
  const account = data.accounts.find((a) => a.type === "Corporate Brand");
  const template = data.tasks.find((t) => t.accountId === account.id);
  data.accounts.forEach((a) => { a.followUp = "2030-07-01"; });
  data.tasks = [
    ...Array.from({ length: 8 }, (_, index) => ({ ...structuredClone(template), id: `OLD-${index}`, accountId: account.id, due: "2030-05-01", priority: "Low", status: "New", assignee: actor.name })),
    { ...structuredClone(template), id: "TODAY", accountId: account.id, due: "2030-06-10", priority: "Medium", status: "On Hold / Under Review", assignee: actor.name },
    { ...structuredClone(template), id: "URGENT", accountId: account.id, due: "2030-06-11", priority: "Urgent", status: "New", assignee: "Avery Lane" },
    { ...structuredClone(template), id: "HIGH", accountId: account.id, due: "2030-06-09", priority: "High", status: "New", assignee: actor.name },
  ];
  data.cases = [{ ...structuredClone(data.cases[0]), id: "TODAY-CASE", accountId: account.id, due: "2030-06-10", priority: "High", status: "Waiting for Customer", assignee: actor.name }];
  return { data, actor, today: "2030-06-10" };
}

test("urgent and today's work outrank low overdue backlogs and ownership does not hide urgent team work", () => {
  const { data, actor, today } = attentionFixture();
  const actions = dailyActions(visibleStore(data, actor), actor, "brands", today);
  const ids = actions.map((a) => a.id);
  assert.ok(ids.indexOf("tasks:URGENT") < ids.indexOf("tasks:OLD-0"));
  assert.ok(ids.indexOf("tasks:TODAY") < ids.indexOf("tasks:OLD-0"));
  assert.ok(ids.indexOf("tasks:HIGH") < ids.indexOf("tasks:OLD-0"));
  const preview = attentionPreview(actions, today);
  assert.ok(preview.some((a) => a.id === "tasks:URGENT"));
  assert.ok(preview.some((a) => a.due === today));
  const nextTasks = attentionPreview([...data.tasks].sort((a, b) => compareWorkAttention(a, b, today)), today, 5);
  assert.equal(nextTasks[0].id, "URGENT");
  assert.ok(nextTasks.some((item) => item.id === "TODAY"));
});

test("due-today, blocker, priority, type, owner and my-work filters combine without losing overlapping items", () => {
  const { data, actor, today } = attentionFixture();
  const actions = dailyActions(visibleStore(data, actor), actor, "brands", today);
  const todayItems = filterDailyActions(actions, { ...defaultActionFilters, group: "Due today" }, today);
  assert.deepEqual(todayItems.map((a) => a.id), ["cases:TODAY-CASE", "tasks:TODAY"]);
  assert.ok(todayItems.every((a) => a.blocked));
  const mineTodayCases = filterDailyActions(actions, { ...defaultActionFilters, group: "Due today", mineOnly: true, kind: "cases", priority: "High", owner: actor.name }, today);
  assert.deepEqual(mineTodayCases.map((a) => a.id), ["cases:TODAY-CASE"]);
  const blocked = filterDailyActions(actions, { ...defaultActionFilters, group: "Blocked" }, today);
  assert.ok(blocked.some((a) => a.id === "cases:TODAY-CASE"));
  const high = filterDailyActions(actions, { ...defaultActionFilters, group: "High priority" }, today);
  assert.ok(high.some((a) => a.id === "tasks:URGENT"));
  assert.ok(high.some((a) => a.id === "tasks:HIGH"));
  assert.ok(!high.some((a) => a.id === "tasks:OLD-0"));
  const upcoming = filterDailyActions(actions, { ...defaultActionFilters, group: "Upcoming" }, today);
  assert.ok(upcoming.some((a) => a.id === "tasks:URGENT"));
  assert.ok(upcoming.every((a) => a.due > today));
  const byDate = filterDailyActions(actions, { ...defaultActionFilters, sort: "Due date", kind: "tasks" }, today);
  assert.equal(byDate[0].record.id, "OLD-0");
  const byPriority = filterDailyActions(actions, { ...defaultActionFilters, sort: "Priority", kind: "tasks" }, today);
  assert.equal(byPriority[0].record.id, "URGENT");
});

test("the collapsed queue keeps a due-today row visible even with more than six urgent items", () => {
  const items = Array.from({ length: 9 }, (_, index) => ({ id: `URGENT-${index}`, due: "2030-06-11" }));
  items.push({ id: "TODAY", due: "2030-06-10" });
  const visible = attentionPreview(items, "2030-06-10");
  assert.equal(visible.length, 6);
  assert.equal(visible[0].id, "URGENT-0");
  assert.equal(visible[1].id, "TODAY");
  assert.equal(visible[2].id, "URGENT-1");
  assert.equal(items.length, 10);
});


test("today is visible near the top even when it already falls inside a long preview", () => {
  const items = [{ id: "URGENT-A", due: "2030-06-09" }, { id: "URGENT-B", due: "2030-06-09" }, { id: "TODAY", due: "2030-06-10" }, { id: "LATER", due: "2030-06-11" }];
  assert.deepEqual(attentionPreview(items, "2030-06-10").map((item) => item.id), ["URGENT-A", "TODAY", "URGENT-B", "LATER"]);
  assert.deepEqual(attentionPreview(items, "2030-06-12"), items);
});

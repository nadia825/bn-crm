import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterWorkItems,
  workFiltersFromView,
  workFilterError,
  activeWorkFilterCount,
} from "../src/lib/work-filters.ts";
import { seed } from "../src/lib/data.ts";
import { visibleStore } from "../src/lib/access.ts";
const context = {
  kind: "tasks",
  accounts: [
    { id: "BR-1", name: "Copperline Distilling" },
    { id: "BR-2", name: "Other brand" },
  ],
  tasks: [],
  actorName: "Marcus Reed",
  today: "2026-11-04",
};
const task = (id, patch = {}) => ({
  id,
  title: "Review launch stock",
  accountId: "BR-1",
  assignee: "Avery Lane",
  status: "In Progress",
  priority: "High",
  category: "Logistics",
  due: "2026-11-03",
  caseId: "CASE-1",
  ...patch,
});
const run = (records, filters = {}, extra = {}) =>
  filterWorkItems(records, workFiltersFromView(filters), {
    ...context,
    ...extra,
  }).map((r) => r.id);
test("work filters combine search, status, assignee, priority, category, account, due date and case using AND", () => {
  const wanted = task("wanted");
  const records = [
    wanted,
    ...Object.entries({
      title: "Something else",
      status: "New",
      assignee: "Marcus Reed",
      priority: "Low",
      category: "Integration",
      accountId: "BR-2",
      due: "2026-11-06",
      caseId: "CASE-2",
    }).map(([key, value]) => task(key, { [key]: value })),
  ];
  const filters = {
    query: "launch",
    status: "In Progress",
    assignee: "Avery Lane",
    priority: "High",
    category: "Logistics",
    accountId: "BR-1",
    due: "overdue",
    linkedCase: "CASE-1",
  };
  assert.deepEqual(run(records, filters), ["wanted"]);
  assert.equal(activeWorkFilterCount(workFiltersFromView(filters)), 8);
  assert.deepEqual(run([wanted], { query: "copperline" }), ["wanted"]);
  assert.deepEqual(run([wanted], { query: "wanted" }), ["wanted"]);
  assert.deepEqual(run([wanted], { assignee: "Avery Lane", mine: true }), []);
  assert.deepEqual(
    run(
      [wanted],
      { assignee: "Avery Lane", mine: true },
      { actorName: "Avery Lane" },
    ),
    ["wanted"],
  );
});
test("overdue excludes completed or aborted work and does not treat today as late", () => {
  const records = [
    "New",
    "In Progress",
    "Done",
    "Aborted",
    "Resolved",
    "Closed",
  ].map((status) => task(status, { status }));
  records.push(
    task("today", { due: "2026-11-04" }),
    task("future", { due: "2026-11-05" }),
  );
  assert.deepEqual(run(records, { due: "overdue" }), ["New", "In Progress"]);
  assert.deepEqual(run(records, { due: "today" }), ["today"]);
  assert.deepEqual(run(records, { due: "tomorrow" }), ["future"]);
});
test("relative date windows include their calendar boundaries and advance when a view is reopened", () => {
  const records = [
    "2026-11-01",
    "2026-11-02",
    "2026-11-04",
    "2026-11-08",
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
  ].map((due) => task(due, { due }));
  assert.deepEqual(run(records, { due: "week" }), [
    "2026-11-02",
    "2026-11-04",
    "2026-11-08",
  ]);
  assert.deepEqual(run(records, { due: "week" }, { today: "2026-11-08" }), [
    "2026-11-02",
    "2026-11-04",
    "2026-11-08",
  ]);
  assert.deepEqual(run(records, { due: "week" }, { today: "2026-11-09" }), [
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
  ]);
  assert.deepEqual(run(records, { due: "next7" }), [
    "2026-11-04",
    "2026-11-08",
    "2026-11-09",
    "2026-11-10",
  ]);
  assert.deepEqual(
    run(
      [
        task("last", { due: "2026-12-31" }),
        task("first", { due: "2027-01-01" }),
      ],
      { due: "tomorrow" },
      { today: "2026-12-31" },
    ),
    ["first"],
  );
});
test("custom date ranges are inclusive, allow a single boundary and reject reversed or invalid dates", () => {
  const records = [
    task("before", { due: "2026-11-01" }),
    task("start", { due: "2026-11-02" }),
    task("end", { due: "2026-11-05" }),
    task("after", { due: "2026-11-06" }),
  ];
  assert.deepEqual(
    run(records, { due: "custom", dueFrom: "2026-11-02", dueTo: "2026-11-05" }),
    ["start", "end"],
  );
  assert.deepEqual(run(records, { due: "custom", dueFrom: "2026-11-05" }), [
    "end",
    "after",
  ]);
  assert.deepEqual(run(records, { due: "custom", dueTo: "2026-11-02" }), [
    "before",
    "start",
  ]);
  const reversed = workFiltersFromView({
    due: "custom",
    dueFrom: "2026-11-05",
    dueTo: "2026-11-02",
  });
  assert.ok(workFilterError(reversed));
  assert.deepEqual(run(records, reversed), []);
  assert.ok(
    workFilterError(
      workFiltersFromView({ due: "custom", dueFrom: "2026-02-30" }),
    ),
  );
  assert.deepEqual(
    run(
      [task("leap", { due: "2028-02-29" })],
      { due: "tomorrow" },
      { today: "2028-02-28" },
    ),
    ["leap"],
  );
});
test("linked-case filters distinguish linked tasks and cases with visible requests", () => {
  const tasks = [
    task("linked"),
    task("unlinked", { caseId: "" }),
    task("other", { caseId: "CASE-2" }),
  ];
  assert.deepEqual(run(tasks, { linkedCase: "linked" }), ["linked", "other"]);
  assert.deepEqual(run(tasks, { linkedCase: "unlinked" }), ["unlinked"]);
  assert.deepEqual(run(tasks, { linkedCase: "CASE-2" }), ["other"]);
  const cases = [task("CASE-1"), task("CASE-2"), task("CASE-3")];
  assert.deepEqual(
    run(cases, { linkedCase: "linked" }, { kind: "cases", tasks }),
    ["CASE-1", "CASE-2"],
  );
  assert.deepEqual(
    run(cases, { linkedCase: "unlinked" }, { kind: "cases", tasks }),
    ["CASE-3"],
  );
  assert.deepEqual(
    run(cases, { linkedCase: "CASE-2" }, { kind: "cases", tasks }),
    ["CASE-2"],
  );
});
test("old saved views retain named managers and new snapshots round-trip every filter", () => {
  assert.equal(
    workFiltersFromView({ manager: "Avery Lane", filter: "In Progress" })
      .assignee,
    "Avery Lane",
  );
  assert.equal(
    workFiltersFromView({ manager: "All managers", filter: "All statuses" })
      .assignee,
    "",
  );
  assert.equal(
    workFiltersFromView({ manager: "All managers", filter: "All statuses" })
      .status,
    "",
  );
  const filters = workFiltersFromView({
    query: "launch",
    status: "Open",
    assignee: "Avery Lane",
    priority: "High",
    category: "Fulfillment",
    accountId: "BR-1",
    due: "custom",
    dueFrom: "2026-11-01",
    dueTo: "2026-11-06",
    linkedCase: "CASE-1",
    mine: true,
  });
  assert.deepEqual(
    workFiltersFromView(JSON.parse(JSON.stringify(filters))),
    filters,
  );
  assert.equal(activeWorkFilterCount(workFiltersFromView()), 0);
});
test("filtering a saved view cannot reveal records outside the current role projection", () => {
  const raw = seed(),
    viewer = raw.users.find((u) => u.id === "riley"),
    visible = visibleStore(raw, viewer);
  const hidden = raw.accounts.find(
    (a) => !visible.accounts.some((v) => v.id === a.id),
  );
  const ctx = {
    accounts: visible.accounts,
    tasks: visible.tasks,
    kind: "tasks",
    actorName: viewer.name,
    today: "2026-11-04",
  };
  assert.deepEqual(
    filterWorkItems(
      visible.tasks,
      workFiltersFromView({ accountId: hidden.id }),
      ctx,
    ),
    [],
  );
  assert.ok(
    filterWorkItems(visible.tasks, workFiltersFromView(), ctx).every((t) =>
      visible.tasks.includes(t),
    ),
  );
});

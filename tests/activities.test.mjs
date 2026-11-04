import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/data.ts";
import { activityDetailsError, activityDurationMinutes, activityTimeMillis } from "../src/lib/activities.ts";
import { applyMutation } from "../src/lib/mutations.ts";
import { can, visibleStore } from "../src/lib/access.ts";

const makeActivity = (d, overrides = {}) => ({
  id: "QA-ACTIVITY", title: "Mock coordination meeting", accountId: d.accounts.find((a) => a.type === "Corporate Brand").id,
  owner: "Marcus Reed", kind: "Meeting", status: "Scheduled", notes: "Fictional test",
  due: "2026-11-04T14:00", endAt: "2026-11-04T14:45", timeZone: "Africa/Tunis", participantIds: ["avery", "sofia"],
  location: "Mock online meeting", meetingUrl: "https://meeting.example/launch", priority: "High", reminder: "15 minutes before",
  agenda: "Confirm launch readiness", outcome: "Waiting for corrected label", nextAction: "Review updated artwork", ...overrides,
});
const change = (d, id, edit) => {
  const actor = d.users.find((u) => u.id === id);
  const next = structuredClone(visibleStore(d, actor)); edit(next);
  return applyMutation(d, next, actor);
};

test("activity duration uses declared zone, rejects impossible dates and DST gaps", () => {
  assert.equal(activityTimeMillis("2026-11-04T14:00", "Africa/Tunis"), Date.parse("2026-11-04T13:00Z"));
  assert.equal(activityDurationMinutes({ due: "2026-11-04T14:00", endAt: "2026-11-04T14:45", timeZone: "Africa/Tunis" }), 45);
  assert.ok(Number.isNaN(activityTimeMillis("2026-02-30T14:00", "UTC")));
  assert.ok(Number.isNaN(activityTimeMillis("2026-03-08T02:30", "America/New_York")));
  assert.ok(Number.isNaN(activityTimeMillis("2026-11-04T14:00", "Invalid/Zone")));
  assert.equal(activityDurationMinutes({ due: "2026-03-08T01:30", endAt: "2026-03-08T03:30", timeZone: "America/New_York" }), 60);
});

test("activity details validate participants, time, references and safe meeting links", () => {
  const d = seed(), a = makeActivity(d);
  assert.equal(activityDetailsError(a, d), undefined);
  for (const patch of [
    { participantIds: ["avery", "avery"] }, { participantIds: ["marcus"] }, { participantIds: ["missing"] },
    { endAt: "2026-11-04T13:00" }, { meetingUrl: "javascript:alert(1)" }, { timeZone: "Invalid/Zone" },
    { caseId: "missing" }, { taskId: d.tasks.find((t) => t.accountId !== a.accountId).id }, { priority: "Critical" },
  ]) assert.ok(activityDetailsError({ ...a, ...patch }, d), JSON.stringify(patch));
  const c = d.cases[0], t = d.tasks.find((x) => x.accountId === c.accountId);
  assert.ok(t);
  assert.ok(activityDetailsError({ ...a, accountId: c.accountId, caseId: c.id, taskId: t.id }, { ...d, tasks: d.tasks.map((x) => x.id === t.id ? { ...x, caseId: undefined } : x) }));
});

test("operations participants can read an activity without receiving edit or onboarding rights", () => {
  const d = seed(), avery = d.users.find((u) => u.id === "avery");
  const outside = d.accounts.find((a) => a.type === "Corporate Brand" && !can(avery, "accounts.read", a, d));
  assert.ok(outside);
  d.activities.push(makeActivity(d, { accountId: outside.id }));
  assert.ok(visibleStore(d, avery).activities.some((a) => a.id === "QA-ACTIVITY"));
  assert.ok(can(avery, "accounts.read", outside, d));
  assert.equal(can(avery, "activities.edit", d.activities.at(-1), d), false);
  assert.equal(can(avery, "onboarding.edit", outside, d), false);
  assert.ok(change(d, "avery", (v) => { v.activities.find((a) => a.id === "QA-ACTIVITY").notes = "Forged"; }).error);
  const finance = d.users.find((u) => u.id === "taylor");
  d.activities.at(-1).participantIds.push("taylor");
  assert.equal(visibleStore(d, finance).activities.some((a) => a.id === "QA-ACTIVITY"), false);
});

test("managers assign one owner plus participants; owners retain assignments while editing", () => {
  let d = seed();
  const created = change(d, "marcus", (v) => { v.activities.push(makeActivity(d, { owner: "Avery Lane", participantIds: ["sofia"] })); });
  assert.equal(created.error, undefined); d = created.store;
  const edited = change(d, "avery", (v) => { v.activities.find((a) => a.id === "QA-ACTIVITY").outcome = "Mock review complete"; });
  assert.equal(edited.error, undefined);
  assert.equal(edited.store.activities.find((a) => a.id === "QA-ACTIVITY").owner, "Avery Lane");
  assert.ok(change(d, "avery", (v) => { v.activities.find((a) => a.id === "QA-ACTIVITY").participantIds.push("marcus"); }).error);
  assert.ok(change(d, "avery", (v) => { v.activities.find((a) => a.id === "QA-ACTIVITY").owner = "Marcus Reed"; }).error);
  d.users.find((u) => u.id === "riley").active = false;
  assert.ok(change(d, "marcus", (v) => { v.activities.find((a) => a.id === "QA-ACTIVITY").participantIds.push("riley"); }).error);
});

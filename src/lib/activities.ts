import type { Store } from "./data.ts";
import type { Activity, DemoUser } from "./model.ts";

export const activityReminders = ["None", "At start", "15 minutes before", "1 hour before", "1 day before"] as const;
export const canAssignActivity = (user: DemoUser) => user.roles.some((r) =>
  ["System Admin", "Sales Manager", "Operations Manager"].includes(r));

/** Resolve a wall-clock time in its declared zone, rejecting invalid calendar/DST times. */
export function activityTimeMillis(local: string, timeZone?: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(local)) return NaN;
  const wall = Date.parse(local + "Z");
  if (!Number.isFinite(wall) || !new Date(wall).toISOString().startsWith(local)) return NaN;
  if (!timeZone) return wall;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    let instant = wall;
    for (let i = 0; i < 4; i++) {
      const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
      const observed = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
      const delta = wall - observed;
      if (!delta) return instant;
      instant += delta;
    }
  } catch { /* Invalid time zone. */ }
  return NaN;
}

export function activityDurationMinutes(a: Pick<Activity, "due" | "endAt" | "timeZone">) {
  if (!a.endAt) return undefined;
  const duration = (activityTimeMillis(a.endAt, a.timeZone) - activityTimeMillis(a.due, a.timeZone)) / 60000;
  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

export function activityWhen(a: Activity) {
  // Older records have no explicit zone and retain their original local-time display.
  const instant = a.timeZone ? activityTimeMillis(a.due, a.timeZone) : Date.parse(a.due);
  if (!Number.isFinite(instant)) return a.due;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...(a.timeZone ? { timeZone: a.timeZone } : {}) }).format(instant);
}

/** Used by browser mode, authoritative mutations and server schema validation. */
export function activityDetailsError(a: Activity, data: Pick<Store, "users" | "cases" | "tasks">, validateLinks = true): string | undefined {
  for (const key of ["endAt", "timeZone", "location", "meetingUrl", "caseId", "taskId", "agenda", "outcome", "nextAction"] as const) {
    if (a[key] !== undefined && typeof a[key] !== "string") return "Activity details must contain text values.";
  }
  const participants = a.participantIds ?? [];
  if (!Array.isArray(participants) || participants.some((id) => typeof id !== "string" || !data.users.some((u) => u.id === id)) || new Set(participants).size !== participants.length)
    return "Choose unique participants from the mock team.";
  if (participants.some((id) => data.users.find((u) => u.id === id)?.name === a.owner)) return "The owner is already responsible; choose other people as participants.";
  if (!Number.isFinite(activityTimeMillis(a.due, a.timeZone))) return "Choose a valid start time and time zone. This time may not exist because of daylight saving.";
  if (a.endAt && !activityDurationMinutes(a)) return "End time must be valid and later than the start time in the selected time zone.";
  if (a.priority !== undefined && !["Low", "Medium", "High", "Urgent"].includes(a.priority)) return "Choose a valid priority.";
  if (a.reminder !== undefined && !activityReminders.includes(a.reminder)) return "Choose a valid mock reminder.";
  if (a.meetingUrl) {
    try { if (!["http:", "https:"].includes(new URL(a.meetingUrl).protocol)) return "Meeting link must start with https:// or http://."; }
    catch { return "Enter a valid meeting link."; }
  }
  if (!validateLinks) return;
  const supportCase = a.caseId ? data.cases.find((c) => c.id === a.caseId) : undefined;
  const task = a.taskId ? data.tasks.find((t) => t.id === a.taskId) : undefined;
  if ((a.caseId && supportCase?.accountId !== a.accountId) || (a.taskId && task?.accountId !== a.accountId)) return "Related records must belong to the selected account.";
  if (supportCase && task && task.caseId !== supportCase.id) return "Choose a work request linked to the selected support case, or clear one link.";
}

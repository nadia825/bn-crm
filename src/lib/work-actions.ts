import { can } from "./access.ts";
import { caseStages, workStages, event, type Store, type WorkItem } from "./data.ts";
import type { DemoUser } from "./model.ts";
export type BulkWorkChange = { status?: string; priority?: string; assignee?: string; resolution?: string };
/** Build one atomic change; reject the complete selection if any record is ineligible. */
export function bulkWorkUpdate(data: Store, actor: DemoUser, kind: "tasks" | "cases", ids: string[], change: BulkWorkChange): Store {
  if (!ids.length || !Object.values(change).some(Boolean)) throw new Error("Choose records and a change first.");
  if (change.status && !(kind === "cases" ? caseStages : workStages).includes(change.status)) throw new Error("Choose a valid status.");
  if (change.priority && !["Low", "Medium", "High", "Urgent"].includes(change.priority)) throw new Error("Choose a valid priority.");
  if (change.assignee && (!actor.roles.some((r) => ["System Admin", "Operations Manager"].includes(r)) ||
    !data.users.some((u) => u.active && u.name === change.assignee))) throw new Error("Choose an active assignee with Operations Manager access.");
  const selected = new Set(ids);
  if (data[kind].filter((r) => selected.has(r.id)).length !== selected.size) throw new Error("A selected record is no longer available.");
  return { ...data, [kind]: data[kind].map((item): WorkItem => {
    if (!selected.has(item.id)) return item;
    if (!can(actor, `${kind}.edit`, item, data) || (change.assignee && !can(actor, `${kind}.assign`, item, data))) throw new Error("A selected record is outside your editing scope.");
    const status = change.status || item.status;
    const resolution = kind === "cases" && ["Resolved", "Closed"].includes(status) ? change.resolution?.trim() || item.resolution : item.resolution;
    if (kind === "cases" && ["Resolved", "Closed"].includes(status) && !resolution.trim()) throw new Error("Add a resolution for every case being resolved or closed.");
    const next = { ...item, status, priority: change.priority || item.priority, assignee: change.assignee || item.assignee, resolution };
    if (JSON.stringify(next) === JSON.stringify(item)) return item;
    return { ...next, history: [event(`Bulk update: ${Object.entries(change).filter(([k, v]) => v && k !== "resolution").map(([k, v]) => `${k} → ${v}`).join("; ")}.`), ...item.history] };
  }) };
}

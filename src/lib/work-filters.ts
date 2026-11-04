import type { Account, WorkItem } from "./data.ts";

export const dueFilters = [
  ["any", "Any due date"],
  ["overdue", "Overdue"],
  ["today", "Due today"],
  ["tomorrow", "Due tomorrow"],
  ["week", "This week"],
  ["next7", "Next 7 days"],
  ["custom", "Custom range"],
] as const;
export type WorkFilters = {
  query: string;
  status: string;
  assignee: string;
  priority: string;
  category: string;
  accountId: string;
  due: (typeof dueFilters)[number][0];
  dueFrom: string;
  dueTo: string;
  linkedCase: string;
  mine: boolean;
};
const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Read both the expanded view format and the original status/manager snapshots. */
export function workFiltersFromView(
  view: Record<string, unknown> = {},
): WorkFilters {
  const status = text(view.status ?? view.filter);
  const assignee = text(view.assignee ?? view.manager);
  return {
    query: text(view.query),
    status: status === "All statuses" ? "" : status,
    assignee: ["All managers", "All assignees"].includes(assignee)
      ? ""
      : assignee,
    priority: text(view.priority),
    category: text(view.category),
    accountId: text(view.accountId),
    due: dueFilters.some(([key]) => key === view.due)
      ? (view.due as WorkFilters["due"])
      : "any",
    dueFrom: text(view.dueFrom),
    dueTo: text(view.dueTo),
    linkedCase: text(view.linkedCase),
    mine: view.mine === true,
  };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
// Calendar arithmetic uses the local YYYY-MM-DD supplied by the UI, without
// converting its midnight into another timezone or assuming 24-hour DST days.
function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function workFilterError(filters: WorkFilters) {
  if (filters.due !== "custom") return "";
  if (
    (filters.dueFrom && !validDate(filters.dueFrom)) ||
    (filters.dueTo && !validDate(filters.dueTo))
  )
    return "Choose valid dates for the custom range.";
  return filters.dueFrom && filters.dueTo && filters.dueFrom > filters.dueTo
    ? "The start date must be on or before the end date."
    : "";
}
export function activeWorkFilterCount(filters: WorkFilters) {
  return [
    filters.query.trim(),
    filters.status,
    filters.assignee,
    filters.priority,
    filters.category,
    filters.accountId,
    filters.due !== "any",
    filters.linkedCase,
    filters.mine,
  ].filter(Boolean).length;
}

/** Only pass records already projected for the current role and workspace. */
export function filterWorkItems(
  records: WorkItem[],
  filters: WorkFilters,
  context: {
    kind: "tasks" | "cases";
    accounts: Pick<Account, "id" | "name">[];
    tasks: WorkItem[];
    actorName: string;
    today: string;
  },
) {
  if (workFilterError(filters) || !validDate(context.today)) return [];
  const names = new Map(context.accounts.map((a) => [a.id, a.name]));
  const casesWithVisibleWork = new Set(
    context.tasks.flatMap((t) => (t.caseId ? [t.caseId] : [])),
  );
  const query = filters.query.trim().toLowerCase();
  let from = "",
    to = "";
  if (filters.due === "today") from = to = context.today;
  if (filters.due === "tomorrow") from = to = addDays(context.today, 1);
  if (filters.due === "next7") {
    from = context.today;
    to = addDays(context.today, 6);
  }
  if (filters.due === "week") {
    const day = new Date(`${context.today}T00:00:00Z`).getUTCDay();
    from = addDays(context.today, -((day + 6) % 7));
    to = addDays(from, 6);
  }
  if (filters.due === "custom") {
    from = filters.dueFrom;
    to = filters.dueTo;
  }
  return records.filter((record) => {
    if (filters.status && record.status !== filters.status) return false;
    if (filters.assignee && record.assignee !== filters.assignee) return false;
    if (filters.mine && record.assignee !== context.actorName) return false;
    if (filters.priority && record.priority !== filters.priority) return false;
    if (filters.category && record.category !== filters.category) return false;
    if (filters.accountId && record.accountId !== filters.accountId)
      return false;
    if (
      query &&
      !`${record.title} ${record.id} ${names.get(record.accountId) || ""}`
        .toLowerCase()
        .includes(query)
    )
      return false;
    if (filters.due !== "any" && !validDate(record.due)) return false;
    if (
      filters.due === "overdue" &&
      (record.due >= context.today ||
        ["Done", "Aborted", "Resolved", "Closed"].includes(record.status))
    )
      return false;
    if ((from && record.due < from) || (to && record.due > to)) return false;
    const linked =
      context.kind === "tasks"
        ? !!record.caseId
        : casesWithVisibleWork.has(record.id);
    if (filters.linkedCase === "linked" && !linked) return false;
    if (filters.linkedCase === "unlinked" && linked) return false;
    if (
      filters.linkedCase &&
      !["linked", "unlinked"].includes(filters.linkedCase) &&
      (context.kind === "tasks" ? record.caseId : record.id) !==
        filters.linkedCase
    )
      return false;
    return true;
  });
}

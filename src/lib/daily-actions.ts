import { can } from "./access.ts";
import type { Account, Store, WorkItem } from "./data.ts";
import type { DemoUser } from "./model.ts";
import { scopedAccounts, scopedItems, type WorkspaceId } from "./workspaces.ts";

export const attentionGroups = ["All", "Due today", "Overdue", "High priority", "Blocked", "Approvals", "Upcoming"] as const;
export type AttentionGroup = (typeof attentionGroups)[number];
export type AttentionSort = "Recommended" | "Priority" | "Due date";
export type ActionFilters = {
  group: AttentionGroup;
  mineOnly: boolean;
  priority: string;
  kind: string;
  owner: string;
  sort: AttentionSort;
};
export const defaultActionFilters: ActionFilters = {
  group: "All", mineOnly: false, priority: "All priorities", kind: "All types",
  owner: "All owners", sort: "Recommended",
};
export type DailyAction = {
  id: string;
  title: string;
  detail: string;
  reason: string;
  group: "Overdue" | "Blocked" | "Approvals" | "Due today" | "Upcoming";
  mine: boolean;
  due: string;
  priority: string;
  owner: string;
  blocked: boolean;
} & ({ kind: "tasks" | "cases"; record: WorkItem } | { kind: "account" | "approval"; record: Account });

const priorityOrder = (priority: string) => ({ Urgent: 0, High: 1, Medium: 2, Low: 3 })[priority] ?? 4;
const isBlocked = (status: string) => ["On Hold / Under Review", "Waiting for Customer"].includes(status);

function attentionRank(due: string, priority: string, blocked: boolean, approval: boolean, today: string) {
  if (priority === "Urgent") return 0;
  if (due === today) return 1;
  if (priority === "High") return 2;
  if (approval) return 3;
  if (due && due < today) return 4;
  if (blocked) return 5;
  return 6;
}

/** Urgency and today's commitments take precedence over ownership and old dates. */
export function compareWorkAttention(a: WorkItem, b: WorkItem, today: string) {
  return attentionRank(a.due, a.priority, isBlocked(a.status), false, today) -
    attentionRank(b.due, b.priority, isBlocked(b.status), false, today) ||
    priorityOrder(a.priority) - priorityOrder(b.priority) || a.due.localeCompare(b.due) || a.id.localeCompare(b.id);
}

function compareActions(a: DailyAction, b: DailyAction, today: string, sort: AttentionSort) {
  const byPriority = priorityOrder(a.priority) - priorityOrder(b.priority);
  // Undated approval decisions follow dated work when explicitly sorting by date.
  const byDate = (a.due || "9999-12-31").localeCompare(b.due || "9999-12-31");
  const byRank = attentionRank(a.due, a.priority, a.blocked, a.kind === "approval", today) -
    attentionRank(b.due, b.priority, b.blocked, b.kind === "approval", today);
  return (sort === "Priority" ? byPriority || byDate : sort === "Due date" ? byDate || byPriority : byRank || byPriority || byDate) ||
    Number(b.mine) - Number(a.mine) || a.id.localeCompare(b.id);
}

export function matchesAttentionGroup(action: DailyAction, group: AttentionGroup, today: string) {
  switch (group) {
    case "All": return true;
    case "Due today": return action.due === today;
    case "Overdue": return !!action.due && action.due < today;
    case "High priority": return ["Urgent", "High"].includes(action.priority);
    case "Blocked": return action.blocked;
    case "Approvals": return action.kind === "approval";
    case "Upcoming": return !!action.due && action.due > today;
  }
}

export function filterDailyActions(actions: DailyAction[], filters: ActionFilters, today: string) {
  return actions.filter((action) =>
    matchesAttentionGroup(action, filters.group, today) &&
    (!filters.mineOnly || action.mine) &&
    (filters.priority === "All priorities" || action.priority === filters.priority) &&
    (filters.kind === "All types" || action.kind === filters.kind) &&
    (filters.owner === "All owners" || action.owner === filters.owner),
  ).sort((a, b) => compareActions(a, b, today, filters.sort));
}

/** Pair the most important item with today's first commitment in the short preview. */
export function attentionPreview<T extends { id: string; due: string }>(items: T[], today: string, limit = 6): T[] {
  const todayIndex = items.findIndex((item) => item.due === today);
  if (limit > 1 && todayIndex > 1) {
    const dueToday = items[todayIndex];
    return [items[0], dueToday, ...items.filter((_, index) => index !== 0 && index !== todayIndex).slice(0, limit - 2)];
  }
  return items.slice(0, limit);
}

export function dailyActions(data: Store, actor: DemoUser, workspace: WorkspaceId, today: string): DailyAction[] {
  const actions: DailyAction[] = [];
  for (const kind of ["tasks", "cases"] as const) {
    for (const item of scopedItems(data, kind, workspace)) {
      if (["Done", "Aborted", "Resolved", "Closed"].includes(item.status) ||
        !can(actor, kind === "tasks" ? "tasks.edit" : "cases.edit", item, data)) continue;
      const overdue = item.due < today;
      const blocked = isBlocked(item.status);
      const group = blocked ? "Blocked" : overdue ? "Overdue" : item.due === today ? "Due today" : "Upcoming";
      actions.push({ id: `${kind}:${item.id}`, kind, record: item, title: item.title,
        detail: `${kind === "tasks" ? "Task" : "Support case"} · ${data.accounts.find((a) => a.id === item.accountId)?.name || item.accountId} · ${item.assignee}`,
        reason: `${blocked ? `${item.status} · ` : ""}${overdue ? "Overdue" : item.due === today ? "Due today" : "Due"} · ${item.due}`,
        group, mine: item.assignee === actor.name, due: item.due, priority: item.priority,
        owner: item.assignee, blocked });
    }
  }
  for (const account of scopedAccounts(data, workspace)) {
    if (account.approval === "Pending approval" && can(actor, "onboarding.approve", account, data)) {
      actions.push({ id: `approval:${account.id}`, kind: "approval", record: account,
        title: `Review ${account.name}`, detail: "Brand activation · Operations review",
        reason: "Ready for approval", group: "Approvals", mine: false, due: "", priority: "",
        owner: account.manager, blocked: false });
    } else if (account.followUp && can(actor, "accounts.edit", account, data)) {
      actions.push({ id: `account:${account.id}`, kind: "account", record: account,
        title: `Follow up with ${account.name}`, detail: `Account follow-up · ${account.manager}`,
        reason: `Follow-up ${account.followUp < today ? "overdue" : account.followUp === today ? "due today" : "due"} · ${account.followUp}`,
        group: account.followUp < today ? "Overdue" : account.followUp === today ? "Due today" : "Upcoming", mine: account.manager === actor.name,
        due: account.followUp, priority: "", owner: account.manager, blocked: false });
    }
  }
  return actions.sort((a, b) => compareActions(a, b, today, "Recommended"));
}

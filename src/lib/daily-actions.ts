import { can } from "./access.ts";
import type { Account, Store, WorkItem } from "./data.ts";
import type { DemoUser } from "./model.ts";
import { scopedAccounts, scopedItems, type WorkspaceId } from "./workspaces.ts";
export type DailyAction = {
  id: string;
  title: string;
  detail: string;
  reason: string;
  group: "Overdue" | "Blocked" | "Approvals" | "Due today" | "Upcoming";
  mine: boolean;
  due: string;
  rank: number;
} & ({ kind: "tasks" | "cases"; record: WorkItem } | { kind: "account" | "approval"; record: Account });
export function dailyActions(data: Store, actor: DemoUser, workspace: WorkspaceId, today: string): DailyAction[] {
  const actions: DailyAction[] = [];
  for (const kind of ["tasks", "cases"] as const) {
    for (const item of scopedItems(data, kind, workspace)) {
      if (["Done", "Aborted", "Resolved", "Closed"].includes(item.status) ||
        !can(actor, kind === "tasks" ? "tasks.edit" : "cases.edit", item, data)) continue;
      const overdue = item.due < today;
      const blocked = ["On Hold / Under Review", "Waiting for Customer"].includes(item.status);
      const group = blocked ? "Blocked" : overdue ? "Overdue" : item.due === today ? "Due today" : "Upcoming";
      actions.push({ id: `${kind}:${item.id}`, kind, record: item, title: item.title,
        detail: `${data.accounts.find((a) => a.id === item.accountId)?.name || item.accountId} · ${item.assignee}`,
        reason: `${blocked ? `${item.status} · ` : ""}${overdue ? "Overdue" : item.due === today ? "Due today" : "Due"} · ${item.due}`,
        group, mine: item.assignee === actor.name, due: item.due,
        rank: overdue ? 0 : blocked ? 1 : item.due === today ? 3 : item.priority === "Urgent" ? 4 : 5 });
    }
  }
  for (const account of scopedAccounts(data, workspace)) {
    if (account.approval === "Pending approval" && can(actor, "onboarding.approve", account, data)) {
      actions.push({ id: `approval:${account.id}`, kind: "approval", record: account,
        title: `Review ${account.name}`, detail: "Brand activation · Operations review",
        reason: "Ready for approval", group: "Approvals", mine: false, due: "", rank: 2 });
    } else if (account.followUp && account.followUp <= today &&
      can(actor, "accounts.edit", account, data)) {
      actions.push({ id: `account:${account.id}`, kind: "account", record: account,
        title: `Follow up with ${account.name}`, detail: `Account relationship · ${account.manager}`,
        reason: `Follow-up ${account.followUp < today ? "overdue" : "due today"} · ${account.followUp}`,
        group: account.followUp < today ? "Overdue" : "Due today", mine: account.manager === actor.name,
        due: account.followUp, rank: account.followUp < today ? 0 : 3 });
    }
  }
  return actions.sort((a, b) => a.rank - b.rank || Number(b.mine) - Number(a.mine) || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}

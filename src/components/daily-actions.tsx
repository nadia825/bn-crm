"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { dailyActions, type DailyAction } from "@/lib/daily-actions";
import { todayDate } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Account, WorkItem } from "@/lib/data";
import type { WorkspaceId } from "@/lib/workspaces";
import { Card, Badge } from "./ui/primitives";
import { Button } from "./ui/button";
export function DailyActions({ workspace, openAccount, openItem, reviewApproval }: {
  workspace: WorkspaceId;
  openAccount: (a: Account) => void;
  openItem: (i: WorkItem, kind: "tasks" | "cases") => void;
  reviewApproval: (a: Account) => void;
}) {
  const { data, actor } = useStore((s) => ({ data: s.data, actor: s.actor }));
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(false);
  const actions = dailyActions(data, actor, workspace, todayDate());
  const matches = (a: DailyAction, tab: string) => tab === "All" || (tab === "My work" ? a.mine :
    tab === "Overdue" ? a.due !== "" && a.due < todayDate() : a.group === tab);
  const filtered = actions.filter((a) => matches(a, filter));
  return <Card className="daily-actions">
    <div className="daily-actions-heading"><div><h2>Needs your attention</h2><p>Overdue work, blockers and decisions in this workspace.</p></div><span className="subtle">{todayDate()}</span></div>
    <div className="daily-actions-tabs" role="group" aria-label="Filter next actions">
      {["All", "My work", "Overdue", "Blocked", "Approvals"].map((tab) => <button key={tab} aria-pressed={filter === tab}
        className={filter === tab ? "active" : ""} onClick={() => { setFilter(tab); setExpanded(false); }}>
        {tab}<span>{actions.filter((a) => matches(a, tab)).length}</span>
      </button>)}
    </div>
    {filtered.slice(0, expanded ? undefined : 5).map((action) => <button className="daily-action-row" key={action.id}
      onClick={() => { if (action.kind === "tasks" || action.kind === "cases") openItem(action.record, action.kind); else if (action.kind === "approval") reviewApproval(action.record); else if (action.kind === "account") openAccount(action.record); }}>
      <span><strong>{action.title}</strong><small>{action.detail}</small><small className={action.due && action.due < todayDate() ? "overdue" : ""}>{action.reason}</small></span>
      <Badge>{action.group}</Badge><ArrowRight size={16} />
    </button>)}
    {!filtered.length && <div className="daily-actions-empty"><CheckCircle2 size={21} /><span>No {filter === "All" ? "pending actions" : filter.toLowerCase()} in your current scope.</span></div>}
    {filtered.length > 5 && <Button className="daily-actions-more" variant="ghost" onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer" : `Show all ${filtered.length} actions`}</Button>}
  </Card>;
}

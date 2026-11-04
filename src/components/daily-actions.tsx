"use client";
import { useEffect, useState } from "react";
import { ChevronRight, CheckCircle2, Clock3 } from "lucide-react";
import {
  dailyActions, attentionGroups, attentionPreview, defaultActionFilters, filterDailyActions,
  type ActionFilters, type AttentionSort,
} from "@/lib/daily-actions";
import { todayDate } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Account, WorkItem } from "@/lib/data";
import type { WorkspaceId } from "@/lib/workspaces";
import { Card, Badge, Select } from "./ui/primitives";
import { Button } from "./ui/button";
import { PersonIdentity } from "./shared";
import "./daily-actions.css";

export function DailyActions({ workspace, openAccount, openItem, reviewApproval }: {
  workspace: WorkspaceId;
  openAccount: (a: Account) => void;
  openItem: (i: WorkItem, kind: "tasks" | "cases") => void;
  reviewApproval: (a: Account) => void;
}) {
  const { data, actor } = useStore((s) => ({ data: s.data, actor: s.actor }));
  const [today, setToday] = useState(todayDate);
  const [filters, setFilters] = useState<ActionFilters>(defaultActionFilters);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const updateDate = () => setToday(todayDate());
    const timer = setInterval(updateDate, 60000);
    window.addEventListener("focus", updateDate);
    return () => { clearInterval(timer); window.removeEventListener("focus", updateDate); };
  }, []);
  const actions = dailyActions(data, actor, workspace, today);
  const updateFilters = (change: Partial<ActionFilters>) => {
    setFilters((current) => ({ ...current, ...change }));
    setExpanded(false);
  };
  const filtered = filterDailyActions(actions, filters, today);
  const visible = expanded ? filtered : filters.sort === "Recommended" ? attentionPreview(filtered, today) : filtered.slice(0, 6);
  const countFor = (group: ActionFilters["group"]) => filterDailyActions(actions, { ...filters, group }, today).length;
  const myCount = filterDailyActions(actions, { ...filters, group: "All", mineOnly: true, owner: "All owners" }, today).length;
  const changed = Object.keys(defaultActionFilters).some((key) => filters[key as keyof ActionFilters] !== defaultActionFilters[key as keyof ActionFilters]);
  const ownerOptions = Array.from(new Set(actions.map((action) => action.owner))).filter(Boolean).sort();
  const deadlineText = (due: string) => {
    if (due === today) return "Due today";
    const date = new Date(`${due}T12:00:00`).toLocaleDateString("en-US", {
      month: "short", day: "numeric", ...(due.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" as const } : {}),
    });
    return due < today ? `Overdue · ${date}` : `Due ${date}`;
  };

  return <Card className="daily-actions">
    <div className="daily-actions-heading">
      <div><h2>Needs your attention</h2><p>Urgent work first, with today’s commitments kept in view.</p></div>
      <span className="subtle">{today}</span>
    </div>
    <div className="daily-actions-tabs" role="group" aria-label="Filter next actions">
      <button type="button" aria-pressed={filters.mineOnly} className={filters.mineOnly ? "active" : ""}
        onClick={() => updateFilters({ mineOnly: !filters.mineOnly, owner: "All owners" })}>
        My work<span>{myCount}</span>
      </button>
      {attentionGroups.map((group) => <button type="button" key={group} aria-pressed={filters.group === group}
        className={filters.group === group ? "active" : ""} onClick={() => updateFilters({ group })}>
        {group}<span>{countFor(group)}</span>
      </button>)}
    </div>
    <div className="daily-actions-filters">
      <Select aria-label="Attention priority" value={filters.priority} onChange={(e) => updateFilters({ priority: e.target.value })}
        options={["All priorities", "Urgent", "High", "Medium", "Low"]} />
      <Select aria-label="Attention type" value={filters.kind} onChange={(e) => updateFilters({ kind: e.target.value })}>
        <option value="All types">All types</option><option value="tasks">Tasks</option><option value="cases">Support cases</option>
        <option value="account">Account follow-ups</option><option value="approval">Approvals</option>
      </Select>
      <Select aria-label="Attention owner" value={filters.owner} onChange={(e) => updateFilters({ owner: e.target.value, mineOnly: false })}>
        <option value="All owners">All owners</option>{ownerOptions.map((owner) => <option key={owner}>{owner}</option>)}
      </Select>
      <Select aria-label="Attention sort" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value as AttentionSort })}
        options={["Recommended", "Priority", "Due date"]} />
      {changed && <Button variant="ghost" onClick={() => { setFilters(defaultActionFilters); setExpanded(false); }}>Clear filters</Button>}
    </div>
    <div className="daily-actions-results" aria-live="polite">
      {filtered.length ? `Showing ${visible.length} of ${filtered.length} actions` : "No matching actions"}
      {filters.sort === "Recommended" && <span>Urgent work first · Today kept in view</span>}
    </div>
    {visible.map((action) => <button className="daily-action-row" key={action.id}
      onClick={() => {
        if (action.kind === "tasks" || action.kind === "cases") openItem(action.record, action.kind);
        else if (action.kind === "approval") reviewApproval(action.record);
        else if (action.kind === "account") openAccount(action.record);
      }}>
      <span className="daily-action-copy">
        <strong className="daily-action-title">{action.title}</strong>
        {action.kind !== "account" && <small className="daily-action-context">
          {action.detail.endsWith(` · ${action.owner}`) ? action.detail.slice(0, -` · ${action.owner}`.length) : action.detail}
        </small>}
        <span className="daily-action-footer">
          <span className="daily-action-owner" aria-label={`${action.kind === "account" || action.kind === "approval" ? "Owner" : "Assigned to"}: ${action.owner}`}>
            <PersonIdentity name={action.owner} size={22} />
          </span>
          {action.due && <time dateTime={action.due} title={action.reason}
            className={`daily-action-deadline ${action.due === today ? "is-today" : action.due < today ? "is-overdue" : ""}`}>
            <Clock3 size={12} aria-hidden="true" />{deadlineText(action.due)}
          </time>}
          <span className="daily-action-badges">
            {action.priority && <Badge>{action.priority}</Badge>}
            {action.blocked && <Badge className="attention-blocked">Blocked</Badge>}
            {action.kind === "approval" && <Badge>Pending approval</Badge>}
          </span>
        </span>
      </span>
      <ChevronRight className="daily-action-arrow" size={17} aria-hidden="true" />
    </button>)}
    {!filtered.length && <div className="daily-actions-empty"><CheckCircle2 size={21} /><span>{changed ? "No actions match these filters. Clear them to see the full queue." : "No pending actions in your current scope."}</span></div>}
    {filtered.length > 6 && <Button className="daily-actions-more" variant="ghost" onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer" : `Show all ${filtered.length} actions`}</Button>}
  </Card>;
}

"use client";
import { PreviewText, useProductionPreview } from "./production-preview";
import { DailyActions } from "./daily-actions";
import { todayDate } from "@/lib/dates";
import { attentionPreview, compareWorkAttention } from "@/lib/daily-actions";
import { useState } from "react";
import {
  ArrowRight,
  Plus,
  Building2,
  ClipboardList,
  Headset,
  ShieldCheck,
  CreditCard,
  CalendarDays,
  Users,
  GitBranch,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type Account, type WorkItem, dateLabel } from "@/lib/data";
import { canPage } from "@/lib/access";
import { scopedItems, WORKSPACES, type WorkspaceId } from "@/lib/workspaces";
import { Button } from "./ui/button";
import { Card, Badge } from "./ui/primitives";
import {
  Avatar,
  PersonIdentity,
  AccountLogo,
  EmptyState,
  PanelHeading,
  SectionTitle,
} from "./shared";
import { ViewControls } from "./saved-views";
export function RoleDashboard({
  workspace,
  navigate,
  openAccount,
  openItem,
  newWork,
  newAccount,
  reviewApproval,
}: {
  workspace: WorkspaceId;
  navigate: (p: string) => void;
  openAccount: (a: Account) => void;
  openItem: (i: WorkItem, k: "tasks" | "cases") => void;
  newWork: () => void;
  newAccount: () => void;
  reviewApproval: (a: Account) => void;
}) {
  const preview = useProductionPreview();
  const { data, actor, can } = useStore((s) => ({ data: s.data, actor: s.actor, can: s.can }));
  const go = (page: string) =>
    navigate(canPage(actor, page, data) ? page : "All Accounts");
  const roles = actor.roles;
  const primary = roles.includes("System Admin")
    ? "System Admin"
    : roles.includes("Operations Manager")
      ? "Operations Manager"
      : roles.includes("Sales Manager")
        ? "Sales Manager"
        : roles.includes("Account Manager")
          ? "Account Manager"
          : roles.includes("Operations Member")
            ? "Operations Member"
            : roles.includes("Finance")
              ? "Finance"
              : "Viewer";
  const title = {
    "System Admin": "Company dashboard",
    "Sales Manager": "Sales dashboard",
    "Account Manager": "My dashboard",
    "Operations Manager": "Operations dashboard",
    "Operations Member": "My dashboard",
    Finance: "Finance dashboard",
    Viewer: "Overview",
  }[primary];
  const descriptions = {
    "System Admin":
      "A connected view of customers, delivery, and system administration.",
    "Sales Manager":
      "Monitor acquisition, ownership, and your team’s account relationships.",
    "Account Manager":
      "Your assigned relationships, next conversations, and account work.",
    "Operations Manager":
      "Team-wide business delivery, support, and protected brand activation.",
    "Operations Member":
      "Your assigned work, support cases, and onboarding requirements.",
    Finance:
      preview ? "Billing, payment follow-ups, and financial reporting." : "Fictional billing, payment follow-ups, and authorized financial reporting.",
    Viewer: "Read-only visibility into your designated accounts and reports.",
  };
  const clients = data.accounts.filter((a) => a.type !== "Supplier");
  const own = clients.filter((a) => a.manager === actor.name);
  const openTasks = data.tasks.filter(
    (t) => !["Done", "Aborted"].includes(t.status),
  );
  const myTasks = openTasks.filter((t) => t.assignee === actor.name);
  const cases = data.cases.filter(
    (c) => !["Resolved", "Closed"].includes(c.status),
  );
  const approvals = clients.filter((a) => a.approval === "Pending approval");
  const balance = data.billing
    .filter((b) => ["Open", "Overdue"].includes(b.status))
    .reduce((n, b) => n + b.amount, 0);
  const money = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(v);
  const finance = can("billing.read"),
    operations = primary.startsWith("Operations");
  const metrics =
    primary === "Finance"
      ? [
          {
            label: preview ? "Outstanding balance" : "Outstanding mock balance",
            value: money(balance),
            page: "Billing",
            icon: CreditCard,
            color: "purple",
          },
          {
            label: "Overdue invoices",
            value: data.billing.filter((b) => b.status === "Overdue").length,
            page: "Payment Follow-ups",
            icon: CalendarDays,
            color: "amber",
          },
          {
            label: "Billing cases",
            value: cases.length,
            page: "Support Cases",
            icon: Headset,
            color: "rose",
          },
          {
            label: "Authorized accounts",
            value: clients.length,
            page: "All Accounts",
            icon: Building2,
            color: "blue",
          },
        ]
      : operations
        ? [
            {
              label:
                primary === "Operations Member"
                  ? "My open work"
                  : "Open team work",
              value: openTasks.length,
              page: "Work Board",
              icon: ClipboardList,
              color: "purple",
            },
            {
              label:
                primary === "Operations Member"
                  ? "Assigned cases"
                  : "Open support cases",
              value: cases.length,
              page: "Support Cases",
              icon: Headset,
              color: "rose",
            },
            {
              label:
                primary === "Operations Member"
                  ? "Assigned brand setup"
                  : "Pending approvals",
              value:
                primary === "Operations Member"
                  ? clients.filter(
                      (a) =>
                        a.checkOwners?.includes(actor.name) &&
                        a.status === "Onboarding",
                    ).length
                  : approvals.length,
              page:
                primary === "Operations Member"
                  ? "Brand Onboarding"
                  : "Pending Approvals",
              icon: ShieldCheck,
              color: "amber",
            },
            {
              label: "High-priority work",
              value: openTasks.filter((t) =>
                ["High", "Urgent"].includes(t.priority),
              ).length,
              page: "Tasks",
              icon: CalendarDays,
              color: "blue",
            },
          ]
        : [
            {
              label:
                primary === "Account Manager"
                  ? "My accounts"
                  : "Accessible accounts",
              value:
                primary === "Account Manager" ? own.length : clients.length,
              page: "All Accounts",
              icon: Building2,
              color: "purple",
            },
            {
              label: "Live affiliates",
              value: clients.filter(
                (a) => a.type === "Affiliate" && a.stage === "Live",
              ).length,
              page: "Affiliate Pipeline",
              icon: GitBranch,
              color: "green",
            },
            {
              label:
                primary === "Account Manager"
                  ? "My open tasks"
                  : "Visible open work",
              value:
                primary === "Account Manager"
                  ? myTasks.length
                  : openTasks.length,
              page: primary === "Sales Manager" ? "Activities" : "Tasks",
              icon: ClipboardList,
              color: "blue",
            },
            {
              label:
                primary === "System Admin"
                  ? (preview ? "Users" : "Demo users")
                  : primary === "Sales Manager"
                    ? "Follow-ups due"
                    : "Open cases",
              value:
                primary === "System Admin"
                  ? data.users.length
                  : primary === "Sales Manager"
                    ? clients.filter((a) => a.followUp <= todayDate()).length
                    : cases.length,
              page:
                primary === "System Admin"
                  ? "Users & Roles"
                  : primary === "Sales Manager"
                    ? "Follow-ups"
                    : "All Accounts",
              icon: primary === "System Admin" ? Users : Headset,
              color: "amber",
            },
          ];
  const widgets = [
    "Metrics",
    "Accounts",
    ...(can("tasks.read") ? ["Tasks"] : []),
    ...(can("cases.read") ? ["Cases"] : []),
    ...(finance ? ["Finance"] : []),
    ...(can("onboarding.approve") ? ["Approvals"] : []),
    ...(primary === "System Admin" ? ["Administration"] : []),
  ];
  const [shown, setShown] = useState(widgets);
  const listAccounts = primary === "Account Manager" ? own : clients;
  const today = todayDate();
  const taskList = attentionPreview(scopedItems(data, "tasks", workspace)
    .filter((item) => !["Done", "Aborted"].includes(item.status) &&
      (primary !== "Account Manager" || item.assignee === actor.name))
    .sort((a, b) => compareWorkAttention(a, b, today)), today, 5);
  const caseList = attentionPreview(scopedItems(data, "cases", workspace)
    .filter((item) => !["Resolved", "Closed"].includes(item.status))
    .sort((a, b) => compareWorkAttention(a, b, today)), today, 5);
  const dueText = (due: string) => due === today ? "Due today" : due < today ? `Overdue · ${dateLabel(due)}` : `Due ${dateLabel(due)}`;
  return (
    <>
      <SectionTitle title={title} subtitle={descriptions[primary]}>
        {can("accounts.create", {
          type: workspace === "affiliates" ? "Affiliate" : "Corporate Brand",
          manager: actor.name,
        }) && (
          <Button variant="outline" onClick={newAccount}>
            <Plus size={14} />
            New account
          </Button>
        )}
        {can("tasks.create") && (
          <Button onClick={newWork}>
            <Plus size={14} />
            New work request
          </Button>
        )}
      </SectionTitle>
      <DailyActions workspace={workspace} openAccount={openAccount} openItem={openItem} reviewApproval={reviewApproval} />
      <div className="dashboard-layout-options">
        <span>Dashboard widgets</span>
        {widgets.map((w) => (
          <label key={w}>
            <input
              type="checkbox"
              checked={shown.includes(w)}
              onChange={(e) =>
                setShown(
                  e.target.checked
                    ? [...shown, w]
                    : shown.filter((x) => x !== w),
                )
              }
            />
            {w}
          </label>
        ))}
      </div>
      <ViewControls
        module={`dashboard:${roles.join("+")}:${workspace}`}
        snapshot={{ widgets: shown }}
        defaults={{ widgets }}
        onApply={(v) =>
          setShown(
            Array.isArray(v.widgets)
              ? widgets.filter((w) => (v.widgets as string[]).includes(w))
              : widgets,
          )
        }
      />
      {shown.includes("Metrics") && (
        <div className="metrics-grid">
          {metrics.map((m) => (
            <Card
              className="workspace-metric"
              key={m.label}
              role="button"
              tabIndex={0}
              onClick={() => go(m.page)}
              onKeyDown={(e) => e.key === "Enter" && go(m.page)}
            >
              <div className="metric-top">
                <span>{m.label}</span>
                <span className={`metric-icon ${m.color}`}>
                  <m.icon size={17} />
                </span>
              </div>
              <strong>{m.value}</strong>
              <div className="workspace-metric-foot">
                <span className="demo-only">Current authorized demo scope</span>
                <ArrowRight size={13} />
              </div>
            </Card>
          ))}
        </div>
      )}
      <div className="workspace-dashboard-grid">
        {shown.includes("Accounts") && (
          <Card>
            <PanelHeading
              title={
                primary === "Account Manager"
                  ? "My account relationships"
                  : "Accessible account relationships"
              }
              subtitle={`${listAccounts.length} records · No duplicated accounts`}
              action="Open directory"
              onAction={() => navigate("All Accounts")}
            />
            {listAccounts.slice(0, 5).map((a) => (
              <button
                className="role-account-row"
                key={a.id}
                onClick={() => openAccount(a)}
              >
                <AccountLogo name={a.name} color={a.color} />
                <span>
                  <strong>{a.name}</strong>
                  <small>
                    {a.type} · {a.manager}
                  </small>
                </span>
                <Badge>{a.status}</Badge>
                <ArrowRight size={13} />
              </button>
            ))}
            {!listAccounts.length && (
              <EmptyState
                title="No assigned accounts"
                description="Sales Managers can assign client relationships from Team assignments."
              />
            )}
          </Card>
        )}
        {shown.includes("Finance") && finance && (
          <Card>
            <PanelHeading
              title="Finance follow-ups"
              subtitle="Restricted to Finance and System Admin roles"
              action="Billing"
              onAction={() => navigate("Billing")}
            />
            <div className="finance-dashboard-total">
              <CreditCard size={22} />
              <span>
                <small><PreviewText demo="Outstanding fictional balance" clean="Outstanding balance" /></small>
                <strong>{money(balance)}</strong>
              </span>
            </div>
            {data.billing
              .filter((b) => ["Open", "Overdue"].includes(b.status))
              .slice(0, 4)
              .map((b) => (
                <button
                  className="role-account-row"
                  key={b.id}
                  onClick={() => navigate("Payment Follow-ups")}
                >
                  <span>
                    <strong>
                      {data.accounts.find((a) => a.id === b.accountId)?.name}
                    </strong>
                    <small>
                      {b.id} · Due {dateLabel(b.due)}
                    </small>
                  </span>
                  <strong>{money(b.amount)}</strong>
                  <Badge>{b.status}</Badge>
                </button>
              ))}
          </Card>
        )}
        {shown.includes("Tasks") && (
          <Card>
            <PanelHeading
              title={
                primary === "Account Manager" || primary === "Operations Member"
                  ? "My next tasks"
                  : "Next business work"
              }
              subtitle="Urgent and today’s work first, followed by high-priority follow-ups"
              action="Open work"
              onAction={() =>
                navigate(primary === "Sales Manager" ? "Activities" : "Tasks")
              }
            />
            {taskList.map((t) => (
              <button
                className="role-account-row"
                key={t.id}
                onClick={() => openItem(t, "tasks")}
              >
                <span className="tile-icon purple">
                  <ClipboardList size={17} />
                </span>
                <span>
                  <strong>{t.title}</strong>
                  <span className="role-work-meta"><small>{t.id} · {dueText(t.due)}</small><PersonIdentity name={t.assignee} size={22} /></span>
                </span>
                <Badge>{t.priority}</Badge>
              </button>
            ))}
            {!taskList.length && <EmptyState title="No open assigned tasks" />}
          </Card>
        )}
        {shown.includes("Cases") && (
          <Card>
            <PanelHeading
              title="Relevant support cases"
              subtitle="Independent of account lifecycle stages"
              action="Open cases"
              onAction={() => navigate("Support Cases")}
            />
            {caseList.map((c) => (
              <button
                className="role-account-row"
                key={c.id}
                onClick={() => openItem(c, "cases")}
              >
                <span className="tile-icon rose">
                  <Headset size={17} />
                </span>
                <span>
                  <strong>{c.title}</strong>
                  <span className="role-work-meta"><small>{c.id} · {dueText(c.due)}</small><PersonIdentity name={c.assignee} size={22} /></span>
                </span>
                <Badge>{c.priority}</Badge>
              </button>
            ))}
            {!cases.length && (
              <EmptyState title="No open cases in your scope" />
            )}
          </Card>
        )}
        {shown.includes("Approvals") && (
          <Card>
            <PanelHeading
              title="Activation approvals"
              subtitle={preview ? "Complete all six checks before activation" : "Six checks and simulated verification are required first"}
              action="Review queue"
              onAction={() => navigate("Pending Approvals")}
            />
            {approvals.map((a) => (
              <button
                className="role-account-row"
                key={a.id}
                onClick={() => navigate("Pending Approvals")}
              >
                <AccountLogo name={a.name} color={a.color} />
                <span>
                  <strong>{a.name}</strong>
                  <small>
                    {a.checks.filter(Boolean).length}/6 checks ·{" "}
                    {a.verification}
                  </small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
            {!approvals.length && (
              <EmptyState title="No brands awaiting approval" />
            )}
          </Card>
        )}
        {shown.includes("Administration") && (
          <Card>
            <PanelHeading
              title="Administration"
              subtitle="Fixed roles and controlled organization-wide configuration"
            />
            {[
              [
                "Users & Roles",
                preview ? "Manage users and role assignments" : "Manage demo users and predefined role assignments",
              ],
              [
                "Configuration",
                "Shared views, selected fields, and pipeline stages",
              ],
              ["Audit Log", "Critical actions and denied changes"],
            ].map(([p, description]) => (
              <button
                className="role-account-row"
                key={p}
                onClick={() => navigate(p)}
              >
                <span className="tile-icon purple">
                  <ShieldCheck size={18} />
                </span>
                <span>
                  <strong>{p}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          </Card>
        )}
      </div>
      {!shown.length && (
        <EmptyState
          title="Your dashboard is clear"
          description="Choose widgets above or reset the saved view to restore the layout."
        />
      )}
      <div className="role-demo-note">
        <ShieldCheck size={15} />
        <span>
          Demo identities simulate business roles. Module access, record scope and
          workflow checks follow the selected identity. This is not production
          authentication.
        </span>
      </div>
    </>
  );
}

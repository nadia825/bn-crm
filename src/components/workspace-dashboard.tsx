"use client";
import { useProductionPreview } from "./production-preview";
import { DailyActions } from "./daily-actions";
import { todayDate } from "@/lib/dates";
import {
  ArrowRight,
  Building2,
  Users,
  Rocket,
  ShieldCheck,
  Headset,
  ClipboardList,
  CalendarDays,
  GitBranch,
  Store,
  CircleCheck,
  Plus,
  Check,
  type LucideIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useStore } from "@/lib/store";
import {
  affiliateStages,
  dateLabel,
  event,
  managers,
  requirements,
  type Account,
  type WorkItem,
} from "@/lib/data";
import {
  scopedAccounts,
  scopedItems,
  openCase,
  openWork,
  WORKSPACES,
  type WorkspaceId,
} from "@/lib/workspaces";
import { Button } from "./ui/button";
import { Badge, Card } from "./ui/primitives";
import {
  AccountLogo,
  Avatar,
  EmptyState,
  PanelHeading,
  SectionTitle,
} from "./shared";
import { toast } from "sonner";

type Props = {
  workspace: WorkspaceId;
  navigate: (page: string) => void;
  openAccount: (a: Account) => void;
  openItem: (item: WorkItem, kind: "tasks" | "cases") => void;
  openOnboarding: (a: Account) => void;
  createAccount: () => void;
  createWork: () => void;
  reviewApproval: (a: Account) => void;
};
type Metric = {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  color: string;
  page: string;
};

export function WorkspaceDashboard(props: Props) {
  const { workspace, navigate, createAccount, createWork } = props;
  const preview = useProductionPreview();
  const { data } = useStore((s) => ({ data: s.data }));
  const accounts = scopedAccounts(data, workspace);
  const cases = scopedItems(data, "cases", workspace).filter((c) =>
    openCase(c.status),
  );
  const tasks = scopedItems(data, "tasks", workspace).filter((t) =>
    openWork(t.status),
  );
  const pending = data.accounts.filter(
    (a) => a.type === "Corporate Brand" && a.approval === "Pending approval",
  );
  const live = accounts.filter((a) => a.status === "Active");
  const queue = accounts.filter((a) => a.status === "Onboarding");
  const metrics: Metric[] =
    workspace === "brands"
      ? [
          {
            label: "Corporate brands",
            value: accounts.length,
            detail: `${live.length} active relationships`,
            icon: Building2,
            color: "purple",
            page: "Accounts",
          },
          {
            label: "In onboarding",
            value: queue.length,
            detail: "From profile to launch readiness",
            icon: Rocket,
            color: "blue",
            page: "Brand Onboarding",
          },
          {
            label: "Awaiting Operations",
            value: pending.length,
            detail: "Submitted for activation review",
            icon: ShieldCheck,
            color: "amber",
            page: "Brand Onboarding",
          },
          {
            label: "Open brand cases",
            value: cases.length,
            detail: `${tasks.length} linked tasks also in progress`,
            icon: Headset,
            color: "rose",
            page: "Support Cases",
          },
        ]
      : workspace === "affiliates"
        ? [
            {
              label: "Affiliate network",
              value: accounts.length,
              detail: "Every partner, one relationship",
              icon: Users,
              color: "blue",
              page: "Accounts",
            },
            {
              label: "Live partnerships",
              value: accounts.filter((a) => a.stage === "Live").length,
              detail: "Launched and growing",
              icon: CircleCheck,
              color: "green",
              page: "Affiliate Pipeline",
            },
            {
              label: "Shopify connected",
              value: accounts.filter((a) => a.shopify === "Connected").length,
              detail: preview ? "Store connection recorded" : "Store connection recorded in demo",
              icon: Store,
              color: "purple",
              page: "Affiliate Pipeline",
            },
            {
              label: "Follow-ups due",
              value: accounts.filter(
                (a) =>
                  a.followUp <= todayDate() &&
                  !["Rejected", "Live"].includes(a.stage),
              ).length,
              detail: "Due by today · Account Manager action",
              icon: CalendarDays,
              color: "amber",
              page: "Affiliate Pipeline",
            },
          ]
        : [
            {
              label: "Open operational work",
              value: tasks.length,
              detail: "Across brands, affiliates & provisional suppliers",
              icon: ClipboardList,
              color: "purple",
              page: "Work Board",
            },
            {
              label: "Open support cases",
              value: cases.length,
              detail: `${cases.filter((c) => c.priority === "Urgent").length} urgent cases need attention`,
              icon: Headset,
              color: "rose",
              page: "Support Cases",
            },
            {
              label: "Brand approvals",
              value: pending.length,
              detail: "Verified brands awaiting your review",
              icon: ShieldCheck,
              color: "amber",
              page: "Brand Onboarding",
            },
            {
              label: "My open tasks",
              value: tasks.filter((t) => t.assignee === managers[0]).length,
              detail: `Assigned to ${managers[0]}`,
              icon: CalendarDays,
              color: "blue",
              page: "Tasks",
            },
          ];
  return (
    <>
      <SectionTitle
        title={`${WORKSPACES[workspace].name} dashboard`}
        subtitle={
          {
            brands:
              "Nurture brand relationships and bring every launch closer.",
            affiliates:
              "Grow your partner network, one clear next step at a time.",
            operations:
              "Resolve requests, balance the workload, and keep the business moving.",
          }[workspace]
        }
      >
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              workspace === "brands"
                ? "Brand Onboarding"
                : workspace === "affiliates"
                  ? "Affiliate Pipeline"
                  : "Support Cases",
            )
          }
        >
          {workspace === "brands"
            ? "Review onboarding"
            : workspace === "affiliates"
              ? "Open pipeline"
              : "Open support"}
          <ArrowRight size={14} />
        </Button>
        <Button
          onClick={workspace === "operations" ? createWork : createAccount}
        >
          <Plus size={15} />
          {workspace === "brands"
            ? "New brand"
            : workspace === "affiliates"
              ? "New affiliate"
              : "New work request"}
        </Button>
      </SectionTitle>
      <DailyActions workspace={workspace} openAccount={props.openAccount} openItem={props.openItem} reviewApproval={props.reviewApproval} />
      <div className={`workspace-context-bar ${workspace}`}>
        <span>
          <i className="live-dot" />
          {WORKSPACES[workspace].name} workspace
        </span>
        <span>
          {workspace === "operations"
            ? "All business records · Team-wide delivery"
            : `${accounts.length} ${workspace === "brands" ? "corporate brands" : "affiliates"} · Scoped relationships and work`}
        </span>
        <span className="context-connected">
          <GitBranch size={13} />
          Connected across Bottle Nexus
        </span>
      </div>
      <div className="metrics-grid">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className="workspace-metric"
            role="button"
            tabIndex={0}
            onClick={() => navigate(m.page)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(m.page);
              }
            }}
          >
            <div className="metric-top">
              <span>{m.label}</span>
              <span className={`metric-icon ${m.color}`}>
                <m.icon size={17} />
              </span>
            </div>
            <strong>{m.value}</strong>
            <div className="workspace-metric-foot">
              <span>{m.detail}</span>
              <ArrowRight size={13} />
            </div>
          </Card>
        ))}
      </div>
      {workspace === "brands" ? (
        <BrandHome {...props} queue={queue} />
      ) : workspace === "affiliates" ? (
        <AffiliateHome {...props} accounts={accounts} />
      ) : (
        <OperationsHome {...props} tasks={tasks} pending={pending} />
      )}
      <div className="workspace-dashboard-grid">
        <TaskPanel tasks={tasks} {...props} />
        <CasePanel cases={cases} {...props} />
      </div>
      <div className="connected-records-note">
        <GitBranch size={14} />
        <span>
          One connected CRM. Tasks, cases, and account updates are shared with
          Operations and Company overview.
        </span>
        <button onClick={() => navigate("Company Overview")}>
          Company overview
          <ArrowRight size={13} />
        </button>
      </div>
    </>
  );
}

function BrandHome({
  queue,
  openOnboarding,
  openAccount,
  navigate,
}: Props & { queue: Account[] }) {
  return (
    <div className="workspace-dashboard-grid main-panels">
      <Card>
        <PanelHeading
          title="Brand launch readiness"
          subtitle="The six required checks, from setup to activation"
          action="All onboarding"
          onAction={() => navigate("Brand Onboarding")}
        />
        <div className="launch-readiness-list">
          {[...queue]
            .sort(
              (a, b) =>
                b.checks.filter(Boolean).length -
                a.checks.filter(Boolean).length,
            )
            .slice(0, 5)
            .map((a) => (
              <div className="launch-readiness-row" key={a.id}>
                <button className="identity" onClick={() => openAccount(a)}>
                  <AccountLogo name={a.name} color={a.color} />
                  <span>
                    <strong>{a.name}</strong>
                    <small>{a.manager}</small>
                  </span>
                </button>
                <div className="launch-progress">
                  <span>{a.checks.filter(Boolean).length}/6 checks</span>
                  <div className="progress">
                    <span
                      style={{
                        width: `${(a.checks.filter(Boolean).length / 6) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <Badge>
                  {a.approval === "Pending approval"
                    ? "In review"
                    : a.verification === "Verified"
                      ? "Verified"
                      : "Onboarding"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openOnboarding(a)}
                >
                  Review
                  <ArrowRight size={13} />
                </Button>
              </div>
            ))}
          {!queue.length && (
            <EmptyState
              title="Every brand is ready"
              description="New brands will appear here when they enter onboarding."
            />
          )}
        </div>
      </Card>
      <Card>
        <PanelHeading
          title="Setup coverage"
          subtitle="Completed requirements across brands in onboarding"
        />
        <div className="setup-coverage">
          {requirements.map((r, i) => {
            const done = queue.filter((a) => a.checks[i]).length;
            return (
              <div key={r}>
                <span>
                  {
                    [
                      "Company profile",
                      "Users & permissions",
                      "Product catalog",
                      "Billing & Stripe",
                      "Checkout configuration",
                      "Shipping & distributors",
                    ][i]
                  }
                </span>
                <strong>
                  {done}
                  <small> / {queue.length}</small>
                </strong>
                <div className="progress">
                  <span
                    style={{
                      width: `${queue.length ? (done / queue.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="workspace-card-foot demo-only">
          <ShieldCheck size={13} />
          Verification and activation are simulated
        </div>
      </Card>
    </div>
  );
}

function AffiliateHome({
  accounts,
  navigate,
  openAccount,
}: Props & { accounts: Account[] }) {
  const followUps = accounts
    .filter((a) => !["Rejected", "Live"].includes(a.stage))
    .sort((a, b) => a.followUp.localeCompare(b.followUp))
    .slice(0, 4);
  return (
    <div className="workspace-dashboard-grid main-panels">
      <Card>
        <PanelHeading
          title="Acquisition pipeline"
          subtitle="From first introduction to a live partnership"
          action="View board"
          onAction={() => navigate("Affiliate Pipeline")}
        />
        <div className="affiliate-stage-list">
          {affiliateStages.slice(0, 7).map((stage, i) => {
            const count = accounts.filter((a) => a.stage === stage).length;
            return (
              <button
                key={stage}
                onClick={() => navigate("Affiliate Pipeline")}
              >
                <span className="stage-name">
                  <i
                    style={{
                      background: [
                        "#cbc1df",
                        "#b39bdb",
                        "#9ab5db",
                        "#d5b77c",
                        "#aa8bd6",
                        "#8f75ca",
                        "#77b49a",
                      ][i],
                    }}
                  />
                  {stage}
                </span>
                <div className="progress">
                  <span
                    style={{
                      width: `${(count / Math.max(1, ...affiliateStages.map((s) => accounts.filter((a) => a.stage === s).length))) * 100}%`,
                    }}
                  />
                </div>
                <strong>{count}</strong>
                <ArrowRight size={12} />
              </button>
            );
          })}
        </div>
        <div className="workspace-card-foot">
          <span>
            {accounts.filter((a) => a.stage === "On Hold").length} on hold
          </span>
          <span>·</span>
          <span>
            {accounts.filter((a) => a.stage === "Rejected").length} rejected
          </span>
          <span className="subtle">Alternative states</span>
        </div>
      </Card>
      <Card>
        <PanelHeading
          title="Next partner follow-ups"
          subtitle="Help your Account Managers keep conversations moving"
          action="All affiliates"
          onAction={() => navigate("Accounts")}
        />
        <div className="follow-up-list">
          {followUps.map((a) => (
            <button key={a.id} onClick={() => openAccount(a)}>
              <div className="identity">
                <AccountLogo name={a.name} color={a.color} size={32} />
                <span>
                  <strong>{a.name}</strong>
                  <small>{a.stage}</small>
                </span>
              </div>
              <div>
                <Avatar name={a.manager} size={23} />
                <span>
                  <CalendarDays size={11} />
                  {dateLabel(a.followUp)}
                </span>
              </div>
            </button>
          ))}
          {!followUps.length && <EmptyState title="No follow-ups waiting" />}
        </div>
        <div className="workspace-card-foot">
          Affiliate launch requirements remain under discovery.
        </div>
      </Card>
    </div>
  );
}

function OperationsHome({
  tasks,
  pending,
  navigate,
  openOnboarding,
}: Props & { tasks: WorkItem[]; pending: Account[] }) {
  const { data } = useStore((s) => ({ data: s.data }));
  const distribution = [
    { name: "New", color: "#b79ae8" },
    { name: "In Progress", color: "#8650d5" },
    { name: "On Hold / Under Review", color: "#e6be70" },
    { name: "Done", color: "#84bfa6" },
    { name: "Aborted", color: "#d9d6e2" },
  ].map((s) => ({
    ...s,
    value: data.tasks.filter((t) => t.status === s.name).length,
  }));
  return (
    <>
      <div className="workspace-dashboard-grid main-panels">
        <Card>
          <PanelHeading
            title="Team workload"
            subtitle="Open operational work by assigned owner"
            action="Work board"
            onAction={() => navigate("Work Board")}
          />
          <div className="team-workload">
            {managers.map((m) => {
              const mine = tasks.filter((t) => t.assignee === m);
              return (
                <button key={m} onClick={() => navigate("Tasks")}>
                  <Avatar name={m} size={33} />
                  <span>
                    <strong>{m}</strong>
                    <small>
                      {
                        mine.filter((t) =>
                          ["Urgent", "High"].includes(t.priority),
                        ).length
                      }{" "}
                      high priority
                    </small>
                  </span>
                  <div className="progress">
                    <span
                      style={{
                        width: `${(mine.length / Math.max(1, ...managers.map((x) => tasks.filter((t) => t.assignee === x).length))) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{mine.length}</strong>
                </button>
              );
            })}
          </div>
          <div className="workspace-card-foot">
            Business operations only · Engineering stays in Jira
          </div>
        </Card>
        <Card>
          <PanelHeading
            title="Operational work distribution"
            subtitle="All work items across the connected CRM"
          />
          <div className="operations-work-chart">
            <div className="donut-wrapper">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    innerRadius={54}
                    outerRadius={73}
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {distribution.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{data.tasks.length}</strong>
                <span>work items</span>
              </div>
            </div>
            <div className="ops-chart-legend">
              {distribution.map((s) => (
                <button key={s.name} onClick={() => navigate("Work Board")}>
                  <i style={{ background: s.color }} />
                  <span>{s.name}</span>
                  <strong>{s.value}</strong>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <Card className="approval-queue-preview">
        <PanelHeading
          title="Brand activation queue"
          subtitle="Verified setup, ready for the final Operations review"
          action="Review queue"
          onAction={() => navigate("Brand Onboarding")}
        />
        {pending.length ? (
          pending.slice(0, 4).map((a) => (
            <div className="launch-readiness-row" key={a.id}>
              <AccountLogo name={a.name} color={a.color} />
              <span className="approval-brand-name">
                <strong>{a.name}</strong>
                <small>
                  {a.manager} · {a.checks.filter(Boolean).length}/6 requirements
                  complete
                </small>
              </span>
              <Badge>{a.verification}</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openOnboarding(a)}
              >
                Review activation
                <ArrowRight size={13} />
              </Button>
            </div>
          ))
        ) : (
          <div className="approval-empty">
            <span className="tile-icon green">
              <CircleCheck size={20} />
            </span>
            <div>
              <strong>No brands awaiting approval</strong>
              <p>
                Brands submitted from the Brands workspace appear here
                automatically.
              </p>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function TaskPanel({
  tasks,
  workspace,
  navigate,
  openItem,
}: Pick<Props, "workspace" | "navigate" | "openItem"> & { tasks: WorkItem[] }) {
  const { data, setData } = useStore((s) => ({ data: s.data, setData: s.setData }));
  const upcoming = [...tasks]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  return (
    <Card>
      <PanelHeading
        title={
          workspace === "operations"
            ? "Next operational tasks"
            : "Upcoming account tasks"
        }
        subtitle={`Open ${WORKSPACES[workspace].name.toLowerCase()} work · Sorted by due date`}
        action="All tasks"
        onAction={() => navigate("Tasks")}
      />
      {upcoming.map((t) => (
        <div className="task-preview workspace-task" key={t.id}>
          <button
            className="check-circle"
            aria-label={`Complete ${t.title}`}
            onClick={async () => {
              if (!(await setData((d) => ({
                ...d,
                tasks: d.tasks.map((x) =>
                  x.id === t.id
                    ? {
                        ...x,
                        status: "Done",
                        history: [event("Marked task complete."), ...x.history],
                      }
                    : x,
                ),
              })))) return;
              toast.success("Task completed across connected views");
            }}
          >
            <Check size={13} />
          </button>
          <button
            className="task-preview-text"
            onClick={() => openItem(t, "tasks")}
          >
            <strong>{t.title}</strong>
            <span>
              {data.accounts.find((a) => a.id === t.accountId)?.name} · {t.id}
            </span>
          </button>
          <div className="task-preview-right">
            <Badge>{t.priority}</Badge>
            <small>{dateLabel(t.due)}</small>
          </div>
        </div>
      ))}
      {!upcoming.length && (
        <EmptyState
          title="No open tasks"
          description="New requests linked to these accounts will appear here."
        />
      )}
    </Card>
  );
}
function CasePanel({
  cases,
  navigate,
  openItem,
}: Pick<Props, "navigate" | "openItem"> & { cases: WorkItem[] }) {
  const { data } = useStore((s) => ({ data: s.data }));
  const priority = ["Urgent", "High", "Medium", "Low"];
  return (
    <Card>
      <PanelHeading
        title="Cases needing attention"
        subtitle="Shared with Operations and the related account profile"
        action="All cases"
        onAction={() => navigate("Support Cases")}
      />
      {[...cases]
        .sort(
          (a, b) => priority.indexOf(a.priority) - priority.indexOf(b.priority),
        )
        .slice(0, 4)
        .map((c) => (
          <button
            className="case-preview workspace-case"
            key={c.id}
            onClick={() => openItem(c, "cases")}
          >
            <span className="case-alert">
              <Headset size={17} />
            </span>
            <span>
              <strong>{c.title}</strong>
              <small>
                {c.id} · {data.accounts.find((a) => a.id === c.accountId)?.name}
              </small>
            </span>
            <Badge>{c.priority}</Badge>
            <ArrowRight size={13} />
          </button>
        ))}
      {!cases.length && (
        <EmptyState
          title="All caught up"
          description="No open support cases for this workspace."
        />
      )}
    </Card>
  );
}

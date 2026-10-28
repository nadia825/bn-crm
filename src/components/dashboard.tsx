"use client";
import {
  Building2,
  Users,
  ClipboardList,
  Headset,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  Circle,
  Check,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useStore } from "@/lib/store";
import {
  affiliateStages,
  dateLabel,
  event,
  type Account,
  type WorkItem,
} from "@/lib/data";
import { Card, Badge, Select } from "./ui/primitives";
import { Button } from "./ui/button";
import {
  AccountLogo,
  Avatar,
  MetricDelta,
  PanelHeading,
  SectionTitle,
} from "./shared";
import { useState } from "react";
import { toast } from "sonner";
type Props = {
  navigate: (s: string) => void;
  openAccount: (a: Account) => void;
  openItem: (i: WorkItem, kind: "tasks" | "cases") => void;
  newWork: () => void;
};
export function Dashboard({ navigate, openAccount, openItem, newWork }: Props) {
  const { data, setData } = useStore();
  const range = "Current snapshot";
  const brands = data.accounts.filter((a) => a.type === "Corporate Brand"),
    affiliates = data.accounts.filter((a) => a.type === "Affiliate"),
    openTasks = data.tasks.filter(
      (t) => !["Done", "Aborted"].includes(t.status),
    ),
    openCases = data.cases.filter(
      (c) => !["Resolved", "Closed"].includes(c.status),
    );
  const metrics = [
    {
      label: "Corporate brands",
      value: brands.length,
      detail: `${brands.filter((a) => a.status === "Active").length} active brands`,
      icon: Building2,
      color: "purple",
      delta: "3 this month",
      nav: "Accounts",
    },
    {
      label: "Total affiliates",
      value: affiliates.length,
      detail: `${affiliates.filter((a) => a.status === "Active").length} live & growing`,
      icon: Users,
      color: "blue",
      delta: "7 this month",
      nav: "Affiliate Pipeline",
    },
    {
      label: "Open work items",
      value: openTasks.length,
      detail: `${openTasks.filter((t) => t.priority === "High" || t.priority === "Urgent").length} need attention`,
      icon: ClipboardList,
      color: "amber",
      delta: "View work board",
      nav: "Work Board",
    },
    {
      label: "Open support cases",
      value: openCases.length,
      detail: `${openCases.filter((c) => c.priority === "Urgent").length} urgent cases`,
      icon: Headset,
      color: "rose",
      delta: "View support",
      nav: "Support Cases",
    },
  ];
  const ops = [
    {
      name: "New",
      value: data.tasks.filter((t) => t.status === "New").length,
      color: "#ad8cfa",
    },
    {
      name: "In progress",
      value: data.tasks.filter((t) => t.status === "In Progress").length,
      color: "#7c4de0",
    },
    {
      name: "Under review",
      value: data.tasks.filter((t) => t.status.startsWith("On Hold")).length,
      color: "#f6c465",
    },
    {
      name: "Completed",
      value: data.tasks.filter((t) => t.status === "Done").length,
      color: "#8ac8b1",
    },
    {
      name: "Aborted",
      value: data.tasks.filter((t) => t.status === "Aborted").length,
      color: "#e4e5eb",
    },
  ];
  const activities = [
    ...data.accounts.flatMap((a) =>
      a.history.map((h) => ({ ...h, account: a })),
    ),
    ...data.tasks.flatMap((t) =>
      t.history.map((h) => ({
        ...h,
        account: data.accounts.find((a) => a.id === t.accountId)!,
      })),
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);
  const upcoming = [...openTasks]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);
  return (
    <>
      <SectionTitle
        title="Your business, at a glance"
        subtitle="Welcome back, Olivia. Here’s what’s happening at Bottle Nexus."
      >
        <div className="date-filter snapshot-date">
          <CalendarDays size={15} />
          <span>Oct 28, 2026</span>
        </div>
        <Button onClick={newWork}>
          <span className="plus">+</span>New work request
        </Button>
      </SectionTitle>
      <div className="overview-tabs">
        <button className="active">Overview</button>
        <button onClick={() => navigate("Reports")}>
          Performance
          <ArrowUpRight size={13} />
        </button>
        <span>
          <span className="live-dot" />
          Workspace overview · Oct 28, 2026
        </span>
      </div>
      <div className="metrics-grid">
        {metrics.map((m, i) => (
          <Card
            key={m.label}
            className="metric-card"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(m.nav);
              }
            }}
            onClick={() => navigate(m.nav)}
          >
            <div className="metric-top">
              <span>{m.label}</span>
              <span className={`metric-icon ${m.color}`}>
                <m.icon size={17} />
              </span>
            </div>
            <div className="metric-value">
              {m.value}
              <svg
                width="90"
                height="35"
                viewBox="0 0 90 35"
                aria-hidden="true"
              >
                <path
                  d={
                    i % 2
                      ? "M1 29L13 24L24 28L37 17L47 20L59 11L70 14L88 3"
                      : "M1 28L14 25L25 29L36 20L48 22L61 13L73 16L88 5"
                  }
                  fill="none"
                  stroke={["#9267e8", "#77a6df", "#eab968", "#de8c9f"][i]}
                  strokeWidth="2"
                />
                <path d="M1 32H89" stroke="#f2f1f6" />
              </svg>
            </div>
            <div className="metric-bottom">
              <span>{m.detail}</span>
              <span className={i < 2 ? "delta" : "metric-link"}>
                {i < 2 ? (
                  <>
                    <ArrowUpRight size={12} />
                    {m.delta}
                  </>
                ) : (
                  <ArrowUpRight size={15} />
                )}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <div className="workspace-pulse">
        <span className="pulse-label">
          <Sparkles size={15} />
          In your workspace
        </span>
        <button onClick={() => navigate("Affiliate Pipeline")}>
          <i className="dot green-dot" />
          <strong>
            {affiliates.filter((a) => a.status === "Active").length}
          </strong>
          active affiliates
          <ArrowRight size={13} />
        </button>
        <button onClick={() => navigate("Supplier Pipeline")}>
          <i className="dot blue-dot" />
          <strong>
            {
              data.accounts.filter(
                (a) => a.type === "Supplier" && a.status === "Active",
              ).length
            }
          </strong>
          active suppliers
          <ArrowRight size={13} />
        </button>
        <button onClick={() => navigate("Brand Onboarding")}>
          <i className="dot purple-dot" />
          <strong>
            {brands.filter((a) => a.status === "Onboarding").length}
          </strong>
          brands in onboarding
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="dashboard-charts">
        <Card className="pipeline-panel">
          <PanelHeading
            title="Affiliate pipeline"
            subtitle="From first conversation to a successful launch"
            action="View pipeline"
            onAction={() => navigate("Affiliate Pipeline")}
          />
          <div className="pipeline-summary">
            <strong>
              {affiliates.filter((a) => a.stage !== "Rejected").length}
              <span>affiliates in your network</span>
            </strong>
            <span className="soft-tag">
              <span className="live-dot" />
              {affiliates.filter((a) => a.stage === "Live").length} live
              partnerships
            </span>
          </div>
          <div className="pipeline-visual">
            {affiliateStages.slice(0, 7).map((stage, i) => {
              const count = affiliates.filter((a) => a.stage === stage).length;
              return (
                <button
                  key={stage}
                  onClick={() => navigate("Affiliate Pipeline")}
                  className="pipeline-bar-col"
                >
                  <span className="bar-number">{count}</span>
                  <div
                    className="pipeline-bar"
                    style={{
                      height: 28 + count * 11,
                      background: [
                        "#eae4f8",
                        "#dcd0f3",
                        "#c7b0ed",
                        "#b18ee7",
                        "#9c72df",
                        "#8758d5",
                        "#7041c6",
                      ][i],
                    }}
                  />
                  <span className="bar-label">
                    {
                      [
                        "Old leads",
                        "New",
                        "Contacted",
                        "Negotiation",
                        "Contract signed",
                        "Shop ready",
                        "Live",
                      ][i]
                    }
                  </span>
                </button>
              );
            })}
          </div>
          <div className="chart-foot">
            <span>
              <span className="dot purple-dot" />
              Affiliate acquisition
            </span>
            <span>
              {range} <span className="subtle">· Live mock records</span>
            </span>
          </div>
        </Card>
        <Card className="operations-panel">
          <PanelHeading
            title="Operational work"
            subtitle="A balanced view of your team’s workload"
            action=""
          />
          <div className="donut-wrapper">
            <ResponsiveContainer width="100%" height={176}>
              <PieChart>
                <Pie
                  data={ops}
                  innerRadius={58}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={3}
                >
                  {ops.map((o) => (
                    <Cell key={o.name} fill={o.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{data.tasks.length}</strong>
              <span>total work items</span>
            </div>
          </div>
          <div className="donut-legend">
            {ops.map((o) => (
              <button key={o.name} onClick={() => navigate("Work Board")}>
                <span>
                  <i style={{ background: o.color }} />
                  {o.name}
                </span>
                <strong>
                  {o.value}
                  <small>
                    {Math.round((o.value / data.tasks.length) * 100)}%
                  </small>
                </strong>
              </button>
            ))}
          </div>
        </Card>
      </div>
      <div className="dashboard-middle">
        <Card className="upcoming-panel">
          <PanelHeading
            title="Upcoming tasks"
            subtitle="Keep the next steps moving forward"
            action="View all tasks"
            onAction={() => navigate("Tasks")}
          />
          {upcoming.map((t) => (
            <div className="task-preview" key={t.id}>
              <button
                className="check-circle"
                aria-label={`Complete ${t.title}`}
                onClick={() => {
                  setData((d) => ({
                    ...d,
                    tasks: d.tasks.map((x) =>
                      x.id === t.id
                        ? {
                            ...x,
                            status: "Done",
                            history: [
                              event("Marked task complete."),
                              ...x.history,
                            ],
                          }
                        : x,
                    ),
                  }));
                  toast.success("Task completed");
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
                  {data.accounts.find((a) => a.id === t.accountId)?.name}
                  <i /> {t.id}
                </span>
              </button>
              <div className="task-preview-right">
                <Badge>{t.priority}</Badge>
                <small className={t.due < "2026-10-28" ? "overdue" : ""}>
                  {t.due < "2026-10-28" ? "Yesterday" : dateLabel(t.due)}
                </small>
              </div>
              <Avatar name={t.assignee} size={27} />
            </div>
          ))}
        </Card>
        <Card className="activity-panel">
          <PanelHeading
            title="Recent activity"
            action="All activity"
            onAction={() => navigate("Reports")}
          />
          <div className="timeline">
            {activities.map((a, i) => (
              <div className="timeline-item" key={a.id + i}>
                <span
                  className={`timeline-icon ${["purple", "green", "blue", "amber"][i]}`}
                >
                  {i === 0 ? (
                    <Users size={14} />
                  ) : i === 1 ? (
                    <CircleCheck size={14} />
                  ) : i === 2 ? (
                    <ClipboardList size={14} />
                  ) : (
                    <Building2 size={14} />
                  )}
                </span>
                <div>
                  <p>
                    <strong>{a.author.split(" ")[0]}</strong> {a.text}
                  </p>
                  <button onClick={() => openAccount(a.account)}>
                    {a.account?.name}
                  </button>
                  <small>{i === 0 ? "Just now" : `${i * 35} min ago`}</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="dashboard-bottom">
        <Card>
          <PanelHeading
            title="Recent accounts"
            action="All accounts"
            onAction={() => navigate("Accounts")}
          />
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.slice(0, 4).map((a) => (
                  <tr key={a.id} onClick={() => openAccount(a)}>
                    <td>
                      <div className="identity">
                        <AccountLogo name={a.name} color={a.color} size={30} />
                        <strong>{a.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="muted">{a.type}</span>
                    </td>
                    <td>
                      <Avatar name={a.manager} size={24} />
                    </td>
                    <td>
                      <Badge>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <PanelHeading
            title="Cases needing attention"
            action="View support"
            onAction={() => navigate("Support Cases")}
          />
          {openCases
            .filter((c) => ["High", "Urgent"].includes(c.priority))
            .slice(0, 3)
            .map((c) => (
              <button
                className="case-preview"
                key={c.id}
                onClick={() => openItem(c, "cases")}
              >
                <span className="case-alert">
                  <Headset size={17} />
                </span>
                <span>
                  <strong>{c.title}</strong>
                  <small>
                    {c.id} ·{" "}
                    {data.accounts.find((a) => a.id === c.accountId)?.name}
                  </small>
                </span>
                <Badge>{c.priority}</Badge>
                <ChevronDown className="rotate-left" size={15} />
              </button>
            ))}
        </Card>
      </div>
      <div className="page-foot">
        <span>
          <span className="brand-mini">bn</span> A little more connected. A lot
          more possible.
        </span>
        <span>BN CRM v0 · Fictional demo data</span>
      </div>
    </>
  );
}
export function GrowthChart({ through = "Oct" }: { through?: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={[
          { month: "May", brands: 9, affiliates: 13 },
          { month: "Jun", brands: 11, affiliates: 17 },
          { month: "Jul", brands: 13, affiliates: 20 },
          { month: "Aug", brands: 15, affiliates: 25 },
          { month: "Sep", brands: 17, affiliates: 28 },
          { month: "Oct", brands: 20, affiliates: 35 },
        ].slice(0, ["May", "Jun", "Jul", "Aug", "Sep", "Oct"].indexOf(through) + 1)}
      >
        <defs>
          <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f0edf4" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          fontSize={12}
        />
        <YAxis axisLine={false} tickLine={false} fontSize={12} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="affiliates"
          stroke="#8250d6"
          fill="url(#growth)"
          strokeWidth={3}
        />
        <Area
          type="monotone"
          dataKey="brands"
          stroke="#9dbacb"
          fill="transparent"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  GitBranch,
  Truck,
  Rocket,
  Columns3,
  Headset,
  ListTodo,
  Cylinder,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Search,
  Bell,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronDown,
  Check,
  ShieldCheck,
  CreditCard,
  CalendarDays,
  Plus,
  HelpCircle,
  ArrowUpRight,
  Command,
  CheckCheck,
  Sparkles,
  X,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { StoreProvider, useStore } from "@/lib/store";
import { type Account, type WorkItem } from "@/lib/data";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge, Input, Card } from "./ui/primitives";
import { Avatar, AccountLogo, EmptyState } from "./shared";
import { Dashboard } from "./dashboard";
import { WorkspaceDashboard } from "./workspace-dashboard";
import { RoleDashboard } from "./role-dashboard";
import {
  UsersRoles,
  Configuration,
  AuditLog,
  Finance,
  Activities,
  Retailers,
  TeamAssignments,
} from "./mock-pages";
import {
  canPage,
  defaultWorkspace,
  allowedWorkspaces,
  roleDescriptions,
} from "@/lib/access";
import {
  WORKSPACES,
  navigationFor,
  scopedItems,
  isWorkspace,
  parseRoute,
  routeHash,
  workspaceForPage,
  isSharedPage,
  type WorkspaceId,
  type WorkspaceRoute,
} from "@/lib/workspaces";
import { Accounts, AccountProfile } from "./accounts";
import { Pipeline, WorkBoard, WorkDetail } from "./boards";
import { EditorDialog, type Editor } from "./forms";
import { Onboarding } from "./onboarding";
import { Barrels, Contacts, Reports, Settings } from "./secondary";
const pageIcons: Record<string, typeof Building2> = {
  Dashboard: LayoutDashboard,
  Accounts: Building2,
  Contacts: Users,
  "Affiliate Pipeline": GitBranch,
  "Supplier Pipeline": Truck,
  "Brand Onboarding": Rocket,
  "Work Board": Columns3,
  "Support Cases": Headset,
  Tasks: ListTodo,
  "Barrel Management": Cylinder,
  Reports: ChartNoAxesCombined,
  Settings: SettingsIcon,
  "Company Overview": Building2,
  "All Accounts": Building2,
  Activities: CalendarDays,
  "Follow-ups": CalendarDays,
  "Pending Approvals": ShieldCheck,
  "Users & Roles": Users,
  Configuration: SettingsIcon,
  "Audit Log": ShieldCheck,
  Billing: CreditCard,
  "Payment Follow-ups": CreditCard,
  "Finance Reports": ChartNoAxesCombined,
  Retailers: Building2,
  "Team Assignments": Users,
};
const workspaceIcons = {
  brands: Building2,
  affiliates: Users,
  operations: Columns3,
};
const NAVIGATION_KEY = "bn-crm-navigation";
export function CRM() {
  return (
    <StoreProvider>
      <Workspace />
      <Toaster richColors position="bottom-right" closeButton />
    </StoreProvider>
  );
}
function Workspace() {
  const { data, setData, ready, actor, demoUsers, switchDemoUser, can } =
    useStore();
  const [profile, setProfile] = useState(false);
  const workspaceChoices = allowedWorkspaces(actor);
  const [route, setRoute] = useState<WorkspaceRoute>({
    workspace: "brands",
    page: "Dashboard",
  });
  const { workspace, page } = route;
  const workspaceInfo = WORKSPACES[workspace];
  const WorkspaceIcon = workspaceIcons[workspace];
  const nav = navigationFor(workspace)
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => canPage(actor, i.page, data))
        .map((i) => ({
          name: i.page,
          label:
            i.page === "All Accounts"
              ? actor.roles.includes("Account Manager") &&
                !actor.roles.includes("System Admin") &&
                !actor.roles.includes("Sales Manager")
                ? "My accounts"
                : actor.roles.includes("Viewer")
                  ? "Accessible accounts"
                  : i.label
              : i.page === "Work Board" &&
                  actor.roles.includes("Operations Member") &&
                  !actor.roles.includes("System Admin") &&
                  !actor.roles.includes("Operations Manager")
                ? "Assigned work"
                : i.page === "Tasks" &&
                    actor.roles.some((r) =>
                      ["Account Manager", "Operations Member"].includes(r),
                    ) &&
                    !actor.roles.some((r) =>
                      ["System Admin", "Operations Manager"].includes(r),
                    )
                  ? "My tasks"
                  : i.label,
          icon: pageIcons[i.page] || Building2,
        })),
    }))
    .filter((g) => g.items.length);
  const [onboardingId, setOnboardingId] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    id: string;
    kind: "tasks" | "cases";
  } | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!switcher) return;
    const outside = (e: PointerEvent) => {
      if (!switcherRef.current?.contains(e.target as Node)) setSwitcher(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSwitcher(false);
        switcherRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [switcher]);
  useEffect(() => {
    const sync = () => {
      let preferred: WorkspaceId = "brands";
      try {
        const saved = localStorage.getItem(NAVIGATION_KEY);
        if (isWorkspace(saved)) preferred = saved;
      } catch {}
      const next = parseRoute(window.location.hash, preferred);
      setRoute(next);
      try {
        localStorage.setItem(NAVIGATION_KEY, next.workspace);
      } catch {}
    };
    sync();
    window.addEventListener("hashchange", sync);
    try {
      setCollapsed(localStorage.getItem("bn-sidebar-collapsed") === "true");
    } catch {}
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const navigate = (s: string, preferred: WorkspaceId = workspace) => {
    const target = workspaceForPage(s, preferred);
    const next = { workspace: target, page: s };
    setRoute(next);
    try {
      localStorage.setItem(NAVIGATION_KEY, target);
    } catch {}
    window.location.hash = routeHash(next);
    setMobileOpen(false);
    setSwitcher(false);
    window.scrollTo({ top: 0 });
  };
  const switchWorkspace = (id: WorkspaceId) => {
    setAccountId(null);
    setSelected(null);
    setEditor(null);
    setSearch(false);
    navigate("Dashboard", id);
  };
  const openOnboarding = (a: Account) => {
    setOnboardingId(a.id);
    navigate("Brand Onboarding");
  };
  const reviewInOperations = (a: Account) => {
    setOnboardingId(a.id);
    navigate("Pending Approvals", "operations");
  };
  const openAccount = (a: Account) => {
    if (a && can("accounts.read", a)) {
      setSelected(null);
      setAccountId(a.id);
      setSearch(false);
    }
  };
  const openItem = (i: WorkItem, kind: "tasks" | "cases") => {
    if (!can(kind === "tasks" ? "tasks.read" : "cases.read", i)) {
      toast.error("This record is outside your demo role scope.");
      return;
    }
    setAccountId(null);
    setSelected({ id: i.id, kind });
    setSearch(false);
    setNotifications(false);
  };
  const newWork = () =>
    setEditor({
      type: "tasks",
      accountScope: isSharedPage(page) ? undefined : workspaceInfo.accountType,
    });
  const newAccount = () =>
    setEditor({
      type: "account",
      accountType: workspaceInfo.accountType || "Corporate Brand",
      lockType: !!workspaceInfo.accountType,
    });
  const group = nav.find((n) => n.items.some((i) => i.name === page))?.section;
  const previewRole = (id: string) => {
    const user = demoUsers.find((u) => u.id === id && u.active);
    if (!user) return;
    switchDemoUser(id);
    setAccountId(null);
    setSelected(null);
    setEditor(null);
    setSearch(false);
    setProfile(false);
    navigate(
      user.roles.includes("System Admin") ? "Company Overview" : "Dashboard",
      defaultWorkspace(user),
    );
  };
  useEffect(() => {
    if (!ready) return;
    setAccountId(null);
    setSelected(null);
    setEditor(null);
    if (
      (!window.location.hash && actor.roles.includes("System Admin")) ||
      !workspaceChoices.includes(workspace) ||
      !canPage(actor, page, data)
    )
      navigate(
        actor.roles.includes("System Admin") ? "Company Overview" : "Dashboard",
        defaultWorkspace(actor),
      );
  }, [actor.id, actor.roles.join("|"), ready]);
  const pageAllowed =
    ready &&
    actor.active &&
    workspaceChoices.includes(workspace) &&
    canPage(actor, page, data);
  const pending = scopedItems(data, "cases", workspace).filter(
    (c) => !["Closed", "Resolved"].includes(c.status),
  );
  const matches = data.accounts
    .filter((a) =>
      `${a.name} ${a.email}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 5);
  const itemMatches = [
    ...data.tasks.map((t) => ({ ...t, kind: "tasks" as const })),
    ...data.cases.map((t) => ({ ...t, kind: "cases" as const })),
  ]
    .filter((t) =>
      `${t.id} ${t.title}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 4);
  if (!ready)
    return (
      <div className="app-loading">
        <span className="brand-mark">bn</span>
        <strong>Opening your mock workspace…</strong>
      </div>
    );
  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-nav-open" : ""}`}
    >
      <aside
        className="sidebar"
        aria-label={`${workspaceInfo.name} workspace navigation`}
      >
        <div className="brand">
          <span className="brand-mark">
            bn
            <span />
          </span>
          {!collapsed && (
            <>
              <strong>
                BN <span>CRM</span>
              </strong>
              <span className="version">v0</span>
            </>
          )}
          <button
            className="sidebar-toggle"
            aria-label="Toggle sidebar"
            onClick={() => {
              setCollapsed(!collapsed);
              localStorage.setItem("bn-sidebar-collapsed", String(!collapsed));
            }}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </button>
        </div>
        <div className="workspace-picker-wrap" ref={switcherRef}>
          <button
            className="workspace-picker"
            onClick={() => setSwitcher(!switcher)}
            aria-expanded={switcher}
            aria-label="Switch workspace"
            aria-controls={switcher ? "workspace-switcher" : undefined}
          >
            <span
              className={`workspace-selected-symbol ${workspaceInfo.color}`}
            >
              <WorkspaceIcon size={20} />
            </span>
            {!collapsed && (
              <>
                <span>
                  <strong>{workspaceInfo.name}</strong>
                  <small>{data.workspace}</small>
                </span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
          {switcher && (
            <div
              className="workspace-menu workspace-switcher-menu"
              id="workspace-switcher"
            >
              <small>WORKSPACES</small>
              {workspaceChoices.map((id) => {
                const info = WORKSPACES[id];
                const Icon = workspaceIcons[id];
                return (
                  <button
                    key={id}
                    onClick={() => switchWorkspace(id)}
                    aria-label={`${info.name} workspace`}
                    aria-pressed={workspace === id}
                  >
                    <span className={`workspace-option-icon ${info.color}`}>
                      <Icon size={17} />
                    </span>
                    <span className="workspace-option-copy">
                      <strong>{info.name}</strong>
                      <small>{info.description}</small>
                    </span>
                    {workspace === id ? (
                      <Check size={15} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </button>
                );
              })}
              <p>
                <GitBranch size={12} />
                Shared records. Connected teams.
              </p>
            </div>
          )}
        </div>
        <button
          className="sidebar-search"
          aria-label="Search all workspaces"
          onClick={() => setSearch(true)}
        >
          <Search size={15} />
          {!collapsed && (
            <>
              <span>Quick search</span>
              <kbd>⌘ K</kbd>
            </>
          )}
        </button>
        <nav>
          {nav.map((g) => (
            <div className="nav-group" key={g.section}>
              {!collapsed && (
                <div className="nav-section-label">{g.section}</div>
              )}
              {g.items.map((n) => (
                <button
                  key={n.name}
                  title={collapsed ? n.label : undefined}
                  className={`nav-item ${page === n.name ? "active" : ""}`}
                  aria-current={page === n.name ? "page" : undefined}
                  onClick={() => navigate(n.name)}
                >
                  <n.icon size={17} strokeWidth={1.75} />
                  {!collapsed && (
                    <>
                      <span>{n.label}</span>
                      {n.name === "Support Cases" && (
                        <small>{pending.length}</small>
                      )}
                      {n.name === "Brand Onboarding" && (
                        <i className="nav-dot" />
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="workspace-tip">
              <span className="tip-icon">
                <Sparkles size={17} />
              </span>
              <strong>Three workspaces. One shared CRM.</strong>
              <p>Switch focus. Keep every relationship connected.</p>
              <button onClick={() => setHelp(true)}>
                Explore your workspace
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          <button className="help-button" onClick={() => setHelp(true)}>
            <HelpCircle size={17} />
            {!collapsed && (
              <>
                Help & getting started
                <ArrowUpRight size={13} />
              </>
            )}
          </button>
          <button className="user-profile" onClick={() => setProfile(true)}>
            <Avatar name={actor.name} color="purple" size={34} />
            {!collapsed && (
              <>
                <span>
                  <strong>{actor.name}</strong>
                  <small>{actor.roles.join(" + ")}</small>
                </span>
                <ChevronsUpDown size={14} />
              </>
            )}
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <PanelLeftOpen size={18} />
            </button>
            <span className="breadcrumb-workspace">
              {isSharedPage(page) ? data.workspace : workspaceInfo.name}
            </span>
            <ChevronRight size={13} />
            <span>{group}</span>
            <ChevronRight size={13} />
            <strong>
              {nav.flatMap((g) => g.items).find((i) => i.name === page)
                ?.label || page}
            </strong>
          </div>
          <div className="topbar-actions">
            <div className="demo-role-switcher">
              <ShieldCheck size={17} />
              <label>
                <span>Demo role · Preview only</span>
                <select
                  aria-label="Demo role switcher"
                  value={actor.id}
                  onChange={(e) => previewRole(e.target.value)}
                >
                  {demoUsers
                    .filter((u) => u.active)
                    .map((u) => (
                      <option value={u.id} key={u.id}>
                        {u.roles.join(" + ")} — {u.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <span className="demo-indicator">
              <span />
              Demo workspace
            </span>
            <button
              className="top-search"
              aria-label="Global search"
              onClick={() => setSearch(true)}
            >
              <Search size={17} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="top-divider" />
            <button
              className="notification-button"
              aria-label="Notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {!data.notificationsRead && <i />}
            </button>
            <button
              className="top-avatar"
              aria-label="Open profile settings"
              onClick={() => setProfile(true)}
            >
              <Avatar name={actor.name} size={31} color="purple" />
            </button>
          </div>
        </header>
        <main key={`${actor.id}:${workspace}:${page}`} className="main-content">
          <div className="role-session-banner">
            <ShieldCheck size={14} />
            <span>{actor.roles.join(" + ")}</span>
            <small>
              {actor.roles.includes("Viewer") && actor.roles.length === 1
                ? "Read-only designated records"
                : "Role-based record and action checks"}{" "}
              · Browser-local mockup
            </small>
          </div>
          {!pageAllowed ? (
            <Card className="workspace-empty-queue">
              <ShieldCheck size={30} />
              <h2>View unavailable for these demo roles</h2>
              <p>
                Switch the demo role in the header or return to your dashboard.
              </p>
              <Button
                onClick={() => navigate("Dashboard", defaultWorkspace(actor))}
              >
                My dashboard
              </Button>
            </Card>
          ) : (
            <>
              {page === "Dashboard" &&
                !actor.roles.includes("System Admin") && (
                  <RoleDashboard
                    workspace={workspace}
                    navigate={navigate}
                    openAccount={openAccount}
                    openItem={openItem}
                    newWork={newWork}
                    newAccount={newAccount}
                  />
                )}
              {page === "Dashboard" && actor.roles.includes("System Admin") && (
                <WorkspaceDashboard
                  workspace={workspace}
                  navigate={navigate}
                  openAccount={openAccount}
                  openItem={openItem}
                  openOnboarding={openOnboarding}
                  createAccount={newAccount}
                  createWork={newWork}
                />
              )}

              {page === "Company Overview" && (
                <RoleDashboard
                  workspace={workspace}
                  navigate={navigate}
                  openAccount={openAccount}
                  openItem={openItem}
                  newWork={newWork}
                  newAccount={newAccount}
                />
              )}
              {page === "All Accounts" && (
                <Accounts
                  openAccount={openAccount}
                  create={() => setEditor({ type: "account" })}
                />
              )}
              {page === "Users & Roles" && <UsersRoles />}
              {page === "Configuration" && <Configuration />}
              {page === "Audit Log" && <AuditLog />}
              {["Billing", "Payment Follow-ups", "Finance Reports"].includes(
                page,
              ) && (
                <Finance
                  mode={
                    page as "Billing" | "Payment Follow-ups" | "Finance Reports"
                  }
                  openAccount={openAccount}
                />
              )}
              {page === "Activities" && (
                <Activities openAccount={openAccount} />
              )}
              {page === "Follow-ups" && (
                <Activities followups openAccount={openAccount} />
              )}
              {page === "Retailers" && <Retailers openAccount={openAccount} />}
              {page === "Team Assignments" && (
                <TeamAssignments openAccount={openAccount} />
              )}
              {page === "Accounts" && (
                <Accounts
                  openAccount={openAccount}
                  create={newAccount}
                  accountType={workspaceInfo.accountType}
                />
              )}
              {page === "Contacts" && (
                <Contacts openAccount={openAccount} workspace={workspace} />
              )}
              {page === "Affiliate Pipeline" && (
                <Pipeline
                  openAccount={openAccount}
                  create={() =>
                    setEditor({
                      type: "account",
                      accountType: "Affiliate",
                      lockType: true,
                    })
                  }
                />
              )}
              {page === "Supplier Pipeline" && (
                <Pipeline
                  supplier
                  openAccount={openAccount}
                  create={() =>
                    setEditor({
                      type: "account",
                      accountType: "Supplier",
                      lockType: true,
                    })
                  }
                />
              )}
              {page === "Brand Onboarding" && (
                <Onboarding
                  initialId={onboardingId}
                  approvalsOnly={false}
                  onReview={reviewInOperations}
                />
              )}
              {page === "Pending Approvals" && (
                <Onboarding
                  approvalsOnly
                  initialId={onboardingId}
                  onReview={reviewInOperations}
                />
              )}
              {page === "Work Board" && (
                <WorkBoard
                  workspace={workspace}
                  openItem={openItem}
                  create={newWork}
                />
              )}
              {page === "Support Cases" && (
                <WorkBoard
                  workspace={workspace}
                  kind="cases"
                  openItem={openItem}
                  create={() =>
                    setEditor({
                      type: "cases",
                      accountScope: workspaceInfo.accountType,
                    })
                  }
                />
              )}
              {page === "Tasks" && (
                <WorkBoard
                  workspace={workspace}
                  taskView
                  openItem={openItem}
                  create={newWork}
                />
              )}
              {page === "Barrel Management" && (
                <Barrels openAccount={openAccount} />
              )}
              {page === "Reports" && <Reports />}
              {page === "Settings" && <Settings />}
            </>
          )}
        </main>
      </div>
      <AccountProfile
        key={accountId}
        id={accountId}
        onClose={() => setAccountId(null)}
        edit={(a) => setEditor({ type: "account", record: a })}
        openItem={openItem}
        navigate={(page) => {
          if (page === "Brand Onboarding") {
            if (accountId) setOnboardingId(accountId);
            navigate(page, "brands");
          } else navigate(page);
        }}
      />
      <WorkDetail
        key={selected?.id}
        selected={selected}
        onClose={() => setSelected(null)}
        edit={(r, k) => setEditor({ type: k, record: r })}
        openAccount={openAccount}
        openLinkedCase={(c) => openItem(c, "cases")}
      />
      <EditorDialog
        key={editor ? editor.type + (editor.record?.id || "new") : "closed"}
        editor={editor}
        onClose={() => setEditor(null)}
      />
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent className="search-dialog">
          <DialogTitle className="sr-only">Search all workspaces</DialogTitle>
          <DialogDescription className="sr-only">
            Find accounts, tasks, and support cases.
          </DialogDescription>
          <div className="command-input">
            <Search size={20} />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accounts, tasks, cases…"
              aria-label="Search everything"
            />
          </div>
          <div className="command-results">
            <small>ACCOUNTS</small>
            {matches.map((a) => (
              <button key={a.id} onClick={() => openAccount(a)}>
                <AccountLogo name={a.name} color={a.color} size={30} />
                <span>
                  <strong>{a.name}</strong>
                  <small>
                    {a.type} · {a.manager}
                  </small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
            <small>TASKS & CASES</small>
            {itemMatches.map((t) => (
              <button key={t.id} onClick={() => openItem(t, t.kind)}>
                <span className="tile-icon purple">
                  {t.kind === "tasks" ? (
                    <ListTodo size={17} />
                  ) : (
                    <Headset size={17} />
                  )}
                </span>
                <span>
                  <strong>{t.title}</strong>
                  <small>{t.id}</small>
                </span>
                <Badge>{t.status}</Badge>
              </button>
            ))}
            {!matches.length && !itemMatches.length && (
              <EmptyState description="Search by account name, record ID, or title." />
            )}
          </div>
          <div className="command-footer">
            Search across Brands, Affiliates, and Operations <kbd>esc</kbd> to
            close
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={notifications} onOpenChange={setNotifications}>
        <DialogContent className="notifications-dialog">
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            Your workspace needs a little attention.
          </DialogDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setData((d) => ({ ...d, notificationsRead: true }));
              toast.success("All notifications marked read");
            }}
          >
            <CheckCheck size={15} />
            {data.notificationsRead ? "All caught up" : "Mark all as read"}
          </Button>
          {pending
            .filter((c) => ["High", "Urgent"].includes(c.priority))
            .slice(0, 4)
            .map((c) => (
              <button
                className={`notification-row ${data.notificationsRead ? "read" : ""}`}
                key={c.id}
                onClick={() => openItem(c, "cases")}
              >
                <span className="tile-icon rose">
                  <Headset size={18} />
                </span>
                <span>
                  <strong>{c.title}</strong>
                  <small>
                    {c.id} · {c.priority} priority
                  </small>
                </span>
                <ChevronRight size={14} />
              </button>
            ))}
          {data.settings.reminders &&
            scopedItems(data, "tasks", workspace)
              .filter(
                (t) =>
                  t.assignee === actor.name &&
                  !["Done", "Aborted"].includes(t.status),
              )
              .slice(0, 2)
              .map((t) => (
                <button
                  className="notification-row"
                  key={t.id}
                  onClick={() => openItem(t, "tasks")}
                >
                  <span className="tile-icon purple">
                    <ListTodo size={18} />
                  </span>
                  <span>
                    <strong>{t.title}</strong>
                    <small>Follow-up reminder · {t.due}</small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
        </DialogContent>
      </Dialog>
      <Dialog open={profile} onOpenChange={setProfile}>
        <DialogContent>
          <DialogTitle>{actor.name}</DialogTitle>
          <DialogDescription>
            Fictional demo identity · {actor.email}
          </DialogDescription>
          <div className="role-tags">
            {actor.roles.map((r) => (
              <span key={r}>{r}</span>
            ))}
          </div>
          {actor.roles.map((r) => (
            <p className="profile-role-description" key={r}>
              {roleDescriptions[r]}
            </p>
          ))}
          <div className="info-callout">
            Change the demo preview in the header. Role capabilities are
            predefined; only System Admins can assign roles in Users & Roles.
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog">
          <span className="tile-icon purple">
            <BookOpen size={24} />
          </span>
          <DialogTitle>A connected way to work</DialogTitle>
          <DialogDescription>
            Switch between Brands, Affiliates, and Operations. Search and
            account profiles connect the same records across every workspace.
          </DialogDescription>
          <div className="help-steps">
            {[
              [
                "01",
                "Meet your accounts",
                "Search the directory and open a profile to see contacts, work, cases, and notes.",
              ],
              [
                "02",
                "Move your work forward",
                "Drag cards between stages, or change a status from the list or detail view.",
              ],
              [
                "03",
                "Launch a brand",
                "Complete all six steps, run verification, submit for review, then approve activation.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="info-callout">
            Changes are saved in this browser. Files are references only. All
            integrations and approvals are simulated.
          </div>
          <Button
            onClick={() => {
              setHelp(false);
              navigate("Accounts");
            }}
          >
            Explore accounts
            <ArrowRight size={15} />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

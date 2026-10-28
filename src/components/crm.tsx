"use client";
import { useEffect, useState } from "react";
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
import { Badge, Input } from "./ui/primitives";
import { Avatar, AccountLogo, EmptyState } from "./shared";
import { Dashboard } from "./dashboard";
import { Accounts, AccountProfile } from "./accounts";
import { Pipeline, WorkBoard, WorkDetail } from "./boards";
import { EditorDialog, type Editor } from "./forms";
import { Onboarding } from "./onboarding";
import { Barrels, Contacts, Reports, Settings } from "./secondary";
const nav = [
  {
    section: "Overview",
    items: [{ name: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "CRM",
    items: [
      { name: "Accounts", icon: Building2 },
      { name: "Contacts", icon: Users },
      { name: "Affiliate Pipeline", icon: GitBranch },
      { name: "Supplier Pipeline", icon: Truck },
      { name: "Brand Onboarding", icon: Rocket },
    ],
  },
  {
    section: "Operations",
    items: [
      { name: "Work Board", icon: Columns3 },
      { name: "Support Cases", icon: Headset },
      { name: "Tasks", icon: ListTodo },
      { name: "Barrel Management", icon: Cylinder },
    ],
  },
  {
    section: "Analytics",
    items: [{ name: "Reports", icon: ChartNoAxesCombined }],
  },
  {
    section: "Administration",
    items: [{ name: "Settings", icon: SettingsIcon }],
  },
];
const names = nav.flatMap((n) => n.items.map((i) => i.name));
const slug = (s: string) => s.toLowerCase().replaceAll(" ", "-");
export function CRM() {
  return (
    <StoreProvider>
      <Workspace />
      <Toaster richColors position="bottom-right" closeButton />
    </StoreProvider>
  );
}
function Workspace() {
  const { data, setData, ready } = useStore();
  const [page, setPage] = useState("Dashboard");
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
  const [help, setHelp] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const sync = () => {
      const name = names.find((n) => slug(n) === window.location.hash.slice(1));
      if (name) setPage(name);
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
  const navigate = (s: string) => {
    setPage(s);
    window.location.hash = slug(s);
    setMobileOpen(false);
    setSwitcher(false);
    window.scrollTo({ top: 0 });
  };
  const openAccount = (a: Account) => {
    if (a) {
      setSelected(null);
      setAccountId(a.id);
      setSearch(false);
    }
  };
  const openItem = (i: WorkItem, kind: "tasks" | "cases") => {
    setAccountId(null);
    setSelected({ id: i.id, kind });
    setSearch(false);
    setNotifications(false);
  };
  const newWork = () => setEditor({ type: "tasks" });
  const group = nav.find((n) => n.items.some((i) => i.name === page))?.section;
  const pending = data.cases.filter(
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
  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-nav-open" : ""}`}
    >
      <aside className="sidebar">
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
        <div className="workspace-picker-wrap">
          <button
            className="workspace-picker"
            onClick={() => setSwitcher(!switcher)}
            aria-expanded={switcher}
            aria-label="Switch workspace"
          >
            <span className="workspace-symbol">
              <span />
              <span />
              <span />
              <span />
            </span>
            {!collapsed && (
              <>
                <span>
                  <strong>{data.workspace}</strong>
                  <small>Team workspace</small>
                </span>
                <ChevronsUpDown size={14} />
              </>
            )}
          </button>
          {switcher && (
            <div className="workspace-menu">
              <small>WORKSPACE VIEWS</small>
              {[
                [data.workspace, "Dashboard"],
                ["Business operations", "Work Board"],
                ["Affiliate partnerships", "Affiliate Pipeline"],
              ].map(([s, p]) => (
                <button key={p} onClick={() => navigate(p)}>
                  <Building2 size={15} />
                  {s}
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="sidebar-search"
          aria-label="Search workspace"
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
                  title={collapsed ? n.name : undefined}
                  className={`nav-item ${page === n.name ? "active" : ""}`}
                  onClick={() => navigate(n.name)}
                >
                  <n.icon size={17} strokeWidth={1.75} />
                  {!collapsed && (
                    <>
                      <span>{n.name}</span>
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
              <strong>A connected way to work</strong>
              <p>Your relationships and operations, finally in sync.</p>
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
          <button className="user-profile" onClick={() => navigate("Settings")}>
            <Avatar name="Olivia Parker" color="purple" size={34} />
            {!collapsed && (
              <>
                <span>
                  <strong>Olivia Parker</strong>
                  <small>Workspace admin</small>
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
            <span className="breadcrumb-workspace">Workspace</span>
            <ChevronRight size={13} />
            <span>{group}</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
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
              onClick={() => navigate("Settings")}
            >
              <Avatar name="Olivia Parker" size={31} color="purple" />
            </button>
          </div>
        </header>
        <main key={page} className="main-content">
          {page === "Dashboard" && (
            <Dashboard
              navigate={navigate}
              openAccount={openAccount}
              openItem={openItem}
              newWork={newWork}
            />
          )}
          {page === "Accounts" && (
            <Accounts
              openAccount={openAccount}
              create={() => setEditor({ type: "account" })}
            />
          )}
          {page === "Contacts" && <Contacts openAccount={openAccount} />}
          {page === "Affiliate Pipeline" && (
            <Pipeline
              openAccount={openAccount}
              create={() =>
                setEditor({ type: "account", accountType: "Affiliate" })
              }
            />
          )}
          {page === "Supplier Pipeline" && (
            <Pipeline
              supplier
              openAccount={openAccount}
              create={() =>
                setEditor({ type: "account", accountType: "Supplier" })
              }
            />
          )}
          {page === "Brand Onboarding" && <Onboarding />}
          {page === "Work Board" && (
            <WorkBoard openItem={openItem} create={newWork} />
          )}
          {page === "Support Cases" && (
            <WorkBoard
              kind="cases"
              openItem={openItem}
              create={() => setEditor({ type: "cases" })}
            />
          )}
          {page === "Tasks" && (
            <WorkBoard taskView openItem={openItem} create={newWork} />
          )}
          {page === "Barrel Management" && (
            <Barrels openAccount={openAccount} />
          )}
          {page === "Reports" && <Reports />}
          {page === "Settings" && <Settings />}
        </main>
      </div>
      <AccountProfile
        key={accountId}
        id={accountId}
        onClose={() => setAccountId(null)}
        edit={(a) => setEditor({ type: "account", record: a })}
        openItem={openItem}
        navigate={navigate}
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
          <DialogTitle className="sr-only">Search workspace</DialogTitle>
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
            Search across your connected workspace <kbd>esc</kbd> to close
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
            data.tasks
              .filter(
                (t) =>
                  t.assignee === "Olivia Parker" &&
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
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog">
          <span className="tile-icon purple">
            <BookOpen size={24} />
          </span>
          <DialogTitle>A connected way to work</DialogTitle>
          <DialogDescription>
            Explore BN CRM with realistic, fictional records.
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

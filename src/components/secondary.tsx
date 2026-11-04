"use client";
import { SupplierProvisionalNotice } from "./supplier-provisional";
import { useState } from "react";
import {
  Cylinder as BarrelIcon,
  Plus,
  Download,
  Save,
  Bell,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Users,
  Database,
} from "lucide-react";
import { useStore, STORAGE_KEY } from "@/lib/store";
import { barrelStages, seed, type Account, type Barrel } from "@/lib/data";
import { Button } from "./ui/button";
import { Card, Badge, Input, Select } from "./ui/primitives";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  AccountLogo,
  Avatar,
  EmptyState,
  PanelHeading,
  SectionTitle,
  Toolbar,
  SearchField,
} from "./shared";
import { Kanban } from "./boards";
import { GrowthChart } from "./dashboard";
import { scopedAccounts, type WorkspaceId, WORKSPACES } from "@/lib/workspaces";
import { toast } from "sonner";
export function Contacts({
  openAccount,
  workspace = "operations",
}: {
  openAccount: (a: Account) => void;
  workspace?: WorkspaceId;
}) {
  const { data } = useStore((s) => ({ data: s.data }));
  const [query, setQuery] = useState("");
  const [manager, setManager] = useState("All managers");
  const rows = scopedAccounts(data, workspace)
    .flatMap((a) =>
      a.contacts.map((c, i) => ({ ...c, account: a, id: a.id + i })),
    )
    .filter(
      (c) =>
        (manager === "All managers" || c.account.manager === manager) &&
        `${c.name} ${c.email} ${c.account.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  return (
    <>
      <SectionTitle
        title="Contacts"
        subtitle={`The people behind your ${WORKSPACES[workspace].name.toLowerCase()} relationships.`}
      />
      <Card>
        <Toolbar
          query={query}
          setQuery={setQuery}
          manager={manager}
          setManager={setManager}
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Account</th>
                <th>Email</th>
                <th>Account manager</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openAccount(c.account)}
                  onClick={() => openAccount(c.account)}
                >
                  <td>
                    <span className="identity">
                      <Avatar name={c.name} size={32} />
                      <strong>{c.name}</strong>
                    </span>
                  </td>
                  <td>{c.role}</td>
                  <td>
                    <span className="identity">
                      <AccountLogo
                        name={c.account.name}
                        color={c.account.color}
                        size={25}
                      />
                      {c.account.name}
                    </span>
                  </td>
                  <td className="muted">{c.email}</td>
                  <td>{c.account.manager}</td>
                  <td>
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <EmptyState />}
        </div>
        <div className="table-footer">
          {rows.length} contacts · Fictional contact information
        </div>
      </Card>
    </>
  );
}
export function Barrels({
  openAccount,
}: {
  openAccount: (a: Account) => void;
}) {
  const { data, setData, can, resetDemo } = useStore((s) => ({ data: s.data, setData: s.setData, can: s.can, resetDemo: s.resetDemo }));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [view, setView] = useState("list");
  const [edit, setEdit] = useState<Barrel | null | "new">(null);
  const rows = data.barrels.filter(
    (b) =>
      (filter === "All statuses" || b.status === filter) &&
      `${b.id} ${b.name} ${data.accounts.find((a) => a.id === b.affiliateId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const move = async (id: string, status: string) => {
    const saved = await setData((d) => ({
      ...d,
      barrels: d.barrels.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
    if (!saved) return;
    toast.success(`Barrel moved to ${status}`);
  };
  return (
    <>
      <SectionTitle
        title="Barrel management"
        subtitle="Every barrel, from sourcing to the final pour."
      >
        <span className="demo-chip">Exploratory module</span>
        <Button disabled={!can("barrels.edit")} onClick={() => setEdit("new")}>
          <Plus size={16} />
          New barrel
        </Button>
      </SectionTitle>
      <SupplierProvisionalNotice />
      <div className="onboarding-summary">
        <Card>
          <span className="tile-icon purple">
            <BarrelIcon size={20} />
          </span>
          <div>
            <strong>
              {data.barrels.filter((b) => b.status === "Live").length}
            </strong>
            <span>Live barrels</span>
          </div>
        </Card>
        <Card>
          <span className="tile-icon blue">
            <Database size={20} />
          </span>
          <div>
            <strong>
              {data.barrels.reduce((n, b) => n + b.stock, 0).toLocaleString()}
            </strong>
            <span>Bottles in stock</span>
          </div>
        </Card>
        <Card>
          <span className="tile-icon green">
            <BarrelIcon size={20} />
          </span>
          <div>
            <strong>
              {data.barrels.reduce((n, b) => n + b.sales, 0).toLocaleString()}
            </strong>
            <span>Bottles sold</span>
          </div>
        </Card>
      </div>
      <Toolbar
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        filterOptions={["All statuses", ...barrelStages]}
        view={view}
        setView={setView}
      />
      {view === "board" ? (
        <Kanban
          canMove={(b) => can("barrels.edit", b)}
          records={rows}
          stages={barrelStages}
          status={(r) => r.status}
          onMove={move}
          renderCard={(b) => (
            <button className="work-card-main" onClick={() => setEdit(b)}>
              <div className="card-top">
                <span className="record-id">{b.id}</span>
                <BarrelIcon size={17} />
              </div>
              <h4>{b.name}</h4>
              <span>
                {data.accounts.find((a) => a.id === b.affiliateId)?.name}
              </span>
              <div className="barrel-card-stats">
                <span>
                  <strong>{b.stock}</strong>in stock
                </span>
                <span>
                  <strong>{b.sales}</strong>sold
                </span>
              </div>
            </button>
          )}
        />
      ) : (
        <Card>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Barrel</th>
                  <th>Affiliate</th>
                  <th>Supplier (provisional)</th>
                  <th>Retailer</th>
                  <th>Stock</th>
                  <th>Sales</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td onClick={() => setEdit(b)}>
                      <strong>{b.id}</strong>
                      <small className="table-sub">{b.name}</small>
                    </td>
                    <td>
                      <button
                        className="table-link"
                        onClick={() =>
                          openAccount(
                            data.accounts.find((a) => a.id === b.affiliateId)!,
                          )
                        }
                      >
                        {
                          data.accounts.find((a) => a.id === b.affiliateId)
                            ?.name
                        }
                      </button>
                    </td>
                    <td>
                      <button
                        className="table-link"
                        onClick={() =>
                          openAccount(
                            data.accounts.find((a) => a.id === b.supplierId)!,
                          )
                        }
                      >
                        {data.accounts.find((a) => a.id === b.supplierId)?.name}
                      </button>
                    </td>
                    <td>{b.retailer}</td>
                    <td>
                      <strong>{b.stock}</strong>
                    </td>
                    <td>{b.sales}</td>
                    <td>
                      <Select
                        label={`Barrel status ${b.id}`}
                        value={b.status}
                        options={barrelStages}
                        onChange={(e) => move(b.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${b.id}`}
                        onClick={() => setEdit(b)}
                      >
                        <ChevronRight size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <EmptyState />}
          </div>
        </Card>
      )}
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent>
            <BarrelForm
              record={edit === "new" ? null : edit}
              close={() => setEdit(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
function BarrelForm({
  record,
  close,
}: {
  record: Barrel | null;
  close: () => void;
}) {
  const { data: formSnapshot, saving } = useStore((s) => ({ data: s.data, saving: s.saving }));
  const [baseline]=useState(formSnapshot);

  const { data, setData, can, resetDemo } = useStore((s) => ({ data: s.data, setData: s.setData, can: s.can, resetDemo: s.resetDemo }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const b: Barrel = {
          id: record?.id || `BBL-${Date.now().toString().slice(-6)}`,
          name: String(f.get("name")).trim(),
          affiliateId: String(f.get("affiliateId")),
          supplierId: String(f.get("supplierId")),
          retailer: String(f.get("retailer")),
          stock: Number(f.get("stock")),
          sales: Number(f.get("sales")),
          status: String(f.get("status")),
        };
        if (!b.name) return;
        const saved = await setData((d) => ({
          ...d,
          barrels: record
            ? d.barrels.map((x) => (x.id === b.id ? b : x))
            : [b, ...d.barrels],
        }), baseline);
        if (!saved) return;
        toast.success(record ? "Barrel updated" : "Barrel created");
        close();
      }}
    >
      <DialogTitle>{record ? "Edit barrel" : "New barrel"}</DialogTitle>
      <DialogDescription>
        Mock barrel details. Supplier links are illustrative while their
        relationship with brands and affiliates is being defined.
      </DialogDescription>
      <div className="form-grid">
        <label className="field-label full">
          Barrel name
          <Input name="name" required defaultValue={record?.name} />
        </label>
        {(["affiliateId", "supplierId"] as const).map((k) => (
          <label className="field-label" key={k}>
            {k === "affiliateId" ? "Affiliate" : "Supplier (provisional)"}
            <Select name={k} className="input" defaultValue={record?.[k]}>
              {data.accounts
                .filter(
                  (a) =>
                    a.type === (k === "affiliateId" ? "Affiliate" : "Supplier"),
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </label>
        ))}
        <label className="field-label">
          Retailer
          <Select
            name="retailer"
            options={data.retailers}
            defaultValue={record?.retailer}
          />
        </label>
        <label className="field-label">
          Status
          <Select
            name="status"
            options={barrelStages}
            defaultValue={record?.status}
          />
        </label>
        <label className="field-label">
          Stock
          <Input
            type="number"
            min="0"
            step="1"
            name="stock"
            defaultValue={record?.stock || 0}
            required
          />
        </label>
        <label className="field-label">
          Sales
          <Input
            type="number"
            min="0"
            step="1"
            name="sales"
            defaultValue={record?.sales || 0}
            required
          />
        </label>
      </div>
      <div className="dialog-footer">
        <Button variant="outline" type="button" onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={saving || !can("barrels.edit", record || undefined)}
          type="submit"
        >
          Save barrel
        </Button>
      </div>
    </form>
  );
}
export function Reports() {
  const { data } = useStore((s) => ({ data: s.data }));
  const [tab, setTab] = useState("Business overview");
  const [period, setPeriod] = useState("October 2026");
  const done = data.tasks.filter((t) => t.status === "Done").length;
  const resolved = data.cases.filter((c) =>
    ["Resolved", "Closed"].includes(c.status),
  ).length;
  const download = () => {
    const csv = `Metric,Value\nCorporate brands,${data.accounts.filter((a) => a.type === "Corporate Brand").length}\nAffiliates,${data.accounts.filter((a) => a.type === "Affiliate").length}\nCompleted tasks,${done}\nResolved cases,${resolved}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bn-crm-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };
  return (
    <>
      <SectionTitle
        title="Reports & insights"
        subtitle="Understand your relationships. Find your next opportunity."
      >
        <Select
          label="Report period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={["October 2026", "September 2026", "August 2026"]}
        />
        <Button onClick={download}>
          <Download size={15} />
          Export current snapshot
        </Button>
      </SectionTitle>
      <div className="account-summary">
        {["Business overview", "Team performance"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Business overview" ? (
        <>
          <div className="report-stats">
            {[
              [
                "Account portfolio",
                data.accounts.filter((a) => a.type !== "Supplier").length,
              ],
              [
                "Task completion",
                `${Math.round((done / Math.max(1, data.tasks.length)) * 100)}%`,
              ],
              ["Cases resolved", resolved],
              [
                "Onboarding queue",
                data.accounts.filter((a) => a.status === "Onboarding").length,
              ],
            ].map(([k, v]) => (
              <Card key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
                <small>Current workspace snapshot</small>
              </Card>
            ))}
          </div>
          <Card className="report-chart">
            <PanelHeading
              title="Network growth"
              subtitle={`Illustrative historical trend · ${period}`}
            />
            <GrowthChart
              through={
                period.startsWith("September")
                  ? "Sep"
                  : period.startsWith("August")
                    ? "Aug"
                    : "Oct"
              }
            />
            <div className="chart-foot">
              <span>
                <i className="dot purple-dot" />
                Affiliates <i className="dot blue-dot" />
                Corporate brands
              </span>
              <span>Sample historical data · Current totals shown above</span>
            </div>
          </Card>
          <Card className="report-breakdown">
            <PanelHeading
              title="Business health"
              subtitle="Current totals update as your team works"
            />
            {[
              [
                "Live affiliate partnerships",
                data.accounts.filter(
                  (a) => a.type === "Affiliate" && a.status === "Active",
                ).length,
                data.accounts.filter((a) => a.type === "Affiliate").length,
              ],
              ["Completed operations", done, data.tasks.length],
              ["Resolved support cases", resolved, data.cases.length],
              [
                "Active corporate brands",
                data.accounts.filter(
                  (a) => a.type === "Corporate Brand" && a.status === "Active",
                ).length,
                data.accounts.filter((a) => a.type === "Corporate Brand")
                  .length,
              ],
            ].map(([label, n, total]) => (
              <div className="report-progress-row" key={label}>
                <span>{label}</span>
                <div className="progress">
                  <span
                    style={{ width: `${(Number(n) / Number(total)) * 100}%` }}
                  />
                </div>
                <strong>
                  {n} / {total}
                </strong>
              </div>
            ))}
          </Card>
        </>
      ) : (
        <Card>
          <PanelHeading
            title="Team workload"
            subtitle="Assignments and outcomes across business operations"
          />
          <table>
            <thead>
              <tr>
                <th>Team member</th>
                <th>Assigned tasks</th>
                <th>Completed</th>
                <th>Open cases</th>
              </tr>
            </thead>
            <tbody>
              {[
                "Olivia Parker",
                "James Wilson",
                "Sofia Chen",
                "Marcus Reed",
              ].map((m) => (
                <tr key={m}>
                  <td>
                    <span className="identity">
                      <Avatar name={m} />
                      {m}
                    </span>
                  </td>
                  <td>{data.tasks.filter((t) => t.assignee === m).length}</td>
                  <td>
                    {
                      data.tasks.filter(
                        (t) => t.assignee === m && t.status === "Done",
                      ).length
                    }
                  </td>
                  <td>
                    {
                      data.cases.filter(
                        (c) =>
                          c.assignee === m &&
                          !["Resolved", "Closed"].includes(c.status),
                      ).length
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
export function Settings() {
  const { data, setData, can, resetDemo, serverMode, legacyAvailable, importLegacy, saving } = useStore((s) => ({ data: s.data, setData: s.setData, can: s.can, resetDemo: s.resetDemo, serverMode: s.serverMode, legacyAvailable: s.legacyAvailable, importLegacy: s.importLegacy, saving: s.saving }));
  const [reset, setReset] = useState(false);
  const [importing, setImporting] = useState(false);
  const [workspaceBase,setWorkspaceBase]=useState(data.workspace);
  return (
    <>
      <SectionTitle
        title="Organization settings"
        subtitle="Shared settings for Brands, Affiliates, and Operations."
      />
      <div className="settings-layout">
        <Card className="settings-card">
          <PanelHeading
            title="Organization details"
            subtitle="Your shared home for relationships and operations"
          />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const workspace = String(f.get("workspace")).trim();
              if (workspace) {
                if(serverMode&&data.workspace!==workspaceBase){toast.error("The organization name changed in another session. Reopen Settings before saving.");return;}
                if (!(await setData((d) => ({ ...d, workspace })))) return;
                setWorkspaceBase(workspace);
                toast.success("Organization settings saved");
              }
            }}
          >
            <label className="field-label">
              Organization name
              <Input name="workspace" required defaultValue={data.workspace} />
            </label>
            <label className="field-label spaced">
              Primary account manager
              <Input disabled value="Olivia Parker" />
            </label>
            <div className="dialog-footer">
              <Button disabled={saving} type="submit">
                <Save size={15} />
                Save changes
              </Button>
            </div>
          </form>
        </Card>
        <Card className="settings-card">
          <PanelHeading
            title="Notification preferences"
            subtitle="Preferences are saved locally for this prototype"
          />
          {(["reminders", "digest"] as const).map((k) => (
            <label className="settings-toggle" key={k}>
              <span>
                <strong>
                  {k === "reminders"
                    ? "Follow-up reminders"
                    : "Weekly workspace digest"}
                </strong>
                <small>
                  {k === "reminders"
                    ? "Show upcoming work and account follow-ups in notifications."
                    : "Save your preference for a weekly summary. No emails are sent."}
                </small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={data.settings[k]}
                onChange={async (e) => {
                  if (!(await setData((d) => ({
                    ...d,
                    settings: { ...d.settings, [k]: e.target.checked },
                  })))) return;
                  toast.success("Preference updated");
                }}
              />
            </label>
          ))}
        </Card>
        <Card className="settings-card">
          <PanelHeading
            title="Your team"
            subtitle={`Demo organization · ${data.users.length} fictional users`}
          />
          {data.users.map((u) => (
            <div className="team-row" key={u.id}>
              <Avatar name={u.name} size={34} />
              <span>
                <strong>{u.name}</strong>
                <small>{u.email}</small>
              </span>
              <div className="role-tags">
                {u.roles.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card className="settings-card">
          <PanelHeading
            title="Prototype & data"
            subtitle={serverMode ? "BN CRM v0 · Shared local SQLite database" : "BN CRM v0 · Browser-local persistence"}
          />
          <div className="info-callout">
            <ShieldCheck size={18} />
            <span>
              All records are fictional. {serverMode ? "A local API enforces demo roles and workflow rules. Identity switching is a simulation, without real authentication." : "This browser demo has no backend or authentication."} Email delivery and live Bottle Nexus integration remain mocked.
            </span>
          </div>
          <p className="muted">
            {serverMode ? "All local sessions use the same database. Data survives container restarts. Resetting replaces shared business records for everyone; audit history is retained." : "Data stays in this browser. Resetting restores sample records and removes local edits."}
          </p>
          <Button disabled={saving} variant="outline" onClick={() => setReset(true)}>
            <RotateCcw size={15} />
            Reset demo data
          </Button>
          {serverMode && legacyAvailable && <div className="spaced"><p>Your previous browser demo data is preserved separately. A System Admin can import it before the shared database's first change.</p><Button variant="outline" disabled={saving} onClick={()=>setImporting(true)}>Import previous browser data</Button></div>}
        </Card>
      </div>
      <Dialog open={reset} onOpenChange={setReset}>
        <DialogContent>
          <DialogTitle>Reset all three workspaces?</DialogTitle>
          <DialogDescription>
            {serverMode ? "This replaces shared business records for every local session across Brands, Affiliates, and Operations. Audit history is retained. Your previous browser demo data stays separate." : "This removes browser edits across all three workspaces and restores fictional sample records."} This action cannot be undone.
          </DialogDescription>
          <div className="dialog-footer">
            <Button variant="outline" onClick={() => setReset(false)}>
              Keep my changes
            </Button>
            <Button
              disabled={saving}
              variant="destructive"
              onClick={async () => {
                if (!(await resetDemo())) return;
                setReset(false);
                toast.success("Demo workspace restored");
              }}
            >
              Reset demo data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={importing} onOpenChange={setImporting}><DialogContent>
        <DialogTitle>Import previous browser demo data?</DialogTitle>
        <DialogDescription>This replaces the initial shared sample records with fictional data from this browser. It is available only before the database's first change. The original browser copy is preserved.</DialogDescription>
        <div className="dialog-footer"><Button variant="outline" onClick={()=>setImporting(false)}>Cancel</Button><Button disabled={saving} onClick={async()=>{if(await importLegacy()){setImporting(false);toast.success("Browser demo imported into the local database");}}}>Import into shared database</Button></div>
      </DialogContent></Dialog>
    </>
  );
}

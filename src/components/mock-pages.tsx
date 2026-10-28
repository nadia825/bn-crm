"use client";
import { useState } from "react";
import {
  Plus,
  ShieldCheck,
  Users,
  Pencil,
  LockKeyhole,
  Check,
  CalendarDays,
  List,
  CreditCard,
  ArrowRight,
  Building2,
  Search,
  Trash2,
  SlidersHorizontal,
  FileClock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLES, roleDescriptions } from "@/lib/access";
import { affiliateStages, dateLabel, type Account } from "@/lib/data";
import type {
  Activity,
  CustomField,
  DemoUser,
  Invoice,
  RetailerRecord,
  Role,
} from "@/lib/model";
import { Button } from "./ui/button";
import { Card, Badge, Input, Select, Textarea } from "./ui/primitives";
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
  SearchField,
  SectionTitle,
} from "./shared";
import { ViewControls } from "./saved-views";
import { toast } from "sonner";
const money = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export function UsersRoles() {
  const { data } = useStore();
  const [edit, setEdit] = useState<DemoUser | null | "new">(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Users");
  return (
    <>
      <SectionTitle
        title="Users & roles"
        subtitle="Assign fixed roles. Their capabilities are predefined across the CRM."
      >
        <Button onClick={() => setEdit("new")}>
          <Plus size={15} />
          Add demo user
        </Button>
      </SectionTitle>
      <div className="role-demo-note">
        <ShieldCheck size={17} />
        <span>
          Prototype administration. These users and roles are fictional; no
          accounts or invitations are created outside this browser.
        </span>
      </div>
      <div className="account-summary">
        {["Users", "Role catalog"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Users" ? (
        <Card>
          <div className="module-toolbar">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search users…"
            />
            <span>
              {data.users.length} demo users · Multiple roles supported
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Assigned roles</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.users
                  .filter((u) =>
                    `${u.name} ${u.email} ${u.roles.join(" ")}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="identity">
                          <Avatar name={u.name} size={34} />
                          <span>
                            <strong>{u.name}</strong>
                            <small>{u.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="role-tags">
                          {u.roles.map((r) => (
                            <span key={r}>{r}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge>{u.active ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEdit(u)}
                        >
                          <Pencil size={13} />
                          Assign roles
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="role-catalog">
          {ROLES.map((r) => (
            <Card key={r}>
              <span className="tile-icon purple">
                <ShieldCheck size={20} />
              </span>
              <h3>{r}</h3>
              <p>{roleDescriptions[r]}</p>
              <span className="fixed-role">
                <LockKeyhole size={12} />
                Fixed role · Capabilities are not editable
              </span>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent>
            <UserForm
              key={typeof edit === "string" ? "new" : edit.id}
              user={edit === "new" ? undefined : edit}
              close={() => setEdit(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
function UserForm({ user, close }: { user?: DemoUser; close: () => void }) {
  const { data, setData } = useStore();
  const [roles, setRoles] = useState<Role[]>(user?.roles || ["Viewer"]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!roles.length) {
          toast.error("Assign at least one predefined role.");
          return;
        }
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email")).trim();
        if (
          data.users.some(
            (u) =>
              u.id !== user?.id &&
              u.email.toLowerCase() === email.toLowerCase(),
          )
        ) {
          toast.error("A demo user already has this email.");
          return;
        }
        const next: DemoUser = {
          id: user?.id || crypto.randomUUID(),
          name: String(f.get("name")).trim(),
          email,
          roles,
          active: f.get("active") === "on",
          accountIds: user?.accountIds || ["BR-001", "AF-001"],
        };
        if (
          setData((d) => ({
            ...d,
            users: user
              ? d.users.map((u) => (u.id === user.id ? next : u))
              : [...d.users, next],
          }))
        ) {
          toast.success("Demo user roles saved");
          close();
        }
      }}
    >
      <DialogTitle>
        {user ? "Assign predefined roles" : "Add demo user"}
      </DialogTitle>
      <DialogDescription>
        Every user needs a role. Multiple roles combine capabilities; assignment
        and financial restrictions still apply.
      </DialogDescription>
      <div className="form-grid">
        <label className="field-label">
          Name
          <Input required name="name" defaultValue={user?.name} />
        </label>
        <label className="field-label">
          Fictional email
          <Input
            type="email"
            required
            name="email"
            defaultValue={user?.email}
            placeholder="name@team.example"
          />
        </label>
        <div className="full role-selection">
          {ROLES.map((r) => (
            <label key={r}>
              <input
                type="checkbox"
                checked={roles.includes(r)}
                onChange={(e) =>
                  setRoles(
                    e.target.checked
                      ? [...roles, r]
                      : roles.filter((x) => x !== r),
                  )
                }
              />
              <span>
                <strong>{r}</strong>
                <small>{roleDescriptions[r]}</small>
              </span>
            </label>
          ))}
        </div>
        <label className="checkbox-label full">
          <input
            type="checkbox"
            name="active"
            defaultChecked={user?.active ?? true}
          />
          Active in demo previews
        </label>
      </div>
      <div className="dialog-footer">
        <Button variant="outline" type="button" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={!roles.length}>
          Save roles
        </Button>
      </div>
    </form>
  );
}

export function Configuration() {
  const { data, setData } = useStore();
  const [tab, setTab] = useState("Pipelines");
  const [stage, setStage] = useState("");
  const [target, setTarget] = useState("Affiliate");
  const [field, setField] = useState(false);
  const cfg = data.configuration;
  const addStage = () => {
    const value = stage.trim();
    if (!value) return;
    const list =
      target === "Affiliate"
        ? [...affiliateStages, ...cfg.affiliateExtras]
        : cfg.supplierStages;
    if (list.some((s) => s.toLowerCase() === value.toLowerCase())) {
      toast.error("Stage names must be unique.");
      return;
    }
    if (
      setData((d) => ({
        ...d,
        configuration: {
          ...d.configuration,
          ...(target === "Affiliate"
            ? { affiliateExtras: [...d.configuration.affiliateExtras, value] }
            : { supplierStages: [...d.configuration.supplierStages, value] }),
        },
      }))
    ) {
      setStage("");
      toast.success("Pipeline stage added");
    }
  };
  return (
    <>
      <SectionTitle
        title="Shared configuration"
        subtitle="Controlled flexibility within Bottle Nexus business modules."
      />
      <div className="role-demo-note">
        <LockKeyhole size={17} />
        <span>
          The six onboarding requirements, activation gates, and core affiliate
          stages are protected. There is no custom-object or workflow builder.
        </span>
      </div>
      <div className="account-summary">
        {["Pipelines", "Account fields", "Shared views"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Pipelines" ? (
        <div className="settings-layout">
          <Card className="settings-card">
            <PanelHeading
              title="Affiliate stages"
              subtitle="Core and alternative states are protected"
            />
            {affiliateStages.map((s) => (
              <div className="config-stage" key={s}>
                <span>{s}</span>
                <LockKeyhole size={12} />
              </div>
            ))}
            {cfg.affiliateExtras.map((s) => (
              <div className="config-stage" key={s}>
                <span>{s}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${s}`}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      configuration: {
                        ...d.configuration,
                        affiliateExtras: d.configuration.affiliateExtras.filter(
                          (x) => x !== s,
                        ),
                      },
                    }))
                  }
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            ))}
          </Card>
          <Card className="settings-card">
            <PanelHeading
              title="Supplier stages"
              subtitle="Separate from affiliate acquisition"
            />
            {cfg.supplierStages.map((s) => (
              <div className="config-stage" key={s}>
                <span>{s}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove supplier stage ${s}`}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      configuration: {
                        ...d.configuration,
                        supplierStages: d.configuration.supplierStages.filter(
                          (x) => x !== s,
                        ),
                      },
                    }))
                  }
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            ))}
            <h3 className="spaced">Add a configured stage</h3>
            <label className="field-label">
              Pipeline
              <Select
                options={["Affiliate", "Supplier"]}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label className="field-label spaced">
              Stage name
              <Input value={stage} onChange={(e) => setStage(e.target.value)} />
            </label>
            <Button
              className="spaced"
              onClick={addStage}
              disabled={!stage.trim()}
            >
              <Plus size={14} />
              Add stage
            </Button>
            <p className="subtle spaced">
              A stage with existing records cannot be removed.
            </p>
          </Card>
        </div>
      ) : tab === "Account fields" ? (
        <Card className="settings-card">
          <PanelHeading
            title="Selected custom account fields"
            subtitle="Text and selection fields only, scoped to predefined account types"
          />
          <Button onClick={() => setField(true)}>
            <Plus size={14} />
            Add account field
          </Button>
          {cfg.customFields.map((f) => (
            <div className="config-field" key={f.id}>
              <span>
                <strong>{f.label}</strong>
                <small>
                  {f.scope} · {f.type}
                  {f.sensitive ? " · Finance restricted" : ""}
                </small>
              </span>
              <Badge>{f.sensitive ? "Restricted" : "Shared"}</Badge>
            </div>
          ))}
          {!cfg.customFields.length && (
            <EmptyState
              title="No custom fields yet"
              description="Add a focused business field and it will appear on matching account forms."
            />
          )}
        </Card>
      ) : (
        <Card>
          <PanelHeading
            title="Company-wide shared views"
            subtitle="Personal views remain with their creators"
          />
          {data.views
            .filter((v) => v.visibility === "Shared")
            .map((v) => (
              <div className="config-field" key={v.id}>
                <span>
                  <strong>{v.name}</strong>
                  <small>{v.module}</small>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      views: d.views.filter((x) => x.id !== v.id),
                    }))
                  }
                >
                  <Trash2 size={13} />
                  Remove
                </Button>
              </div>
            ))}
          {!data.views.some((v) => v.visibility === "Shared") && (
            <EmptyState
              title="No shared views saved"
              description="Use Save view in a directory or board and select Shared."
            />
          )}
        </Card>
      )}
      <Dialog open={field} onOpenChange={setField}>
        <DialogContent>
          <FieldForm close={() => setField(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
function FieldForm({ close }: { close: () => void }) {
  const { data, setData } = useStore();
  const [type, setType] = useState("Text");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const label = String(f.get("label")).trim();
        if (
          data.configuration.customFields.some(
            (x) => x.label.toLowerCase() === label.toLowerCase(),
          )
        ) {
          toast.error("Choose a unique field label.");
          return;
        }
        const options = String(f.get("options") || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (type === "Select" && !options.length) {
          toast.error("Provide selection options.");
          return;
        }
        const next: CustomField = {
          id: `cf-${crypto.randomUUID().slice(0, 8)}`,
          label,
          type: type as CustomField["type"],
          scope: String(f.get("scope")) as CustomField["scope"],
          options,
          sensitive: f.get("sensitive") === "on",
        };
        if (
          setData((d) => ({
            ...d,
            configuration: {
              ...d.configuration,
              customFields: [...d.configuration.customFields, next],
            },
          }))
        ) {
          toast.success("Account field created");
          close();
        }
      }}
    >
      <DialogTitle>Add a custom account field</DialogTitle>
      <DialogDescription>
        Extend an existing module with a selected business field.
      </DialogDescription>
      <div className="form-grid">
        <label className="field-label full">
          Field label
          <Input name="label" required />
        </label>
        <label className="field-label">
          Type
          <Select
            options={["Text", "Select"]}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </label>
        <label className="field-label">
          Account scope
          <Select
            name="scope"
            options={["All accounts", "Corporate Brand", "Affiliate"]}
          />
        </label>
        {type === "Select" && (
          <label className="field-label full">
            Options, separated by commas
            <Input
              required
              name="options"
              placeholder="e.g. Standard, Priority, Strategic"
            />
          </label>
        )}
        <label className="checkbox-label full">
          <input name="sensitive" type="checkbox" />
          Restrict values to Finance and System Admin
        </label>
      </div>
      <div className="dialog-footer">
        <Button variant="outline" type="button" onClick={close}>
          Cancel
        </Button>
        <Button type="submit">Add field</Button>
      </div>
    </form>
  );
}

export function AuditLog() {
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All outcomes");
  const rows = data.audit.filter(
    (a) =>
      (filter === "All outcomes" || a.outcome === filter) &&
      `${a.actor} ${a.action} ${a.recordId} ${a.detail}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <SectionTitle
        title="Audit log"
        subtitle="Application-level mock action history, including denied changes."
      />
      <Card>
        <div className="module-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search audit history…"
          />
          <Select
            label="Audit outcome"
            options={["All outcomes", "Allowed", "Denied"]}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span>{rows.length} recorded actions</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Record</th>
                <th>Detail</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.at).toLocaleString("en-US")}</td>
                  <td>
                    <strong>{a.actor}</strong>
                    <small className="table-sub">{a.roles.join(" + ")}</small>
                  </td>
                  <td>{a.action}</td>
                  <td>{a.recordId}</td>
                  <td className="wrap-cell">{a.detail}</td>
                  <td>
                    <Badge>{a.outcome}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <EmptyState
              title="No matching audit events"
              description="Create or edit a record to see a mock audit entry."
            />
          )}
        </div>
      </Card>
      <p className="subtle spaced">
        This is a browser-local demonstration of an audit trail, not a
        tamper-proof production log.
      </p>
    </>
  );
}

export function Finance({
  mode = "Billing",
  openAccount,
}: {
  mode?: "Billing" | "Payment Follow-ups" | "Finance Reports";
  openAccount: (a: Account) => void;
}) {
  const { data, setData, can } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [edit, setEdit] = useState<Invoice | null | "new">(null);
  const unpaid = data.billing.filter((b) =>
    ["Open", "Overdue"].includes(b.status),
  );
  const rows = data.billing.filter(
    (b) =>
      (mode !== "Payment Follow-ups" ||
        ["Open", "Overdue"].includes(b.status)) &&
      (status === "All statuses" || b.status === status) &&
      `${b.id} ${b.description} ${data.accounts.find((a) => a.id === b.accountId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <SectionTitle
        title={mode}
        subtitle="Fictional billing records and payment follow-ups for authorized roles."
      >
        {can("billing.edit") && (
          <Button onClick={() => setEdit("new")}>
            <Plus size={15} />
            New mock invoice
          </Button>
        )}
      </SectionTitle>
      <div className="role-demo-note finance">
        <CreditCard size={18} />
        <span>
          Finance simulation only. All amounts are fictional. Recording a mock
          payment does not charge or transfer money.
        </span>
      </div>
      <div className="report-stats">
        {[
          ["Outstanding", money(unpaid.reduce((n, b) => n + b.amount, 0))],
          [
            "Overdue",
            money(
              data.billing
                .filter((b) => b.status === "Overdue")
                .reduce((n, b) => n + b.amount, 0),
            ),
          ],
          [
            "Paid in demo",
            money(
              data.billing
                .filter((b) => b.status === "Paid")
                .reduce((n, b) => n + b.amount, 0),
            ),
          ],
          ["Open follow-ups", unpaid.length],
        ].map(([label, value]) => (
          <Card key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Mock billing data</small>
          </Card>
        ))}
      </div>
      {mode === "Finance Reports" && (
        <Card className="settings-card">
          <PanelHeading
            title="Billing distribution"
            subtitle="Current fictional invoice totals by status"
          />
          {["Draft", "Open", "Overdue", "Paid"].map((s) => (
            <div className="report-progress-row" key={s}>
              <span>{s}</span>
              <div className="progress">
                <span
                  style={{
                    width: `${(data.billing.filter((b) => b.status === s).length / Math.max(1, data.billing.length)) * 100}%`,
                  }}
                />
              </div>
              <strong>
                {data.billing.filter((b) => b.status === s).length}
              </strong>
            </div>
          ))}
        </Card>
      )}
      <Card className="spaced">
        <div className="module-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search billing records…"
          />
          <Select
            label="Invoice status"
            options={["All statuses", "Draft", "Open", "Overdue", "Paid"]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <span>{rows.length} records</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.id}</strong>
                    <small className="table-sub">{b.description}</small>
                  </td>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => {
                        const a = data.accounts.find(
                          (a) => a.id === b.accountId,
                        );
                        if (a) openAccount(a);
                      }}
                    >
                      {data.accounts.find((a) => a.id === b.accountId)?.name}
                    </button>
                  </td>
                  <td>
                    <strong>{money(b.amount)}</strong>
                  </td>
                  <td>{dateLabel(b.due)}</td>
                  <td>
                    <Badge>{b.status}</Badge>
                  </td>
                  <td>
                    <div className="inline-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEdit(b)}
                        disabled={!can("billing.edit")}
                      >
                        Edit
                      </Button>
                      {b.status !== "Paid" && can("billing.edit") && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (
                              setData((d) => ({
                                ...d,
                                billing: d.billing.map((x) =>
                                  x.id === b.id ? { ...x, status: "Paid" } : x,
                                ),
                              }))
                            )
                              toast.success(
                                "Mock payment recorded — no transaction occurred",
                              );
                          }}
                        >
                          <Check size={12} />
                          Record mock payment
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <EmptyState />}
        </div>
      </Card>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent>
            <InvoiceForm
              key={typeof edit === "string" ? "new" : edit.id}
              invoice={edit === "new" ? undefined : edit}
              close={() => setEdit(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
function InvoiceForm({
  invoice,
  close,
}: {
  invoice?: Invoice;
  close: () => void;
}) {
  const { data, setData } = useStore();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const item: Invoice = {
          id: invoice?.id || `INV-${crypto.randomUUID().slice(0, 7)}`,
          accountId: String(f.get("account")),
          description: String(f.get("description")).trim(),
          amount: Number(f.get("amount")),
          due: String(f.get("due")),
          status: String(f.get("status")) as Invoice["status"],
          reference: String(f.get("reference")),
        };
        if (
          setData((d) => ({
            ...d,
            billing: invoice
              ? d.billing.map((x) => (x.id === invoice.id ? item : x))
              : [item, ...d.billing],
          }))
        ) {
          toast.success("Mock invoice saved");
          close();
        }
      }}
    >
      <DialogTitle>
        {invoice ? "Edit mock invoice" : "Create mock invoice"}
      </DialogTitle>
      <DialogDescription>
        No real payment processing or billing API is connected.
      </DialogDescription>
      <div className="form-grid">
        <label className="field-label full">
          Account
          <select
            name="account"
            className="input"
            required
            defaultValue={invoice?.accountId}
          >
            {data.accounts
              .filter((a) => a.type !== "Supplier")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field-label full">
          Description
          <Input
            required
            name="description"
            defaultValue={invoice?.description}
          />
        </label>
        <label className="field-label">
          Amount (USD)
          <Input
            required
            type="number"
            min="0"
            step="0.01"
            name="amount"
            defaultValue={invoice?.amount}
          />
        </label>
        <label className="field-label">
          Due date
          <Input
            type="date"
            required
            name="due"
            defaultValue={invoice?.due || "2026-11-05"}
          />
        </label>
        <label className="field-label">
          Status
          <Select
            name="status"
            options={["Draft", "Open", "Overdue", "Paid"]}
            defaultValue={invoice?.status || "Draft"}
          />
        </label>
        <label className="field-label">
          Demo reference
          <Input name="reference" defaultValue={invoice?.reference} />
        </label>
      </div>
      <div className="dialog-footer">
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button type="submit">Save mock invoice</Button>
      </div>
    </form>
  );
}

function ActivityForm({
  activity,
  kind,
  close,
}: {
  activity?: Activity;
  kind: Activity["kind"];
  close: () => void;
}) {
  const { data, setData, actor, can } = useStore();
  const writable = can("activities.edit", activity);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const a: Activity = {
          id: activity?.id || crypto.randomUUID(),
          title: String(f.get("title")).trim(),
          accountId: String(f.get("accountId")),
          owner: actor.roles.some((r) =>
            ["System Admin", "Sales Manager", "Operations Manager"].includes(r),
          )
            ? String(f.get("owner"))
            : actor.name,
          kind: String(f.get("kind")) as Activity["kind"],
          due: String(f.get("due")),
          status: String(f.get("status")) as Activity["status"],
          notes: String(f.get("notes")),
        };
        if (
          setData((d) => ({
            ...d,
            activities: activity
              ? d.activities.map((x) => (x.id === a.id ? a : x))
              : [a, ...d.activities],
          }))
        ) {
          toast.success("Activity saved");
          close();
        }
      }}
    >
      <DialogTitle>
        {activity ? "Account activity" : "Schedule an activity"}
      </DialogTitle>
      <DialogDescription>
        Meetings and reminders are mock records; no invitations or notifications
        are sent.
      </DialogDescription>
      <fieldset disabled={!writable} className="form-grid">
        <label className="field-label full">
          Title
          <Input name="title" required defaultValue={activity?.title} />
        </label>
        <label className="field-label">
          Account
          <select
            name="accountId"
            className="input"
            required
            defaultValue={activity?.accountId}
          >
            {data.accounts
              .filter((a) => a.type !== "Supplier")
              .map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field-label">
          Type
          <Select
            name="kind"
            options={["Meeting", "Call", "Note", "Follow-up"]}
            defaultValue={activity?.kind || kind}
          />
        </label>
        <label className="field-label">
          When
          <Input
            type="datetime-local"
            name="due"
            required
            defaultValue={activity?.due || "2026-10-29T14:00"}
          />
        </label>
        <label className="field-label">
          Owner
          <Select
            name="owner"
            defaultValue={activity?.owner || actor.name}
            options={
              actor.roles.some((r) =>
                [
                  "System Admin",
                  "Sales Manager",
                  "Operations Manager",
                ].includes(r),
              )
                ? data.users.filter((u) => u.active).map((u) => u.name)
                : [actor.name]
            }
          />
        </label>
        <label className="field-label">
          Status
          <Select
            name="status"
            options={["Scheduled", "Done"]}
            defaultValue={activity?.status || "Scheduled"}
          />
        </label>
        <label className="field-label full">
          Notes
          <Textarea name="notes" defaultValue={activity?.notes} />
        </label>
      </fieldset>
      <div className="dialog-footer">
        <Button variant="outline" type="button" onClick={close}>
          Close
        </Button>
        {writable && <Button type="submit">Save activity</Button>}
      </div>
    </form>
  );
}

export function Retailers({
  openAccount,
}: {
  openAccount: (a: Account) => void;
}) {
  const { data, setData, can } = useStore();
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<RetailerRecord | null | "new">(null);
  const rows = data.retailerRecords.filter((r) =>
    `${r.name} ${r.region}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <SectionTitle
        title="Retailers"
        subtitle="Connected retail and fulfillment partners, with linked client relationships."
      >
        {can("retailers.edit") && (
          <Button onClick={() => setEdit("new")}>
            <Plus size={15} />
            New retailer
          </Button>
        )}
      </SectionTitle>
      <Card>
        <div className="module-toolbar">
          <SearchField value={query} onChange={setQuery} />
          <span>{rows.length} accessible retailers</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Contact</th>
                <th>Region</th>
                <th>Status</th>
                <th>Related accounts</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <small className="table-sub">{r.id}</small>
                  </td>
                  <td>{r.email}</td>
                  <td>{r.region}</td>
                  <td>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td>
                    <div className="retailer-links">
                      {data.accounts
                        .filter((a) => a.retailers.includes(r.name))
                        .slice(0, 3)
                        .map((a) => (
                          <button key={a.id} onClick={() => openAccount(a)}>
                            {a.name}
                          </button>
                        ))}
                    </div>
                  </td>
                  <td>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEdit(r)}
                    >
                      {can("retailers.edit") ? "Edit" : "View"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <EmptyState />}
        </div>
      </Card>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const old = typeof edit === "string" ? undefined : edit;
                const r: RetailerRecord = {
                  id: old?.id || `RET-${crypto.randomUUID().slice(0, 6)}`,
                  name: String(f.get("name")).trim(),
                  email: String(f.get("email")),
                  region: String(f.get("region")),
                  status: String(f.get("status")) as RetailerRecord["status"],
                };
                if (
                  data.retailerRecords.some(
                    (x) =>
                      x.id !== r.id &&
                      x.name.toLowerCase() === r.name.toLowerCase(),
                  )
                ) {
                  toast.error("A retailer already has that name.");
                  return;
                }
                if (
                  setData((d) => ({
                    ...d,
                    retailerRecords: old
                      ? d.retailerRecords.map((x) => (x.id === r.id ? r : x))
                      : [...d.retailerRecords, r],
                  }))
                ) {
                  toast.success("Retailer saved");
                  setEdit(null);
                }
              }}
            >
              <DialogTitle>
                {edit === "new" ? "New retailer" : "Retailer profile"}
              </DialogTitle>
              <DialogDescription>
                Retailer IDs connect account and barrel relationships. Linked
                retailer names are preserved.
              </DialogDescription>
              <fieldset className="form-grid" disabled={!can("retailers.edit")}>
                <label className="field-label full">
                  Name
                  <Input
                    name="name"
                    required
                    defaultValue={edit === "new" ? "" : edit.name}
                    readOnly={
                      edit !== "new" &&
                      data.accounts.some((a) => a.retailers.includes(edit.name))
                    }
                  />
                </label>
                <label className="field-label">
                  Email
                  <Input
                    type="email"
                    name="email"
                    defaultValue={edit === "new" ? "" : edit.email}
                  />
                </label>
                <label className="field-label">
                  Region
                  <Input
                    name="region"
                    required
                    defaultValue={edit === "new" ? "" : edit.region}
                  />
                </label>
                <label className="field-label">
                  Status
                  <Select
                    name="status"
                    options={["Active", "Onboarding", "Inactive"]}
                    defaultValue={edit === "new" ? "Onboarding" : edit.status}
                  />
                </label>
              </fieldset>
              <div className="dialog-footer">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setEdit(null)}
                >
                  Close
                </Button>
                {can("retailers.edit") && (
                  <Button type="submit">Save retailer</Button>
                )}
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

export function TeamAssignments({
  openAccount,
}: {
  openAccount: (a: Account) => void;
}) {
  const { data, setData } = useStore();
  const [query, setQuery] = useState("");
  const owners = data.users
    .filter(
      (u) =>
        u.active &&
        (u.roles.includes("Account Manager") ||
          u.roles.includes("System Admin")),
    )
    .map((u) => u.name);
  return (
    <>
      <SectionTitle
        title="Team assignments"
        subtitle="Assign Corporate Brands and Affiliates to Account Managers."
      />
      <Card>
        <div className="module-toolbar">
          <SearchField value={query} onChange={setQuery} />
          <span>
            Changes update My Accounts and account profiles immediately
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Account Manager</th>
                <th>Open tasks</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts
                .filter(
                  (a) =>
                    a.type !== "Supplier" &&
                    a.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((a) => (
                  <tr key={a.id}>
                    <td>
                      <button
                        className="identity"
                        onClick={() => openAccount(a)}
                      >
                        <AccountLogo name={a.name} color={a.color} size={30} />
                        <strong>{a.name}</strong>
                      </button>
                    </td>
                    <td>{a.type}</td>
                    <td>
                      <Select
                        label={`Manager for ${a.name}`}
                        options={[...new Set([a.manager, ...owners])]}
                        value={a.manager}
                        onChange={(e) => {
                          if (
                            setData((d) => ({
                              ...d,
                              accounts: d.accounts.map((x) =>
                                x.id === a.id
                                  ? { ...x, manager: e.target.value }
                                  : x,
                              ),
                            }))
                          )
                            toast.success("Account assignment updated");
                        }}
                      />
                    </td>
                    <td>
                      {
                        data.tasks.filter(
                          (t) =>
                            t.accountId === a.id &&
                            !["Done", "Aborted"].includes(t.status),
                        ).length
                      }
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function Activities({
  followups = false,
  openAccount,
}: {
  followups?: boolean;
  openAccount: (a: Account) => void;
}) {
  const { data, setData, actor, can } = useStore();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("List");
  const [month, setMonth] = useState("2026-10");
  const [edit, setEdit] = useState<Activity | null | "new">(null);
  const rows = data.activities.filter(
    (a) =>
      (!followups || a.kind === "Follow-up") &&
      `${a.title} ${a.owner} ${data.accounts.find((x) => x.id === a.accountId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const history = [
    ...data.accounts.flatMap((a) =>
      a.history.map((h) => ({ ...h, record: a.name })),
    ),
    ...data.tasks.flatMap((t) =>
      t.history.map((h) => ({ ...h, record: t.id })),
    ),
    ...data.cases.flatMap((c) =>
      c.history.map((h) => ({ ...h, record: c.id })),
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20);
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate(),
    offset = new Date(y, m - 1, 1).getDay();
  return (
    <>
      <SectionTitle
        title={followups ? "Follow-ups" : "Activities"}
        subtitle={`Meetings, calls, notes, and account activity visible to ${actor.name}.`}
      >
        {can("activities.edit") && (
          <Button onClick={() => setEdit("new")}>
            <Plus size={15} />
            {followups ? "Schedule follow-up" : "New activity"}
          </Button>
        )}
      </SectionTitle>
      <ViewControls
        module={followups ? "followups" : "activities"}
        snapshot={{ query, view, month }}
        defaults={{ query: "", view: "List", month: "2026-10" }}
        onApply={(v) => {
          setQuery(String(v.query || ""));
          setView(String(v.view || "List"));
          setMonth(String(v.month || "2026-10"));
        }}
      />
      {followups && (
        <Card className="settings-card">
          <PanelHeading
            title="Account follow-up dates"
            subtitle="Only accounts available to your demo roles"
          />
          {data.accounts
            .filter((a) => a.type !== "Supplier")
            .slice(0, 12)
            .map((a) => (
              <div className="followup-account" key={a.id}>
                <button className="identity" onClick={() => openAccount(a)}>
                  <AccountLogo name={a.name} color={a.color} size={30} />
                  <span>
                    <strong>{a.name}</strong>
                    <small>{a.manager}</small>
                  </span>
                </button>
                <Input
                  type="date"
                  aria-label={`Follow-up for ${a.name}`}
                  value={a.followUp}
                  disabled={!can("accounts.edit", a)}
                  onChange={(e) => {
                    if (e.target.value)
                      setData((d) => ({
                        ...d,
                        accounts: d.accounts.map((x) =>
                          x.id === a.id
                            ? { ...x, followUp: e.target.value }
                            : x,
                        ),
                      }));
                  }}
                />
              </div>
            ))}
        </Card>
      )}
      <Card className="spaced">
        <div className="module-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search activities…"
          />
          <div className="segmented">
            {["List", "Calendar"].map((v) => (
              <button
                key={v}
                className={view === v ? "selected" : ""}
                onClick={() => setView(v)}
              >
                {v === "List" ? <List size={14} /> : <CalendarDays size={14} />}
                {v}
              </button>
            ))}
          </div>
          {view === "Calendar" && (
            <Input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Calendar month"
            />
          )}
        </div>
        {view === "Calendar" ? (
          <div className="activity-calendar">
            <div className="calendar-week">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <strong key={d}>{d}</strong>
              ))}
            </div>
            <div className="calendar-grid">
              {Array.from({ length: offset }, (_, i) => (
                <div className="calendar-day empty" key={`empty-${i}`} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <div className="calendar-day" key={date}>
                    <span>{i + 1}</span>
                    {rows
                      .filter((a) => a.due.startsWith(date))
                      .map((a) => (
                        <button key={a.id} onClick={() => setEdit(a)}>
                          {a.title}
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Account</th>
                  <th>Owner</th>
                  <th>When</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.title}</strong>
                      <small className="table-sub">{a.kind}</small>
                    </td>
                    <td>
                      <button
                        className="table-link"
                        onClick={() => {
                          const account = data.accounts.find(
                            (x) => x.id === a.accountId,
                          );
                          if (account) openAccount(account);
                        }}
                      >
                        {data.accounts.find((x) => x.id === a.accountId)?.name}
                      </button>
                    </td>
                    <td>{a.owner}</td>
                    <td>
                      {new Date(a.due).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <Badge>{a.status}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEdit(a)}
                      >
                        {can("activities.edit", a) ? "Edit" : "View"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <EmptyState title="No matching activities" />}
          </div>
        )}
      </Card>
      {!followups && (
        <Card className="spaced">
          <PanelHeading
            title="Visible account & operational history"
            subtitle="Record-level activity from your authorized scope"
          />
          <div className="activity-history-list">
            {history.map((h, i) => (
              <div className="history-row" key={h.id + i}>
                <FileClock size={15} />
                <div>
                  <p>
                    <strong>{h.record}</strong> · {h.text}
                  </p>
                  <small>
                    {h.author} · {new Date(h.at).toLocaleString("en-US")}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        {edit && (
          <DialogContent>
            <ActivityForm
              key={typeof edit === "string" ? "new" : edit.id}
              activity={edit === "new" ? undefined : edit}
              kind={followups ? "Follow-up" : "Meeting"}
              close={() => setEdit(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

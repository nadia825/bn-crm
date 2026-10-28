"use client";
import { useState } from "react";
import {
  Building2,
  Users,
  Plus,
  Mail,
  Globe,
  ExternalLink,
  MessageSquare,
  Paperclip,
  Pencil,
  Clock3,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  type Account,
  type WorkItem,
  event,
  dateLabel,
  managers,
} from "@/lib/data";
import { useStore } from "@/lib/store";
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
  SectionTitle,
  SortHead,
  Toolbar,
} from "./shared";
import { toast } from "sonner";
export function Accounts({
  openAccount,
  create,
}: {
  openAccount: (a: Account) => void;
  create: () => void;
}) {
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All accounts");
  const [manager, setManager] = useState("All managers");
  const [sort, setSort] = useState("name");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);
  const rows = data.accounts
    .filter(
      (a) =>
        a.type !== "Supplier" &&
        (filter === "All accounts" ||
          a.type === filter ||
          a.status === filter) &&
        (manager === "All managers" || a.manager === manager) &&
        `${a.name} ${a.email} ${a.retailers.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        String(a[sort as keyof Account]).localeCompare(
          String(b[sort as keyof Account]),
        ) * (asc ? 1 : -1),
    );
  const doSort = (key: string) => {
    setAsc(sort === key ? !asc : true);
    setSort(key);
  };
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages - 1);
  return (
    <>
      <SectionTitle
        title="Accounts"
        subtitle="Every relationship. One connected directory."
      >
        <Button variant="outline" onClick={() => exportCSV(rows)}>
          {" "}
          <Download size={15} />
          Export
        </Button>
        <Button onClick={create}>
          <Plus size={16} />
          New account
        </Button>
      </SectionTitle>
      <div className="account-summary">
        <button
          className={filter === "All accounts" ? "active" : ""}
          onClick={() => {
            setFilter("All accounts");
            setPage(0);
          }}
        >
          All accounts{" "}
          <span>
            {data.accounts.filter((a) => a.type !== "Supplier").length}
          </span>
        </button>
        <button
          className={filter === "Corporate Brand" ? "active" : ""}
          onClick={() => {
            setFilter("Corporate Brand");
            setPage(0);
          }}
        >
          <Building2 size={15} />
          Corporate brands{" "}
          <span>
            {data.accounts.filter((a) => a.type === "Corporate Brand").length}
          </span>
        </button>
        <button
          className={filter === "Affiliate" ? "active" : ""}
          onClick={() => {
            setFilter("Affiliate");
            setPage(0);
          }}
        >
          <Users size={15} />
          Affiliates{" "}
          <span>
            {data.accounts.filter((a) => a.type === "Affiliate").length}
          </span>
        </button>
      </div>
      <Card>
        <Toolbar
          query={query}
          setQuery={(s) => {
            setQuery(s);
            setPage(0);
          }}
          manager={manager}
          setManager={(s) => {
            setManager(s);
            setPage(0);
          }}
          filter={filter}
          setFilter={(s) => {
            setFilter(s);
            setPage(0);
          }}
          filterOptions={[
            "All accounts",
            "Corporate Brand",
            "Affiliate",
            "Active",
            "Onboarding",
            "Prospect",
          ]}
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <SortHead
                    label="Account name"
                    onClick={() => doSort("name")}
                  />
                </th>
                <th>
                  <SortHead label="Type" onClick={() => doSort("type")} />
                </th>
                <th>
                  <SortHead
                    label="Account manager"
                    onClick={() => doSort("manager")}
                  />
                </th>
                <th>Email</th>
                <th>
                  <SortHead label="Status" onClick={() => doSort("status")} />
                </th>
                <th>Connected retailer</th>
                <th>Shopify</th>
                <th>Last activity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(current * 10, current * 10 + 10).map((a) => (
                <tr
                  key={a.id}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openAccount(a)}
                  onClick={() => openAccount(a)}
                >
                  <td>
                    <div className="identity">
                      <AccountLogo name={a.name} color={a.color} />
                      <div>
                        <strong>{a.name}</strong>
                        <small>{a.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`type-pill ${a.type === "Affiliate" ? "blue" : "purple"}`}
                    >
                      {a.type === "Affiliate" ? (
                        <Users size={12} />
                      ) : (
                        <Building2 size={12} />
                      )}{" "}
                      {a.type}
                    </span>
                  </td>
                  <td>
                    <div className="identity">
                      <Avatar name={a.manager} size={25} />
                      <span>{a.manager}</span>
                    </div>
                  </td>
                  <td className="muted">{a.email}</td>
                  <td>
                    <Badge>{a.status}</Badge>
                  </td>
                  <td>{a.retailers[0]}</td>
                  <td>
                    <Badge>{a.shopify}</Badge>
                  </td>
                  <td className="muted">{a.lastActivity}</td>
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
          <span>
            Showing {rows.length ? current * 10 + 1 : 0}–
            {Math.min(current * 10 + 10, rows.length)} of {rows.length} accounts
          </span>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <span>
              {current + 1} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current === pages - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
export function exportCSV(rows: Account[]) {
  const fields = [
    "name",
    "type",
    "manager",
    "email",
    "status",
    "shopify",
  ] as const;
  const csv = [
    fields.join(","),
    ...rows.map((a) =>
      fields
        .map((f) => '"' + String(a[f]).replaceAll('"', '""') + '"')
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "bn-crm-accounts.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Account export downloaded");
}
export function AccountProfile({
  id,
  onClose,
  edit,
  openItem,
  navigate,
}: {
  id: string | null;
  onClose: () => void;
  edit: (a: Account) => void;
  openItem: (i: WorkItem, k: "tasks" | "cases") => void;
  navigate: (s: string) => void;
}) {
  const { data, setData } = useStore();
  const [tab, setTab] = useState("Overview");
  const [note, setNote] = useState("");
  const a = data.accounts.find((a) => a.id === id);
  if (!a) return null;
  const tasks = data.tasks.filter((t) => t.accountId === id),
    cases = data.cases.filter((c) => c.accountId === id);
  const addNote = () => {
    if (!note.trim()) return;
    setData((d) => ({
      ...d,
      accounts: d.accounts.map((x) =>
        x.id === id
          ? {
              ...x,
              notes: [event(note.trim()), ...x.notes],
              history: [event("Added an account note."), ...x.history],
            }
          : x,
      ),
    }));
    setNote("");
    toast.success("Note added to account");
  };
  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="profile-drawer">
        <DialogDescription className="eyebrow">
          ACCOUNTS / {a.id}
        </DialogDescription>
        <div className="profile-heading">
          <AccountLogo name={a.name} color={a.color} size={58} />
          <div>
            <DialogTitle>{a.name}</DialogTitle>
            <span>
              {a.type} <span className="inline-dot">·</span> {a.email}
            </span>
          </div>
        </div>
        <div className="profile-controls">
          <Badge>{a.status}</Badge>
          <span className="identity">
            <Avatar name={a.manager} size={23} />
            {a.manager}
          </span>
          <Button variant="outline" size="sm" onClick={() => edit(a)}>
            <Pencil size={13} />
            Edit account
          </Button>
        </div>
        <div className="profile-tabs">
          {[
            "Overview",
            "Contacts",
            "Relationships",
            "Commercial",
            "Onboarding",
            "Tasks & cases",
            "Activity",
            "Notes & files",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="profile-body">
          {tab === "Overview" && (
            <>
              <div className="profile-section">
                <h3>About {a.name}</h3>
                <p>{a.description}</p>
              </div>
              <div className="detail-grid">
                <Info label="Account type" value={a.type} />
                <Info label="Account manager" value={a.manager} />
                <Info label="Email" value={a.email} />
                <Info label="Pipeline stage" value={a.stage} />
                <Info label="Next follow-up" value={dateLabel(a.followUp)} />
                <Info label="Shopify integration" value={a.shopify} />
              </div>
              <div className="profile-stats">
                <div>
                  <strong>{a.contacts.length}</strong>
                  <span>Contacts</span>
                </div>
                <div>
                  <strong>{tasks.length}</strong>
                  <span>Work items</span>
                </div>
                <div>
                  <strong>{cases.length}</strong>
                  <span>Support cases</span>
                </div>
                <div>
                  <strong>{a.retailers.length}</strong>
                  <span>Retailers</span>
                </div>
              </div>
              <div className="profile-section">
                <h3>Latest account note</h3>
                <p>{a.notes[0]?.text || "No notes yet."}</p>
                <button
                  className="text-link"
                  onClick={() => setTab("Notes & files")}
                >
                  View all notes
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
          {tab === "Contacts" && (
            <>
              <h3>People at {a.name}</h3>
              {a.contacts.map((c) => (
                <Card className="contact-card" key={c.email}>
                  <Avatar name={c.name} size={40} />
                  <div>
                    <strong>{c.name}</strong>
                    <small>{c.role}</small>
                    <span>{c.email}</span>
                  </div>
                  <Mail size={17} />
                </Card>
              ))}
              <p className="subtle">
                Contact details are fictional and use reserved .example domains.
              </p>
            </>
          )}
          {tab === "Relationships" && (
            <>
              <h3>Connected retailers</h3>
              {a.retailers.map((r) => (
                <div className="relationship-row" key={r}>
                  <span className="tile-icon blue">
                    <Building2 size={18} />
                  </span>
                  <div>
                    <strong>{r}</strong>
                    <small>Retail & fulfillment partner</small>
                  </div>
                  <Badge>Connected</Badge>
                </div>
              ))}
              <h3 className="spaced">Associated brands</h3>
              {a.type === "Corporate Brand" ? (
                <p>{a.name} is the primary brand for this account.</p>
              ) : (
                data.accounts
                  .filter(
                    (x) =>
                      x.type === "Corporate Brand" &&
                      x.retailers.some((r) => a.retailers.includes(r)),
                  )
                  .map((x) => (
                    <div className="relationship-row" key={x.id}>
                      <AccountLogo name={x.name} color={x.color} />
                      <span>{x.name}</span>
                      <Badge>{x.status}</Badge>
                    </div>
                  ))
              )}
              <h3 className="spaced">Connected barrels</h3>
              {data.barrels
                .filter((b) => b.affiliateId === id || b.supplierId === id)
                .map((b) => (
                  <div className="relationship-row" key={b.id}>
                    <strong>{b.id}</strong>
                    <span>{b.name}</span>
                    <Badge>{b.status}</Badge>
                  </div>
                ))}
            </>
          )}
          {tab === "Commercial" && (
            <>
              <h3>Commercial overview</h3>
              <div className="detail-grid">
                <Info
                  label="Partnership model"
                  value={
                    a.type === "Affiliate"
                      ? "Affiliate revenue share"
                      : "Direct brand partnership"
                  }
                />
                <Info label="Market" value="United States" />
                <Info label="Agreement" value="Sample partnership agreement" />
                <Info label="Billing cadence" value="Monthly" />
                <Info label="Sales channel" value="Direct to consumer" />
                <Info label="Currency" value="USD" />
              </div>
              <div className="info-callout">
                Commercial information is illustrative. Billing and payment
                processing are simulated.
              </div>
            </>
          )}
          {tab === "Onboarding" && (
            <>
              {a.type === "Corporate Brand" ? (
                <>
                  <h3>Brand setup</h3>
                  <div className="progress">
                    <span
                      style={{
                        width: `${(a.checks.filter(Boolean).length / 6) * 100}%`,
                      }}
                    />
                  </div>
                  {a.checks.map((done, i) => (
                    <div className="checklist-row" key={i}>
                      <span className={done ? "step-done" : "step-number"}>
                        {done ? "✓" : i + 1}
                      </span>
                      <span>
                        {
                          [
                            "Company profile",
                            "Users & access",
                            "Products",
                            "Billing & Stripe",
                            "Buy Button / checkout",
                            "Shipping & distributors",
                          ][i]
                        }
                      </span>
                      <Badge>{done ? "Done" : "Pending"}</Badge>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      onClose();
                      navigate("Brand Onboarding");
                    }}
                  >
                    Open onboarding workspace
                    <ArrowRight size={15} />
                  </Button>
                </>
              ) : (
                <>
                  <h3>Partnership readiness</h3>
                  <Info label="Current stage" value={a.stage} />
                  <Info label="Shopify" value={a.shopify} />
                  <Info label="Connected retailer" value={a.retailers[0]} />
                </>
              )}
            </>
          )}
          {tab === "Tasks & cases" && (
            <>
              <h3>Operational work · {tasks.length}</h3>
              {tasks.map((t) => (
                <button
                  className="linked-record"
                  key={t.id}
                  onClick={() => openItem(t, "tasks")}
                >
                  <span>
                    <small>{t.id}</small>
                    <strong>{t.title}</strong>
                  </span>
                  <Badge>{t.status}</Badge>
                  <ChevronRight size={15} />
                </button>
              ))}
              {!tasks.length && <p className="muted">No linked work items.</p>}
              <h3 className="spaced">Support cases · {cases.length}</h3>
              {cases.map((c) => (
                <button
                  className="linked-record"
                  key={c.id}
                  onClick={() => openItem(c, "cases")}
                >
                  <span>
                    <small>{c.id}</small>
                    <strong>{c.title}</strong>
                  </span>
                  <Badge>{c.status}</Badge>
                  <ChevronRight size={15} />
                </button>
              ))}
              {!cases.length && (
                <p className="muted">No support cases for this account.</p>
              )}
            </>
          )}
          {tab === "Activity" && (
            <>
              <h3>Account activity</h3>
              {a.history.map((h) => (
                <div className="history-row" key={h.id}>
                  <Clock3 size={16} />
                  <div>
                    <p>{h.text}</p>
                    <small>
                      {h.author} · {new Date(h.at).toLocaleString("en-US")}
                    </small>
                  </div>
                </div>
              ))}
            </>
          )}
          {tab === "Notes & files" && (
            <>
              <h3>Account notes</h3>
              <Textarea
                aria-label="Account note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add context for your team…"
              />
              <Button size="sm" disabled={!note.trim()} onClick={addNote}>
                <MessageSquare size={14} />
                Add note
              </Button>
              {a.notes.map((n) => (
                <div className="comment" key={n.id}>
                  <Avatar name={n.author} />
                  <div>
                    <strong>
                      {n.author}
                      <small>
                        {new Date(n.at).toLocaleDateString("en-US")}
                      </small>
                    </strong>
                    <p>{n.text}</p>
                  </div>
                </div>
              ))}
              <h3 className="spaced">Attachments</h3>
              <p className="subtle">
                Demo stores filenames only; file contents are not uploaded.
              </p>
              {a.attachments.map((f, i) => (
                <div className="attachment" key={f + i}>
                  <Paperclip size={16} />
                  {f}
                  <span className="subtle">Demo reference</span>
                </div>
              ))}
              <label className="upload-zone">
                <Plus size={17} />
                Attach a file reference
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const names = Array.from(e.target.files || []).map(
                      (f) => f.name,
                    );
                    if (names.length) {
                      setData((d) => ({
                        ...d,
                        accounts: d.accounts.map((x) =>
                          x.id === id
                            ? {
                                ...x,
                                attachments: [...x.attachments, ...names],
                              }
                            : x,
                        ),
                      }));
                      toast.success("File references added");
                    }
                  }}
                />
              </label>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-field">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

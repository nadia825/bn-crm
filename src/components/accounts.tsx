"use client";
import { useProductionPreview } from "./production-preview";
import { SupplierProvisionalNotice } from "./supplier-provisional";
import { useState } from "react";
import {
  Building2,
  Plus,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  Clock3,
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  ChevronRight,
} from "lucide-react";
import { type Account, type WorkItem, event, dateLabel } from "@/lib/data";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";
import { Card, Badge, Textarea, Select } from "./ui/primitives";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { AccountLogo, Avatar } from "./shared";
import { canPage } from "@/lib/access";
import { accountNextStep, type AccountSection } from "@/lib/account-directory";
import { toast } from "sonner";
export { Accounts, exportCSV } from "./account-directory";

export function AccountProfile({
  id,
  onClose,
  edit,
  openItem,
  navigate,
  initialTab = "Overview",
  createWork,
}: {
  id: string | null;
  onClose: () => void;
  edit: (a: Account) => void;
  openItem: (i: WorkItem, k: "tasks" | "cases") => void;
  navigate: (s: string) => void;
  initialTab?: AccountSection;
  createWork: () => void;
}) {
  const preview = useProductionPreview();
  const { data, setData, can, actor } = useStore((s) => ({ data: s.data, setData: s.setData, can: s.can, actor: s.actor }));
  const [tab, setTab] = useState<AccountSection>(initialTab);
  const [note, setNote] = useState("");
  const a = data.accounts.find((a) => a.id === id);
  if (!a) return null;
  const nextStep = accountNextStep(a);
  const completed = a.checks.filter(Boolean).length;
  const moreTabs: AccountSection[] = [
    "Tasks & cases",
    "Contacts",
    "Relationships",
    ...(can("billing.read") ? ["Commercial" as const] : []),
  ];
  const tasks = data.tasks.filter((t) => t.accountId === id),
    cases = data.cases.filter((c) => c.accountId === id);
  const addNote = async () => {
    if (!note.trim()) return;
    const saved = await setData((d) => ({
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
    if (!saved) return;
    setNote("");
    toast.success("Note added to account");
  };
  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="profile-drawer">
        <DialogDescription className="profile-caption">
          Account details <span>{a.id}</span>
        </DialogDescription>
        <div className="profile-heading">
          <AccountLogo name={a.name} color={a.color} size={44} />
          <div>
            <DialogTitle>{a.name}</DialogTitle>
            <span>
              {a.type === "Supplier" ? "Supplier (provisional)" : a.type}
            </span>
          </div>
        </div>
        {a.type === "Supplier" && <SupplierProvisionalNotice />}
        <div className="profile-controls">
          <Badge>{a.status}</Badge>
          <span className="identity">
            <Avatar name={a.manager} size={23} />
            {a.manager}
          </span>
          {can("tasks.create", { accountId: a.id }) && <Button size="sm" onClick={createWork}>New work request</Button>}
          <Button
            disabled={!can("accounts.edit", a)}
            variant="outline"
            size="sm"
            onClick={() => edit(a)}
          >
            <Pencil size={13} />
            Edit account
          </Button>
        </div>
        <nav className="profile-tabs" aria-label="Account sections">
          {(["Overview", "Notes & files", "Onboarding", "Activity"] as const).map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <Select
            className={`profile-more ${moreTabs.includes(tab) ? "active" : ""}`}
            aria-label="More account sections"
            value={moreTabs.includes(tab) ? tab : ""}
            onChange={(e) => {
              if (e.target.value) setTab(e.target.value as AccountSection);
            }}
          >
            <option value="" disabled>
              More
            </option>
            {moreTabs.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </nav>
        <div className="profile-body">
          {tab === "Overview" && (
            <>
              <div className="profile-summary-row">
                <span>Account owner</span>
                <strong>{a.manager}</strong>
              </div>
              {a.type === "Corporate Brand" && (
                <div className="profile-summary-row">
                  <span>Setup progress</span>
                  <strong>{completed} of 6 checks</strong>
                </div>
              )}
              <div className="profile-next-action">
                <span>
                  <ArrowUpRight size={14} />
                  Next step
                </span>
                <h3>{nextStep.label}</h3>
                <p>{nextStep.description}</p>
                <Button
                  variant="outline"
                  onClick={() =>
                    setTab(
                      a.type === "Corporate Brand" ? "Onboarding" : "Activity",
                    )
                  }
                >
                  {a.type === "Corporate Brand"
                    ? "Review onboarding"
                    : "View account activity"}
                  <ArrowRight size={14} />
                </Button>
              </div>
              <section
                className="profile-recent-activity"
                aria-label="Recent activity"
              >
                <div className="profile-section-heading">
                  <h3>Recent activity</h3>
                  <button
                    className="text-link"
                    onClick={() => setTab("Activity")}
                  >
                    View all
                    <ArrowRight size={13} />
                  </button>
                </div>
                {a.history.slice(0, 3).map((h) => (
                  <div className="history-row" key={h.id}>
                    <Clock3 size={15} />
                    <div>
                      <p>{h.text}</p>
                      <small>
                        {h.author} ·{" "}
                        {new Date(h.at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </small>
                    </div>
                  </div>
                ))}
                {!a.history.length && (
                  <p className="muted">No account activity yet.</p>
                )}
              </section>
              <details className="profile-information">
                <summary>Account information</summary>
                <div className="profile-section">
                  <h3>About {a.name}</h3>
                  <p>{a.description}</p>
                </div>
                <div className="detail-grid">
                  <Info label="Account type" value={a.type} />
                  <Info
                    label="BNX identifier"
                    value={`${a.bnxId || "Not linked"}${a.bnxVerified ? (preview ? " · Verified" : " · Verified mock") : ""}`}
                  />
                  {data.configuration.customFields
                    .filter(
                      (f) => f.scope === "All accounts" || f.scope === a.type,
                    )
                    .map((f) => (
                      <Info
                        key={f.id}
                        label={f.label}
                        value={a.customFields?.[f.id] || "—"}
                      />
                    ))}
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
              </details>
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
              <p className="subtle demo-only">
                Contact details are fictional and use reserved .example domains.
              </p>
            </>
          )}
          {tab === "Relationships" && (
            <>
              <h3>
                {a.type === "Supplier"
                  ? "Illustrative retailer links"
                  : "Connected retailers"}
              </h3>
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
              <h3 className="spaced">
                {a.type === "Supplier"
                  ? "Illustrative brand links"
                  : "Associated brands"}
              </h3>
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
              <h3 className="spaced">
                {a.type === "Supplier"
                  ? "Illustrative barrel links"
                  : "Connected barrels"}
              </h3>
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
              <div className="info-callout demo-only">
                Commercial information is illustrative. Billing and payment
                processing are simulated.
              </div>
            </>
          )}
          {tab === "Onboarding" && (
            <>
              {a.type === "Corporate Brand" ? (
                <>
                  <div className="profile-section-heading">
                    <h3>Launch requirements</h3>
                    <span>{completed} / 6</span>
                  </div>
                  <div
                    className="progress"
                    role="progressbar"
                    aria-label="Completed setup checks"
                    aria-valuemin={0}
                    aria-valuemax={6}
                    aria-valuenow={completed}
                  >
                    <span
                      style={{
                        width: `${(a.checks.filter(Boolean).length / 6) * 100}%`,
                      }}
                    />
                  </div>
                  {a.checks.map((done, i) => (
                    <div className="checklist-row" key={i}>
                      <span className={done ? "step-done" : "step-number"}>
                        {done ? <Check size={14} /> : <Circle size={14} />}
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
                  <p className="profile-onboarding-note">
                    {nextStep.description}
                  </p>
                  <Button
                    disabled={!canPage(actor, "Brand Onboarding", data)}
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
              <Button
                size="sm"
                disabled={!note.trim() || !can("accounts.note", a)}
                onClick={addNote}
              >
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
              <p className="subtle demo-only">
                Demo stores filenames only; file contents are not uploaded.
              </p>
              {a.attachments.map((f, i) => (
                <div className="attachment" key={f + i}>
                  <Paperclip size={16} />
                  {f}
                  <span className="subtle demo-only">Demo reference</span>
                </div>
              ))}
              <label className="upload-zone">
                <Plus size={17} />
                Attach a file reference
                <input
                  type="file"
                  disabled={!can("accounts.note", a)}
                  multiple
                  onChange={async (e) => {
                    const names = Array.from(e.target.files || []).map(
                      (f) => f.name,
                    );
                    if (names.length) {
                      if (!(await setData((d) => ({
                        ...d,
                        accounts: d.accounts.map((x) =>
                          x.id === id
                            ? {
                                ...x,
                                attachments: [...x.attachments, ...names],
                              }
                            : x,
                        ),
                      })))) return;
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

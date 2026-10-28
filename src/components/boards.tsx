"use client";
import { useState } from "react";
import {
  Plus,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Store,
  ChevronRight,
  GripVertical,
  Check,
  Flag,
  Clock3,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  affiliateStages,
  supplierStages,
  workStages,
  caseStages,
  managers,
  event,
  dateLabel,
  type Account,
  type WorkItem,
} from "@/lib/data";
import { Card, Badge, Select, Textarea } from "./ui/primitives";
import { Button } from "./ui/button";
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
  Toolbar,
  SortHead,
} from "./shared";
export function Kanban<T extends { id: string }>({
  records,
  stages,
  status,
  renderCard,
  onMove,
}: {
  records: T[];
  stages: string[];
  status: (r: T) => string;
  renderCard: (r: T) => React.ReactNode;
  onMove: (id: string, stage: string) => void;
}) {
  const [over, setOver] = useState<string | null>(null);
  return (
    <div className="kanban">
      {stages.map((stage, i) => (
        <section
          key={stage}
          className={`kanban-column ${over === stage ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(stage);
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            if (records.some((r) => r.id === id)) onMove(id, stage);
            setOver(null);
          }}
        >
          <div className="kanban-heading">
            <span>
              <i
                style={{
                  background: [
                    "#b0a1c5",
                    "#a77ee4",
                    "#649cd5",
                    "#e4b459",
                    "#65b295",
                    "#9991d3",
                    "#67ae8c",
                  ][i % 7],
                }}
              />
              {stage}
            </span>
            <small>{records.filter((r) => status(r) === stage).length}</small>
          </div>
          <div className="kanban-cards">
            {records
              .filter((r) => status(r) === stage)
              .map((r) => (
                <div
                  className="draggable-card"
                  key={r.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", r.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setOver(null)}
                >
                  {renderCard(r)}
                </div>
              ))}
            {!records.some((r) => status(r) === stage) && (
              <div className="empty-column">Drop a record here</div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
export function Pipeline({
  supplier = false,
  openAccount,
  create,
}: {
  supplier?: boolean;
  openAccount: (a: Account) => void;
  create: () => void;
}) {
  const { data, setData } = useStore();
  const [query, setQuery] = useState("");
  const [manager, setManager] = useState("All managers");
  const [filter, setFilter] = useState("All stages");
  const [view, setView] = useState(supplier ? "list" : "board");
  const stages = supplier ? supplierStages : affiliateStages;
  const all = data.accounts.filter(
    (a) => a.type === (supplier ? "Supplier" : "Affiliate"),
  );
  const rows = all.filter(
    (a) =>
      (manager === "All managers" || a.manager === manager) &&
      (filter === "All stages" || a.stage === filter) &&
      `${a.name} ${a.retailers.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const move = (id: string, stage: string) => {
    setData((d) => ({
      ...d,
      accounts: d.accounts.map((a) =>
        a.id === id
          ? {
              ...a,
              stage,
              status:
                stage === "Live" || stage === "Active"
                  ? "Active"
                  : ["Rejected", "On Hold"].includes(stage)
                    ? stage
                    : "Prospect",
              lastActivity: "Just now",
              history: [event(`Moved to ${stage}.`), ...a.history],
            }
          : a,
      ),
    }));
    toast.success(`Moved to ${stage}`);
  };
  return (
    <>
      <SectionTitle
        title={supplier ? "Supplier pipeline" : "Affiliate pipeline"}
        subtitle={
          supplier
            ? "Build stronger sourcing partnerships, from prospect to active supplier."
            : "Turn promising conversations into lasting partnerships."
        }
      >
        <Button onClick={create}>
          <Plus size={16} />
          {supplier ? "New supplier" : "New affiliate"}
        </Button>
      </SectionTitle>
      <div className="pipeline-kpis">
        <span>
          <strong>{all.length}</strong>Total{" "}
          {supplier ? "suppliers" : "affiliates"}
        </span>
        <span>
          <i className="dot green-dot" />
          <strong>{all.filter((a) => a.status === "Active").length}</strong>
          Active partnerships
        </span>
        <span>
          <strong>{supplier ? data.barrels.length : all.filter((a) => a.shopify === "Connected").length}</strong>
          {supplier ? "Connected barrels" : "Shopify connected"}
        </span>
        <span className="subtle">
          Drag cards to update a stage. Open a card for details.
        </span>
      </div>
      <Toolbar
        query={query}
        setQuery={setQuery}
        manager={manager}
        setManager={setManager}
        filter={filter}
        setFilter={setFilter}
        filterOptions={["All stages", ...stages]}
        view={view}
        setView={setView}
      />
      {view === "board" ? (
        <Kanban
          records={rows}
          stages={filter === "All stages" ? stages : [filter]}
          status={(r) => r.stage}
          onMove={move}
          renderCard={(a) => (
            <>
              <button
                className="pipeline-card-main"
                onClick={() => openAccount(a)}
              >
                <div className="card-top">
                  <AccountLogo name={a.name} color={a.color} size={34} />
                  <GripVertical size={13} className="muted" />
                </div>
                <h4>{a.name}</h4>
                <span className="identity card-manager">
                  <Avatar name={a.manager} size={20} />
                  {a.manager}
                </span>
                <div className="pipeline-card-meta">
                  <Badge>{a.shopify}</Badge>
                  <span>
                    <Store size={13} />
                    {a.retailers[0]}
                  </span>
                </div>
              </button>
              <div className="kanban-card-footer">
                <span>
                  <Clock3 size={12} />
                  {a.lastActivity}
                </span>
                <span>
                  <CalendarDays size={12} />
                  {dateLabel(a.followUp)}
                </span>
              </div>
            </>
          )}
        />
      ) : (
        <Card>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Manager</th>
                  <th>Pipeline stage</th>
                  <th>Retailer</th>
                  <th>Shopify</th>
                  <th>Next follow-up</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td onClick={() => openAccount(a)}>
                      <div className="identity">
                        <AccountLogo name={a.name} color={a.color} />
                        <strong>{a.name}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="identity">
                        <Avatar name={a.manager} size={24} />
                        {a.manager}
                      </div>
                    </td>
                    <td>
                      <Select
                        label={`Stage for ${a.name}`}
                        options={stages}
                        value={a.stage}
                        onChange={(e) => move(a.id, e.target.value)}
                      />
                    </td>
                    <td>{a.retailers[0]}</td>
                    <td>
                      <Badge>{a.shopify}</Badge>
                    </td>
                    <td>{dateLabel(a.followUp)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Open ${a.name}`}
                        onClick={() => openAccount(a)}
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
    </>
  );
}
export function WorkBoard({
  kind = "tasks",
  taskView = false,
  openItem,
  create,
}: {
  kind?: "tasks" | "cases";
  taskView?: boolean;
  openItem: (i: WorkItem, k: "tasks" | "cases") => void;
  create: () => void;
}) {
  const { data, setData } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [manager, setManager] = useState("All managers");
  const [view, setView] = useState(
    kind === "cases" || taskView ? "list" : "board",
  );
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState("due");
  const [asc, setAsc] = useState(true);
  const stages = kind === "cases" ? caseStages : workStages;
  const rows = data[kind]
    .filter(
      (r) =>
        (filter === "All statuses" || r.status === filter) &&
        (manager === "All managers" || r.assignee === manager) &&
        (!mine || r.assignee === "Olivia Parker") &&
        `${r.title} ${r.id} ${data.accounts.find((a) => a.id === r.accountId)?.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        String(a[sort as keyof WorkItem]).localeCompare(
          String(b[sort as keyof WorkItem]),
        ) * (asc ? 1 : -1),
    );
  const move = (id: string, status: string) => {
    const item = data[kind].find((x) => x.id === id);
    if (
      kind === "cases" &&
      ["Resolved", "Closed"].includes(status) &&
      !item?.resolution.trim()
    ) {
      toast.info("Add a resolution before resolving this case.");
      if (item) openItem(item, kind);
      return;
    }
    setData((d) => ({
      ...d,
      [kind]: d[kind].map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              history: [event(`Status changed to ${status}.`), ...t.history],
            }
          : t,
      ),
    }));
    toast.success(`Status updated to ${status}`);
  };
  const isCase = kind === "cases";
  const headings = isCase
    ? ["Support cases", "Thoughtful support for every brand and affiliate."]
    : taskView
      ? ["Tasks & activities", "The right next step, at the right time."]
      : ["Work board", "Keep your business operations moving, together."];
  return (
    <>
      <SectionTitle title={headings[0]} subtitle={headings[1]}>
        <Button onClick={create}>
          <Plus size={16} />
          {isCase ? "New case" : "New work request"}
        </Button>
      </SectionTitle>
      {taskView ? (
        <div className="account-summary">
          <button
            className={!mine ? "active" : ""}
            onClick={() => setMine(false)}
          >
            All team tasks <span>{data.tasks.length}</span>
          </button>
          <button
            className={mine ? "active" : ""}
            onClick={() => setMine(true)}
          >
            My tasks{" "}
            <span>
              {data.tasks.filter((t) => t.assignee === "Olivia Parker").length}
            </span>
          </button>
        </div>
      ) : (
        <div className="pipeline-kpis">
          <span>
            <strong>{data[kind].length}</strong>Total{" "}
            {isCase ? "cases" : "work items"}
          </span>
          <span>
            <i className="dot purple-dot" />
            <strong>
              {
                data[kind].filter(
                  (t) =>
                    !["Done", "Aborted", "Resolved", "Closed"].includes(
                      t.status,
                    ),
                ).length
              }
            </strong>
            Open
          </span>
          <span>
            <i className="dot amber-dot" />
            <strong>
              {data[kind].filter((t) => t.priority === "Urgent").length}
            </strong>
            Urgent priority
          </span>
          <span className="subtle">
            {isCase
              ? "Connected to account profiles"
              : "Business operations · Bottle Nexus Team"}
          </span>
        </div>
      )}
      <Toolbar
        query={query}
        setQuery={setQuery}
        manager={manager}
        setManager={setManager}
        filter={filter}
        setFilter={setFilter}
        filterOptions={["All statuses", ...stages]}
        view={view}
        setView={setView}
      />
      {view === "board" ? (
        <Kanban
          records={rows}
          stages={filter === "All statuses" ? stages : [filter]}
          status={(r) => r.status}
          onMove={move}
          renderCard={(r) => (
            <>
              <button
                className="work-card-main"
                onClick={() => openItem(r, kind)}
              >
                <div className="card-top">
                  <small>{r.id}</small>
                  <Badge>{r.priority}</Badge>
                </div>
                <h4>{r.title}</h4>
                <span className="account-chip">
                  {data.accounts.find((a) => a.id === r.accountId)?.name}
                </span>
                <span className="category-label">{r.category}</span>
              </button>
              <div className="kanban-card-footer">
                <span>
                  <CalendarDays size={12} />
                  {dateLabel(r.due)}
                </span>
                <span>
                  <MessageSquare size={12} />
                  {r.comments.length}
                  {r.attachments.length > 0 && <Paperclip size={12} />}
                  <Avatar name={r.assignee} size={23} />
                </span>
              </div>
            </>
          )}
        />
      ) : (
        <Card>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>
                    <SortHead
                      label={isCase ? "Case" : "Task"}
                      onClick={() => {
                        setSort("title");
                        setAsc(!asc);
                      }}
                    />
                  </th>
                  <th>Related account</th>
                  <th>Status</th>
                  <th>
                    <SortHead
                      label="Priority"
                      onClick={() => {
                        setSort("priority");
                        setAsc(!asc);
                      }}
                    />
                  </th>
                  <th>Assignee</th>
                  <th>
                    <SortHead
                      label="Due date"
                      onClick={() => {
                        setSort("due");
                        setAsc(!asc);
                      }}
                    />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="record-id" onClick={() => openItem(r, kind)}>
                      {r.id}
                    </td>
                    <td onClick={() => openItem(r, kind)}>
                      <strong>{r.title}</strong>
                      <small className="table-sub">{r.category}</small>
                    </td>
                    <td onClick={() => openItem(r, kind)}>
                      {data.accounts.find((a) => a.id === r.accountId)?.name}
                    </td>
                    <td>
                      <Select
                        label={`Status for ${r.id}`}
                        value={r.status}
                        options={stages}
                        onChange={(e) => move(r.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <Badge>{r.priority}</Badge>
                    </td>
                    <td>
                      <span className="identity">
                        <Avatar name={r.assignee} size={25} />
                        {r.assignee.split(" ")[0]}
                      </span>
                    </td>
                    <td
                      className={
                        r.due < "2026-10-28" &&
                        !["Done", "Closed", "Resolved", "Aborted"].includes(
                          r.status,
                        )
                          ? "overdue"
                          : ""
                      }
                    >
                      {dateLabel(r.due)}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Open ${r.id}`}
                        onClick={() => openItem(r, kind)}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <EmptyState />}
          </div>
          <div className="table-footer">
            {rows.length} {isCase ? "cases" : "tasks"} · Changes saved locally
          </div>
        </Card>
      )}
    </>
  );
}
export function WorkDetail({
  selected,
  onClose,
  edit,
  openAccount,
  openLinkedCase,
}: {
  selected: { id: string; kind: "tasks" | "cases" } | null;
  onClose: () => void;
  edit: (r: WorkItem, k: "tasks" | "cases") => void;
  openAccount: (a: Account) => void;
  openLinkedCase: (i: WorkItem) => void;
}) {
  const { data, setData } = useStore();
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState("Comments");
  if (!selected) return null;
  const { id, kind } = selected;
  const r = data[kind].find((t) => t.id === id);
  if (!r) return null;
  const account = data.accounts.find((a) => a.id === r.accountId)!;
  const update = (patch: Partial<WorkItem>, history?: string) =>
    setData((d) => ({
      ...d,
      [kind]: d[kind].map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              history: history ? [event(history), ...t.history] : t.history,
            }
          : t,
      ),
    }));
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="profile-drawer work-drawer">
        <DialogDescription className="eyebrow">
          {kind === "cases" ? "SUPPORT CASE" : "BUSINESS OPERATIONS"} / {r.id}
        </DialogDescription>
        <DialogTitle className="work-detail-title">{r.title}</DialogTitle>
        <div className="profile-controls">
          <Badge>{r.priority}</Badge>
          <Badge>{r.category}</Badge>
          <Button variant="outline" size="sm" onClick={() => edit(r, kind)}>
            Edit details
          </Button>
        </div>
        <div className="profile-body">
          <div className="detail-grid">
            <label className="field-label">
              Status
              <Select
                label="Record status"
                value={r.status}
                options={kind === "cases" ? caseStages : workStages}
                onChange={(e) => {
                  const status = e.target.value;
                  if (
                    kind === "cases" &&
                    ["Resolved", "Closed"].includes(status) &&
                    !r.resolution.trim()
                  ) {
                    toast.error("Add a resolution before resolving this case.");
                    return;
                  }
                  update({ status }, `Status changed to ${status}.`);
                  toast.success("Status updated");
                }}
              />
            </label>
            <label className="field-label">
              Assigned owner
              <Select
                label="Assigned owner"
                value={r.assignee}
                options={managers}
                onChange={(e) =>
                  update(
                    { assignee: e.target.value },
                    `Assigned to ${e.target.value}.`,
                  )
                }
              />
            </label>
            <div className="info-field">
              <span>Due date</span>
              <strong>{dateLabel(r.due)}</strong>
            </div>
            <label className="field-label">
              Follow-up reminder
              <Select
                label="Follow-up reminder"
                options={[
                  "On due date",
                  "1 day before",
                  "3 days before",
                  "None",
                ]}
                value={r.reminder}
                onChange={(e) => {
                  update(
                    { reminder: e.target.value },
                    `Reminder set to ${e.target.value}.`,
                  );
                  toast.success("Demo reminder saved");
                }}
              />
            </label>
          </div>
          <button
            className="linked-account"
            onClick={() => openAccount(account)}
          >
            <AccountLogo name={account.name} color={account.color} />
            <span>
              <small>Related account</small>
              <strong>{account.name}</strong>
            </span>
            <ArrowRight size={16} />
          </button>
          {kind === "tasks" && r.caseId && (
            <button
              className="linked-record"
              onClick={() => {
                const c = data.cases.find((c) => c.id === r.caseId);
                if (c) openLinkedCase(c);
              }}
            >
              <span>
                <small>Linked support case</small>
                <strong>
                  {r.caseId} ·{" "}
                  {data.cases.find((c) => c.id === r.caseId)?.title}
                </strong>
              </span>
              <ArrowRight size={15} />
            </button>
          )}
          <div className="profile-section">
            <h3>Description</h3>
            <p>{r.description}</p>
          </div>
          {kind === "cases" && (
            <div className="profile-section">
              <h3>Resolution</h3>
              <Textarea
                aria-label="Case resolution"
                placeholder="Document the outcome before resolving the case…"
                value={r.resolution}
                onChange={(e) => {
                  const resolution = e.target.value;
                  const reopen =
                    !resolution.trim() &&
                    ["Resolved", "Closed"].includes(r.status);
                  update(
                    {
                      resolution,
                      ...(reopen ? { status: "In Progress" } : {}),
                    },
                    reopen ? "Resolution cleared; case reopened." : undefined,
                  );
                }}
              />
              <span className="subtle">
                Saved automatically in this browser.
              </span>
            </div>
          )}
          <h3>Attachments</h3>
          <p className="subtle">
            Demo file references. Contents are not uploaded.
          </p>
          {r.attachments.map((f, i) => (
            <div className="attachment" key={f + i}>
              <Paperclip size={15} />
              {f}
            </div>
          ))}
          <label className="upload-zone">
            <Plus size={15} />
            Add file reference
            <input
              type="file"
              multiple
              onChange={(e) => {
                const names = Array.from(e.target.files || []).map(
                  (f) => f.name,
                );
                if (names.length) {
                  update(
                    { attachments: [...r.attachments, ...names] },
                    "Added attachment references.",
                  );
                  toast.success("File references added");
                }
              }}
            />
          </label>
          <div className="profile-tabs spaced">
            {["Comments", "Activity history"].map((t) => (
              <button
                className={tab === t ? "active" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t} {t === "Comments" && <small>{r.comments.length}</small>}
              </button>
            ))}
          </div>
          {tab === "Comments" ? (
            <>
              <Textarea
                aria-label="New comment"
                placeholder="Share an update with your team…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!comment.trim()}
                onClick={() => {
                  update(
                    { comments: [...r.comments, event(comment.trim())] },
                    "Added a comment.",
                  );
                  setComment("");
                  toast.success("Comment added");
                }}
              >
                <MessageSquare size={14} />
                Add comment
              </Button>
              {r.comments.map((c) => (
                <div className="comment" key={c.id}>
                  <Avatar name={c.author} />
                  <div>
                    <strong>
                      {c.author}
                      <small>
                        {new Date(c.at).toLocaleDateString("en-US")}
                      </small>
                    </strong>
                    <p>{c.text}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            r.history.map((h) => (
              <div className="history-row" key={h.id}>
                <Clock3 size={16} />
                <div>
                  <p>{h.text}</p>
                  <small>
                    {h.author} · {new Date(h.at).toLocaleString("en-US")}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";
import { BulkWorkActions } from "./bulk-work-actions";
import { todayDate } from "@/lib/dates";
import { SupplierProvisionalNotice } from "./supplier-provisional";
import { useEffect, useState } from "react";
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
import { ViewControls, ColumnVisibility } from "./saved-views";
import { toast } from "sonner";
import { scopedItems, WORKSPACES, type WorkspaceId } from "@/lib/workspaces";
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
  canMove = () => true,
}: {
  canMove?: (r: T) => boolean;
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
            if (records.some((r) => r.id === id && canMove(r)))
              onMove(id, stage);
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
                  draggable={canMove(r)}
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
  const { data, setData, can, actor } = useStore((s) => ({ data: s.data, setData: s.setData, can: s.can, actor: s.actor }));
  const [query, setQuery] = useState("");
  const [manager, setManager] = useState("All managers");
  const [filter, setFilter] = useState("All stages");
  const [view, setView] = useState(supplier ? "list" : "board");
  const [lifecycle, setLifecycle] = useState("Main pipeline");
  const alternative = ["On Hold", "Rejected", "Inactive"];
  const allStages = supplier
    ? data.configuration.supplierStages
    : [...affiliateStages, ...data.configuration.affiliateExtras];
  const stages = supplier
    ? allStages
    : allStages.filter((s) =>
        lifecycle === "Alternative states"
          ? alternative.includes(s)
          : !alternative.includes(s),
      );
  const all = data.accounts.filter(
    (a) => a.type === (supplier ? "Supplier" : "Affiliate"),
  );
  const rows = all.filter(
    (a) =>
      (supplier || stages.includes(a.stage)) &&
      (manager === "All managers" || a.manager === manager) &&
      (filter === "All stages" || a.stage === filter) &&
      `${a.name} ${a.retailers.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const move = async (id: string, stage: string) => {
    const saved = await setData((d) => ({
      ...d,
      accounts: d.accounts.map((a) =>
        a.id === id
          ? {
              ...a,
              stage,
              status:
                stage === "Live" || stage === "Active"
                  ? "Active"
                  : ["Rejected", "On Hold", "Inactive"].includes(stage)
                    ? stage
                    : "Prospect",
              lastActivity: "Just now",
              history: [event(`Moved to ${stage}.`), ...a.history],
            }
          : a,
      ),
    }));
    if (!saved) return;
    toast.success(`Moved to ${stage}`);
  };
  return (
    <>
      <SectionTitle
        title={supplier ? "Supplier pipeline" : "Affiliate pipeline"}
        subtitle={
          supplier
            ? "Provisional supplier workflow · Relationships with brands and affiliates are still to be defined."
            : "Turn promising conversations into lasting partnerships."
        }
      >
        <Button
          disabled={
            !can("accounts.create", {
              type: supplier ? "Supplier" : "Affiliate",
              manager: actor.name,
            })
          }
          onClick={create}
        >
          <Plus size={16} />
          {supplier ? "New mock supplier" : "New affiliate"}
        </Button>
      </SectionTitle>
      {supplier && <SupplierProvisionalNotice />}
      <div className="pipeline-kpis">
        <span>
          <strong>{all.length}</strong>Total{" "}
          {supplier ? "suppliers" : "affiliates"}
        </span>
        <span>
          <i className="dot green-dot" />
          <strong>{all.filter((a) => a.status === "Active").length}</strong>
          {supplier ? "Mock active suppliers" : "Active partnerships"}
        </span>
        <span>
          <strong>
            {supplier
              ? data.barrels.length
              : all.filter((a) => a.shopify === "Connected").length}
          </strong>
          {supplier ? "Illustrative barrel links" : "Shopify connected"}
        </span>
        <span className="subtle">
          Drag cards to update a stage. Open a card for details.
        </span>
      </div>
      {!supplier && (
        <div className="account-summary">
          {["Main pipeline", "Alternative states"].map((v) => (
            <button
              key={v}
              className={lifecycle === v ? "active" : ""}
              onClick={() => {
                setLifecycle(v);
                setFilter("All stages");
              }}
            >
              {v}
              <span>
                {
                  all.filter((a) =>
                    v === "Alternative states"
                      ? alternative.includes(a.stage)
                      : !alternative.includes(a.stage),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
      )}
      <ViewControls
        module={supplier ? "suppliers" : "affiliates"}
        snapshot={{ query, manager, filter, view, lifecycle }}
        defaults={{ view: supplier ? "list" : "board" }}
        onApply={(v) => {
          setQuery(String(v.query || ""));
          setManager(String(v.manager || "All managers"));
          setFilter(String(v.filter || "All stages"));
          setView(String(v.view || (supplier ? "list" : "board")));
          setLifecycle(String(v.lifecycle || "Main pipeline"));
        }}
      />
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
          canMove={(a) => can("pipeline.edit", a)}
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
                        options={allStages}
                        disabled={!can("pipeline.edit", a)}
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
  workspace = "operations",
  kind = "tasks",
  taskView = false,
  openItem,
  create,
}: {
  workspace?: WorkspaceId;
  kind?: "tasks" | "cases";
  taskView?: boolean;
  openItem: (i: WorkItem, k: "tasks" | "cases") => void;
  create: () => void;
}) {
  const { data, setData, can, actor } = useStore((s) => ({ data: s.data, setData: s.setData, can: s.can, actor: s.actor }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [manager, setManager] = useState("All managers");
  const [view, setView] = useState(
    kind === "cases" || taskView ? "list" : "board",
  );
  const [mine, setMine] = useState(
    actor.roles.some((r) =>
      ["Account Manager", "Operations Member"].includes(r),
    ),
  );
  const [sort, setSort] = useState("due");
  const [asc, setAsc] = useState(true);
  const columns = [
    "ID",
    "Summary",
    "Account",
    "Status",
    "Priority",
    "Assignee",
    "Due date",
    "Open",
  ];
  const [selectedColumns, setSelectedColumns] = useState(columns);
  const viewModule = `work-${workspace}-${kind}`;
  const stages = kind === "cases" ? caseStages : workStages;
  const records = scopedItems(data, kind, workspace);
  const rows = records
    .filter(
      (r) =>
        (filter === "All statuses" || r.status === filter) &&
        (manager === "All managers" || r.assignee === manager) &&
        (!mine || r.assignee === actor.name) &&
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
  useEffect(() => { setSelectedIds([]); }, [query, filter, manager, mine, workspace, kind]);
  const editable = rows.filter((r) => can(kind === "cases" ? "cases.edit" : "tasks.edit", r));
  const selection = editable.filter((r) => selectedIds.includes(r.id));
  const toggle = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const selectionBox = (r: WorkItem) => can(kind === "cases" ? "cases.edit" : "tasks.edit", r) &&
    <input className="record-checkbox" type="checkbox" aria-label={`Select ${r.id}`} checked={selectedIds.includes(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} />;
  const move = async (id: string, status: string) => {
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
    const saved = await setData((d) => ({
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
    if (!saved) return;
    toast.success(`Status updated to ${status}`);
  };
  const isCase = kind === "cases";
  const canCreate = can(isCase ? "cases.create" : "tasks.create");
  const creationHint = actor.roles.includes("Operations Member")
    ? "Operations Members update assigned work. To create and assign work in this demo, select Marcus Reed — Operations Manager in the Demo role switcher."
    : `Your current demo role cannot create ${isCase ? "support cases" : "work requests"}. Select an authorized role in the Demo role switcher.`;
  const headings = isCase
    ? ["Support cases", "Thoughtful support for every brand and affiliate."]
    : taskView
      ? ["Tasks & activities", "The right next step, at the right time."]
      : ["Work board", "Keep your business operations moving, together."];
  return (
    <>
      <SectionTitle
        title={headings[0]}
        subtitle={`${WORKSPACES[workspace].name} workspace · ${headings[1]}`}
      >
        <Button
          disabled={!canCreate}
          aria-describedby={!canCreate ? "work-creation-permission" : undefined}
          onClick={create}
        >
          <Plus size={16} />
          {isCase ? "New case" : "New work request"}
        </Button>
      </SectionTitle>
      {!canCreate && (
        <div id="work-creation-permission" className="info-callout spaced">
          <span>{creationHint}</span>
        </div>
      )}
      {taskView ? (
        <div className="account-summary">
          <button
            className={!mine ? "active" : ""}
            onClick={() => setMine(false)}
          >
            {workspace === "operations"
              ? "All team tasks"
              : `All ${WORKSPACES[workspace].name.toLowerCase()} tasks`}{" "}
            <span>{records.length}</span>
          </button>
          <button
            className={mine ? "active" : ""}
            onClick={() => setMine(true)}
          >
            My tasks{" "}
            <span>
              {records.filter((t) => t.assignee === actor.name).length}
            </span>
          </button>
        </div>
      ) : (
        <div className="pipeline-kpis">
          <span>
            <strong>{records.length}</strong>Total{" "}
            {isCase ? "cases" : "work items"}
          </span>
          <span>
            <i className="dot purple-dot" />
            <strong>
              {
                records.filter(
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
              {records.filter((t) => t.priority === "Urgent").length}
            </strong>
            Urgent priority
          </span>
          <span className="subtle">
            {isCase
              ? "Connected to account profiles"
              : `${WORKSPACES[workspace].name} workspace · Connected business records`}
          </span>
        </div>
      )}
      <ViewControls
        module={viewModule}
        snapshot={{ query, filter, manager, view, mine, sort, asc }}
        defaults={{
          view: kind === "cases" || taskView ? "list" : "board",
          columns,
        }}
        columns={columns}
        selectedColumns={selectedColumns}
        onColumns={(value) => setSelectedColumns(["ID", ...value.filter((column) => column !== "ID" && columns.includes(column))])}
        requiredColumns={["ID"]}
        onApply={(v) => {
          setQuery(String(v.query || ""));
          setFilter(String(v.filter || "All statuses"));
          setManager(String(v.manager || "All managers"));
          setView(
            String(v.view || (kind === "cases" || taskView ? "list" : "board")),
          );
          setMine(v.mine === true);
          setSort(String(v.sort || "due"));
          setAsc(v.asc !== false);
        }}
      />
      <ColumnVisibility
        module={viewModule}
        columns={columns}
        selected={selectedColumns}
      />
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
      {editable.length > 0 && <div className="selection-controls"><label><input type="checkbox" className="record-checkbox" aria-label="Select all visible work" checked={selection.length === editable.length && editable.length > 0} ref={(node) => { if (node) node.indeterminate = selection.length > 0 && selection.length < editable.length; }} onChange={(e) => setSelectedIds(e.target.checked ? editable.map((r) => r.id) : [])} /> Select all visible ({editable.length})</label><span>Select records to update them together.</span></div>}
      <BulkWorkActions kind={kind} selected={selection} clear={() => setSelectedIds([])} />
      {view === "board" ? (
        <Kanban
          records={rows}
          stages={filter === "All statuses" ? stages : [filter]}
          canMove={(r) =>
            can(kind === "cases" ? "cases.edit" : "tasks.edit", r)
          }
          status={(r) => r.status}
          onMove={move}
          renderCard={(r) => (
            <>
              <div className="work-card-selection">{selectionBox(r)}</div>
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
        <Card data-view-table={viewModule}>
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
                      <span className="work-id-cell">{selectionBox(r)}<button onClick={() => openItem(r, kind)}>{r.id}</button></span>
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
                        disabled={
                          !can(
                            kind === "cases" ? "cases.edit" : "tasks.edit",
                            r,
                          )
                        }
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
                        r.due < todayDate() &&
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
  const { data, setData, can, actor } = useStore((s) => ({ data: s.data, setData: s.setData, can: s.can, actor: s.actor }));
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState("Comments");
  if (!selected) return null;
  const { id, kind } = selected;
  const r = data[kind].find((t) => t.id === id);
  if (!r) return null;
  const account = data.accounts.find((a) => a.id === r.accountId)!;
  const update = async (patch: Partial<WorkItem>, history?: string) =>
    await setData((d) => ({
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
          <Button
            disabled={!can(kind === "cases" ? "cases.edit" : "tasks.edit", r)}
            variant="outline"
            size="sm"
            onClick={() => edit(r, kind)}
          >
            Edit details
          </Button>
        </div>
        <div className="profile-body">
          <div className="detail-grid">
            <label className="field-label">
              Status
              <Select
                disabled={
                  !can(kind === "cases" ? "cases.edit" : "tasks.edit", r)
                }
                label="Record status"
                value={r.status}
                options={kind === "cases" ? caseStages : workStages}
                onChange={async (e) => {
                  const status = e.target.value;
                  if (
                    kind === "cases" &&
                    ["Resolved", "Closed"].includes(status) &&
                    !r.resolution.trim()
                  ) {
                    toast.error("Add a resolution before resolving this case.");
                    return;
                  }
                  if (!(await update({ status }, `Status changed to ${status}.`))) return;
                  toast.success("Status updated");
                }}
              />
            </label>
            <label className="field-label">
              Assigned owner
              <Select
                disabled={
                  !can(kind === "cases" ? "cases.assign" : "tasks.assign", r) ||
                  !actor.roles.some((r) =>
                    ["System Admin", "Operations Manager"].includes(r),
                  )
                }
                label="Assigned owner"
                value={r.assignee}
                options={Array.from(
                  new Set([
                    r.assignee,
                    ...data.users.filter((u) => u.active).map((u) => u.name),
                  ]),
                )}
                onChange={async (e) =>
                  await update(
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
                disabled={
                  !can(kind === "cases" ? "cases.edit" : "tasks.edit", r)
                }
                label="Follow-up reminder"
                options={[
                  "On due date",
                  "1 day before",
                  "3 days before",
                  "None",
                ]}
                value={r.reminder}
                onChange={async (e) => {
                  if (!(await update(
                    { reminder: e.target.value },
                    `Reminder set to ${e.target.value}.`,
                  ))) return;
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
                readOnly={!can("cases.edit", r)}
                aria-label="Case resolution"
                placeholder="Document the outcome before resolving the case…"
                value={r.resolution}
                onChange={async (e) => {
                  const resolution = e.target.value;
                  const reopen =
                    !resolution.trim() &&
                    ["Resolved", "Closed"].includes(r.status);
                  if (!(await update(
                    {
                      resolution,
                      ...(reopen ? { status: "In Progress" } : {}),
                    },
                    reopen ? "Resolution cleared; case reopened." : undefined,
                  ))) return;
                }}
              />
              <span className="subtle">
                Changes save automatically.
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
              disabled={!can(kind === "cases" ? "cases.edit" : "tasks.edit", r)}
              type="file"
              multiple
              onChange={async (e) => {
                const names = Array.from(e.target.files || []).map(
                  (f) => f.name,
                );
                if (names.length) {
                  if (!(await update(
                    { attachments: [...r.attachments, ...names] },
                    "Added attachment references.",
                  ))) return;
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
                disabled={
                  !comment.trim() ||
                  !can(kind === "cases" ? "cases.edit" : "tasks.edit", r)
                }
                onClick={async () => {
                  if (!(await update(
                    { comments: [...r.comments, event(comment.trim())] },
                    "Added a comment.",
                  ))) return;
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

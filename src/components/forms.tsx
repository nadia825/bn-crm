"use client";
import { useState } from "react";
import { Paperclip, Plus, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  managers,
  affiliateStages,
  supplierStages,
  workStages,
  caseStages,
  event,
  type Account,
  type WorkItem,
} from "@/lib/data";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input, Textarea, Select } from "./ui/primitives";
import { toast } from "sonner";
export type Editor =
  | { type: "account"; record?: Account; accountType?: Account["type"] }
  | { type: "tasks" | "cases"; record?: WorkItem };
export function EditorDialog({
  editor,
  onClose,
}: {
  editor: Editor | null;
  onClose: () => void;
}) {
  if (!editor) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="editor-dialog">
        {editor.type === "account" ? (
          <AccountForm editor={editor} onClose={onClose} />
        ) : (
          <WorkForm editor={editor} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
function AccountForm({
  editor,
  onClose,
}: {
  editor: Extract<Editor, { type: "account" }>;
  onClose: () => void;
}) {
  const { data, setData } = useStore();
  const a = editor.record;
  const [type, setType] = useState<Account["type"]>(
    a?.type || editor.accountType || "Corporate Brand",
  );
  const [retailers, setRetailers] = useState<string[]>(a?.retailers || []);
  const [stage, setStage] = useState(
    a?.stage ||
      (type === "Supplier"
        ? "Prospect"
        : type === "Affiliate"
          ? "New"
          : "Onboarding"),
  );
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim(),
      email = String(f.get("email")).trim();
    if (!name || !email) return;
    const next: Account = {
      id:
        a?.id ||
        `${type === "Corporate Brand" ? "BR" : type === "Affiliate" ? "AF" : "SUP"}-${crypto.randomUUID().slice(0, 6)}`,
      name,
      type,
      manager: String(f.get("manager")),
      email,
      status:
        type === "Corporate Brand"
          ? a?.status || "Onboarding"
          : stage === "Live" || stage === "Active"
            ? "Active"
            : ["On Hold", "Rejected"].includes(stage)
              ? stage
              : "Prospect",
      stage: type === "Corporate Brand" ? a?.stage || "Onboarding" : stage,
      retailers,
      shopify: String(f.get("shopify")),
      lastActivity: "Just now",
      followUp: String(f.get("followUp")),
      color: a?.color || "purple",
      description: String(f.get("description")),
      contacts: a
        ? a.contacts.map((c, i) =>
            i === 0
              ? { ...c, name: String(f.get("contactName")).trim() || c.name }
              : c,
          )
        : [
            {
              name: String(f.get("contactName")),
              role: "Primary contact",
              email,
            },
          ],
      notes: a?.notes || [],
      history: [
        event(a ? "Account details updated." : "Account created."),
        ...(a?.history || []),
      ],
      attachments: a?.attachments || [],
      checks: a?.checks || Array(6).fill(false),
      verification: a?.verification || "Pending",
      approval: a?.approval || "Not submitted",
    };
    setData((d) => ({
      ...d,
      accounts: a
        ? d.accounts.map((x) => (x.id === a.id ? next : x))
        : [next, ...d.accounts],
    }));
    toast.success(a ? "Account updated" : "Account created");
    onClose();
  };
  return (
    <form onSubmit={save}>
      <DialogTitle>{a ? "Edit account" : "Create a new account"}</DialogTitle>
      <DialogDescription>
        Build a lasting relationship, starting with the essentials.
      </DialogDescription>
      <div className="form-grid">
        <label className="field-label full">
          Account name
          <Input
            name="name"
            required
            autoFocus
            defaultValue={a?.name}
            placeholder="e.g. Oak & Ember"
          />
        </label>
        <label className="field-label">
          Account type
          <Select
            name="type"
            value={type}
            disabled={!!a}
            options={["Corporate Brand", "Affiliate", "Supplier"]}
            onChange={(e) => {
              const t = e.target.value as Account["type"];
              setType(t);
              setStage(
                t === "Supplier"
                  ? "Prospect"
                  : t === "Affiliate"
                    ? "New"
                    : "Onboarding",
              );
            }}
          />
        </label>
        <label className="field-label">
          Account manager
          <Select
            name="manager"
            options={managers}
            defaultValue={a?.manager || managers[0]}
          />
        </label>
        <label className="field-label">
          Email
          <Input
            required
            type="email"
            name="email"
            defaultValue={a?.email}
            placeholder="hello@brand.example"
          />
        </label>
        <label className="field-label">
          Primary contact
          <Input
            required={!a}
            name="contactName"
            defaultValue={a?.contacts[0]?.name}
            placeholder="Contact name"
          />
        </label>
        {type !== "Corporate Brand" && (
          <label className="field-label">
            Pipeline stage
            <Select
              name="stage"
              options={type === "Supplier" ? supplierStages : affiliateStages}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            />
          </label>
        )}
        <label className="field-label">
          Shopify integration
          <Select
            name="shopify"
            options={["Not connected", "Connected"]}
            defaultValue={a?.shopify}
          />
        </label>
        <label className="field-label">
          Next follow-up
          <Input
            type="date"
            required
            name="followUp"
            defaultValue={a?.followUp || "2026-10-29"}
          />
        </label>
        <div className="field-label full">
          Connected retailers
          <div className="retailer-checks">
            {data.retailers.map((r) => (
              <label key={r}>
                <input
                  type="checkbox"
                  checked={retailers.includes(r)}
                  onChange={(e) =>
                    setRetailers(
                      e.target.checked
                        ? [...retailers, r]
                        : retailers.filter((x) => x !== r),
                    )
                  }
                />
                {r}
              </label>
            ))}
          </div>
        </div>
        <label className="field-label full">
          Description
          <Textarea
            name="description"
            defaultValue={a?.description}
            placeholder="A little context about this relationship…"
          />
        </label>
      </div>
      {type === "Corporate Brand" && !a && (
        <div className="info-callout">
          New corporate brands enter onboarding. Activation requires setup,
          verification, and Operations approval.
        </div>
      )}
      <div className="dialog-footer">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          <Save size={15} />
          {a ? "Save changes" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
function WorkForm({
  editor,
  onClose,
}: {
  editor: Exclude<Editor, { type: "account" }>;
  onClose: () => void;
}) {
  const { data, setData } = useStore();
  const r = editor.record;
  const isCase = editor.type === "cases";
  const [files, setFiles] = useState(r?.attachments || []);
  const [accountId, setAccountId] = useState(r?.accountId || "");
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title")).trim();
    if (!title) return;
    const status = String(f.get("status"));
    const resolution = String(f.get("resolution") ?? r?.resolution ?? "");
    if (
      isCase &&
      ["Resolved", "Closed"].includes(status) &&
      !resolution.trim()
    ) {
      toast.error("Add a resolution before resolving this case.");
      return;
    }
    const item: WorkItem = {
      id:
        r?.id ||
        `${isCase ? "CASE" : "BNT"}-${Date.now().toString().slice(-6)}`,
      title,
      description: String(f.get("description")),
      accountId: String(f.get("accountId")),
      caseId: !isCase ? String(f.get("caseId") || "") : undefined,
      category: String(f.get("category")),
      assignee: String(f.get("assignee")),
      priority: String(f.get("priority")),
      due: String(f.get("due")),
      status,
      comments: r?.comments || [],
      history: [
        event(
          r
            ? "Record details updated."
            : isCase
              ? "Support case created."
              : "Business work request created.",
        ),
        ...(r?.history || []),
      ],
      attachments: files,
      resolution,
      reminder: r?.reminder || "On due date",
    };
    const kind = editor.type;
    setData((d) => ({
      ...d,
      ...(isCase && r && r.accountId !== item.accountId
        ? {
            tasks: d.tasks.map((t) =>
              t.caseId === r.id
                ? {
                    ...t,
                    caseId: undefined,
                    history: [
                      event(
                        "Case link removed because the case moved to a different account.",
                      ),
                      ...t.history,
                    ],
                  }
                : t,
            ),
          }
        : {}),
      [kind]: r
        ? d[kind].map((x) => (x.id === r.id ? item : x))
        : [item, ...d[kind]],
    }));
    toast.success(
      r ? "Changes saved" : isCase ? "Case created" : "Work request created",
    );
    onClose();
  };
  return (
    <form onSubmit={save}>
      <DialogTitle>
        {r
          ? "Edit " + (isCase ? "support case" : "work request")
          : isCase
            ? "Create support case"
            : "New work request"}
      </DialogTitle>
      <DialogDescription>
        {isCase
          ? "Give your team the context to resolve this request."
          : "One clear request. The right owner. A shared next step."}
      </DialogDescription>
      <div className="form-grid">
        <label className="field-label full">
          Summary
          <Input
            required
            name="title"
            autoFocus
            defaultValue={r?.title}
            placeholder={
              isCase
                ? "What does the account need help with?"
                : "What needs to get done?"
            }
          />
        </label>
        <label className="field-label full">
          Description
          <Textarea
            required
            name="description"
            defaultValue={r?.description}
            placeholder="Add context, expected outcome, and relevant details…"
          />
        </label>
        <label className="field-label full">
          Related account
          <select
            required
            name="accountId"
            className="input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="" disabled>
              Select an account
            </option>
            {data.accounts.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name} · {a.type}
              </option>
            ))}
          </select>
        </label>
        {!isCase && (
          <label className="field-label full">
            Linked support case (optional)
            <select
              name="caseId"
              className="input"
              key={accountId}
              defaultValue={r?.accountId === accountId ? r.caseId || "" : ""}
            >
              <option value="">No linked case</option>
              {data.cases
                .filter((c) => c.accountId === accountId)
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.id} · {c.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="field-label">
          Category
          <Select
            name="category"
            defaultValue={r?.category}
            options={
              isCase
                ? [
                    "Fulfillment",
                    "Integration",
                    "Inventory",
                    "Billing",
                    "Customer Request",
                  ]
                : [
                    "Brand Operations",
                    "Integration",
                    "Barrel Picks",
                    "Logistics",
                    "Account Management",
                  ]
            }
          />
        </label>
        <label className="field-label">
          Assignee
          <Select
            name="assignee"
            options={managers}
            defaultValue={r?.assignee}
          />
        </label>
        <label className="field-label">
          Priority
          <Select
            name="priority"
            options={["Low", "Medium", "High", "Urgent"]}
            defaultValue={r?.priority || "Medium"}
          />
        </label>
        <label className="field-label">
          Due date
          <Input
            type="date"
            required
            name="due"
            defaultValue={r?.due || "2026-10-29"}
          />
        </label>
        <label className="field-label full">
          Status
          <Select
            name="status"
            options={isCase ? caseStages : workStages}
            defaultValue={r?.status || (isCase ? "Open" : "New")}
          />
        </label>
        {isCase && (
          <label className="field-label full">
            Resolution
            <Textarea
              name="resolution"
              defaultValue={r?.resolution}
              placeholder="Required when resolving or closing a case"
            />
          </label>
        )}
        <div className="full field-label">
          Attachments
          <label className="upload-zone">
            <Paperclip size={17} />
            Choose file references
            <input
              type="file"
              multiple
              onChange={(e) =>
                setFiles([
                  ...files,
                  ...Array.from(e.target.files || []).map((f) => f.name),
                ])
              }
            />
          </label>
          <span className="subtle">
            Filenames only. No file contents are uploaded.
          </span>
          {files.map((f, i) => (
            <span className="file-chip" key={i}>
              {f}
              <button
                type="button"
                aria-label={`Remove ${f}`}
                onClick={() => setFiles(files.filter((_, n) => n !== i))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="dialog-footer">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          <Plus size={15} />
          {r ? "Save changes" : isCase ? "Create case" : "Create request"}
        </Button>
      </div>
    </form>
  );
}

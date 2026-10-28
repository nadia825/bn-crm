"use client";
import { useEffect, useId, useState } from "react";
import {
  Bookmark,
  Columns3,
  Save,
  RotateCcw,
  Globe,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input, Select } from "./ui/primitives";
import { toast } from "sonner";
type Snapshot = Record<string, unknown>;
export function ViewControls({
  module,
  snapshot,
  onApply,
  columns,
  selectedColumns,
  onColumns,
  defaults,
}: {
  module: string;
  snapshot: Snapshot;
  onApply: (v: Snapshot) => void;
  columns?: string[];
  selectedColumns?: string[];
  onColumns?: (s: string[]) => void;
  defaults: Snapshot;
}) {
  const { data, setData, actor, can, ready } = useStore();
  const [active, setActive] = useState("");
  const [dialog, setDialog] = useState(false);
  const [columnDialog, setColumnDialog] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("Personal");
  const views = data.views.filter((v) => v.module === module);
  const storageKey = `bn-crm-view:${actor.id}:${module}`;
  useEffect(() => {
    if (!ready) return;
    try {
      const id = localStorage.getItem(storageKey);
      const saved = data.views.find((v) => v.id === id && v.module === module);
      if (saved) {
        setActive(saved.id);
        onApply(saved.snapshot);
        if (Array.isArray(saved.snapshot.columns))
          onColumns?.(saved.snapshot.columns as string[]);
      }
    } catch {}
  }, [ready, actor.id, module]);
  const apply = (id: string) => {
    setActive(id);
    const view = views.find((v) => v.id === id);
    const value = view?.snapshot || defaults;
    onApply(value);
    if (Array.isArray(value.columns)) onColumns?.(value.columns as string[]);
    try {
      if (id) localStorage.setItem(storageKey, id);
      else localStorage.removeItem(storageKey);
    } catch {}
  };
  return (
    <>
      <div className="view-controls">
        <span>
          <Bookmark size={14} />
          Views
        </span>
        <select
          className="input select"
          aria-label="Saved view"
          value={views.some((v) => v.id === active) ? active : ""}
          onChange={(e) => apply(e.target.value)}
        >
          <option value="">Default view</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.visibility === "Shared" ? " · Shared" : " · Personal"}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setName("");
            setDialog(true);
          }}
        >
          <Save size={13} />
          Save view
        </Button>
        {columns && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColumnDialog(true)}
          >
            <Columns3 size={13} />
            Columns
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => apply("")}>
          <RotateCcw size={13} />
          Reset
        </Button>
        {active && views.find((v) => v.id === active) && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Delete selected view"
            disabled={
              views.find((v) => v.id === active)?.visibility === "Shared" &&
              !can("views.shared")
            }
            onClick={() => {
              if (
                setData((d) => ({
                  ...d,
                  views: d.views.filter((v) => v.id !== active),
                }))
              ) {
                apply("");
                toast.success("View removed");
              }
            }}
          >
            <Trash2 size={13} />
          </Button>
        )}
        <small>Filters respect your current demo roles</small>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogTitle>Save this view</DialogTitle>
          <DialogDescription>
            Keep filters, sorting, layout, and selected columns. Shared views
            are managed by System Admins.
          </DialogDescription>
          <label className="field-label spaced">
            View name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High-priority follow-ups"
            />
          </label>
          <label className="field-label spaced">
            Visibility
            <Select
              label="View visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              options={
                can("views.shared") ? ["Personal", "Shared"] : ["Personal"]
              }
            />
          </label>
          <div className="dialog-footer">
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                const id = crypto.randomUUID();
                if (
                  setData((d) => ({
                    ...d,
                    views: [
                      ...d.views,
                      {
                        id,
                        name: name.trim(),
                        module,
                        ownerId: actor.id,
                        visibility: visibility as "Personal" | "Shared",
                        snapshot: {
                          ...snapshot,
                          ...(selectedColumns
                            ? { columns: selectedColumns }
                            : {}),
                        },
                      },
                    ],
                  }))
                ) {
                  setActive(id);
                  try {
                    localStorage.setItem(storageKey, id);
                  } catch {}
                  setDialog(false);
                  toast.success("View saved");
                }
              }}
            >
              <Bookmark size={14} />
              Save view
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={columnDialog} onOpenChange={setColumnDialog}>
        <DialogContent>
          <DialogTitle>Choose visible columns</DialogTitle>
          <DialogDescription>
            Your column selection can be saved with a personal or shared view.
          </DialogDescription>
          <div className="column-options">
            {columns?.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={selectedColumns?.includes(c)}
                  disabled={
                    selectedColumns?.length === 1 && selectedColumns.includes(c)
                  }
                  onChange={(e) =>
                    onColumns?.(
                      e.target.checked
                        ? [...(selectedColumns || []), c]
                        : (selectedColumns || []).filter((x) => x !== c),
                    )
                  }
                />
                {c}
              </label>
            ))}
          </div>
          <div className="dialog-footer">
            <Button onClick={() => setColumnDialog(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function ColumnVisibility({
  module,
  columns,
  selected,
}: {
  module: string;
  columns: string[];
  selected: string[];
}) {
  const safe = module.replace(/[^a-z0-9-]/gi, "");
  return (
    <style>
      {columns
        .map((c, i) =>
          selected.includes(c)
            ? ""
            : `[data-view-table="${safe}"] table th:nth-child(${i + 1}),[data-view-table="${safe}"] table td:nth-child(${i + 1}){display:none}`,
        )
        .join("\n")}
    </style>
  );
}

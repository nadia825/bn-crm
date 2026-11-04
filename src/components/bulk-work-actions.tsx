"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { bulkWorkUpdate } from "@/lib/work-actions";
import { caseStages, workStages, type WorkItem } from "@/lib/data";
import { Select, Textarea } from "./ui/primitives";
import { Button } from "./ui/button";
import { toast } from "sonner";
export function BulkWorkActions({ kind, selected, clear }: { kind: "tasks" | "cases"; selected: WorkItem[]; clear: () => void }) {
  const { data, actor, setData, saving } = useStore((s) => ({ data: s.data, actor: s.actor, setData: s.setData, saving: s.saving }));
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [resolution, setResolution] = useState("");
  useEffect(() => {
    if (!selected.length) { setStatus(""); setPriority(""); setAssignee(""); setResolution(""); }
  }, [selected.length]);
  const delegate = actor.roles.some((r) => ["System Admin", "Operations Manager"].includes(r));
  const resolving = kind === "cases" && ["Resolved", "Closed"].includes(status);
  const apply = async () => {
    try {
      // Validate the entire selection before entering the shared mutation layer.
      bulkWorkUpdate(data, actor, kind, selected.map((r) => r.id), { status, priority, assignee, resolution });
      const saved = await setData((current) => bulkWorkUpdate(current, actor, kind, selected.map((r) => r.id), { status, priority, assignee, resolution }), data);
      if (!saved) return;
      toast.success(`${selected.length} ${kind === "cases" ? "cases" : "work items"} updated`);
      clear(); setStatus(""); setPriority(""); setAssignee(""); setResolution("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Bulk update failed."); }
  };
  if (!selected.length) return null;
  return <div className="bulk-actions" role="region" aria-label="Bulk work actions">
    <strong aria-live="polite">{selected.length} selected</strong>
    <Select aria-label="Bulk status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Keep status</option>{(kind === "cases" ? caseStages : workStages).map((value) => <option key={value}>{value}</option>)}</Select>
    <Select aria-label="Bulk priority" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">Keep priority</option>{["Low", "Medium", "High", "Urgent"].map((value) => <option key={value}>{value}</option>)}</Select>
    {delegate && <Select aria-label="Bulk assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Keep assignee</option>{data.users.filter((u) => u.active).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</Select>}
    {resolving && <label className="field-label bulk-resolution">Resolution for selected cases<Textarea aria-label="Bulk case resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Required for cases without an existing resolution" /></label>}
    <Button disabled={saving || !(status || priority || assignee) || (resolving && !resolution.trim() && selected.some((item) => !item.resolution.trim()))} onClick={apply}>{saving ? "Saving…" : "Apply changes"}</Button>
    <Button variant="ghost" disabled={saving} onClick={clear}>Clear selection</Button>
  </div>;
}

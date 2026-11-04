"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Activity } from "@/lib/model";
import { useStore } from "@/lib/store";
import { todayDate } from "@/lib/dates";
import { activityDetailsError, activityDurationMinutes, activityReminders, canAssignActivity } from "@/lib/activities";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/primitives";
import { DialogDescription, DialogTitle } from "./ui/dialog";

export function ActivityForm({ activity, kind, close }: { activity?: Activity; kind: Activity["kind"]; close: () => void }) {
  const { data, setData, actor, can, saving } = useStore((s) => ({ data: s.data, setData: s.setData, actor: s.actor, can: s.can, saving: s.saving }));
  const [baseline] = useState(data);
  const accounts = data.accounts.filter((a) => a.type !== "Supplier");
  const [accountId, setAccountId] = useState(activity?.accountId || accounts[0]?.id || "");
  const [owner, setOwner] = useState(activity?.owner || actor.name);
  const [participants, setParticipants] = useState(activity?.participantIds || []);
  const [caseId, setCaseId] = useState(activity?.caseId || "");
  const [taskId, setTaskId] = useState(activity?.taskId || "");
  const [due, setDue] = useState(activity?.due || `${todayDate()}T14:00`);
  const [endAt, setEndAt] = useState(activity?.endAt || "");
  const [timeZone, setTimeZone] = useState(activity ? activity.timeZone || "" : Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [error, setError] = useState("");
  const writable = can("activities.edit", activity);
  const assigning = canAssignActivity(actor) && writable;
  const duration = activityDurationMinutes({ due, endAt, timeZone });
  const cases = data.cases.filter((c) => c.accountId === accountId);
  const tasks = data.tasks.filter((t) => t.accountId === accountId && (!caseId || t.caseId === caseId));
  const hasDetails = !!activity && Object.entries(activity).some(([key, value]) =>
    !["id", "accountId", "owner", "title", "kind", "due", "status", "notes"].includes(key) && (Array.isArray(value) ? value.length : value));

  return (
    <form className="work-editor activity-editor" onSubmit={async (event) => {
      event.preventDefault();
      if (!writable || saving) return;
      const f = new FormData(event.currentTarget);
      const text = (name: string) => String(f.get(name) || "").trim();
      const next: Activity = {
        ...activity,
        id: activity?.id || crypto.randomUUID(), title: text("title"), accountId,
        owner, participantIds: participants, kind: text("kind") as Activity["kind"],
        due: text("due"), endAt: text("endAt"), timeZone: text("timeZone"),
        status: text("status") as Activity["status"], notes: text("notes"),
        location: text("location"), meetingUrl: text("meetingUrl"), caseId, taskId,
        priority: text("priority") as Activity["priority"],
        reminder: text("reminder") as Activity["reminder"], agenda: text("agenda"),
        outcome: text("outcome"), nextAction: text("nextAction"),
      };
      // The API validates all relationships against the complete store. Hidden,
      // unchanged links remain intact when an owner edits only their activity.
      const problem = activityDetailsError(next, data, false);
      if (problem) { setError(problem); return; }
      setError("");
      if (await setData((d) => ({ ...d, activities: activity ? d.activities.map((a) => a.id === next.id ? next : a) : [next, ...d.activities] }), baseline)) {
        toast.success("Activity saved"); close();
      }
    }}>
      <div className="work-editor-header">
        <DialogTitle>{activity ? "Account activity" : "Schedule an activity"}</DialogTitle>
        <DialogDescription>One owner coordinates the activity. Add other people under More details.</DialogDescription>
      </div>
      <div className="work-editor-body">
        <p className="activity-mock-note">Mock activity only. No invitations, notifications, reminders, or calendar events are sent. Meeting links are stored as references.</p>
        {!writable && <p className="activity-hint">You can view this activity. Editing is controlled by your role and ownership.</p>}
        <fieldset disabled={!writable || saving} className="form-grid">
          <label className="field-label full">Title<Input name="title" required defaultValue={activity?.title} /></label>
          <label className="field-label">Account<Select name="accountId" required value={accountId} onChange={(e) => { setAccountId(e.target.value); setCaseId(""); setTaskId(""); }}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select></label>
          <label className="field-label">Type<Select name="kind" options={["Meeting", "Call", "Note", "Follow-up"]} defaultValue={activity?.kind || kind} /></label>
          <label className="field-label">When<Input type="datetime-local" name="due" required value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="field-label">Owner{assigning ? <Select name="owner" value={owner} onChange={(e) => {
            const next = e.target.value; setOwner(next); setParticipants((ids) => ids.filter((id) => data.users.find((u) => u.id === id)?.name !== next));
          }} options={Array.from(new Set([owner, ...data.users.filter((u) => u.active).map((u) => u.name)]))} /> : <Input value={owner} readOnly />}</label>
          <label className="field-label">Status<Select name="status" options={["Scheduled", "Done"]} defaultValue={activity?.status || "Scheduled"} /></label>
          <label className="field-label full">Notes<Textarea name="notes" defaultValue={activity?.notes} /></label>
        </fieldset>
        <details className="work-editor-options" open={hasDetails || undefined}>
          <summary>More details</summary>
          <fieldset className="activity-participants" disabled={!assigning || saving}>
            <legend>Participants</legend>
            <p className="activity-hint">Choose teammates involved in this activity. The owner remains responsible. Participation does not grant editing rights or override account access.</p>
            <div className="activity-participant-grid">
              {data.users.filter((u) => u.name !== owner && (u.active || participants.includes(u.id))).map((u) => <label key={u.id} className="activity-participant">
                <input type="checkbox" checked={participants.includes(u.id)} onChange={(e) => setParticipants((ids) => e.target.checked ? [...ids, u.id] : ids.filter((id) => id !== u.id))} />
                <span><strong>{u.name}{!u.active && " (inactive)"}</strong><small>{u.roles.join(" · ")}</small></span>
              </label>)}
            </div>
          </fieldset>
          {!assigning && <p className="activity-hint">Only managers can change the owner or participants.</p>}
          <fieldset disabled={!writable || saving} className="form-grid">
            <label className="field-label">End time<Input type="datetime-local" name="endAt" value={endAt} onChange={(e) => setEndAt(e.target.value)} />{duration && <small className="activity-hint">Duration: {duration} minutes</small>}</label>
            <label className="field-label">Time zone<Input name="timeZone" list="activity-time-zones" placeholder="e.g. Africa/Tunis" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} /><small className="activity-hint">Start and end use this zone. Blank keeps legacy local time.</small></label>
            <datalist id="activity-time-zones">{Array.from(new Set([Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC", "Africa/Tunis", "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai"])).map((zone) => <option key={zone} value={zone} />)}</datalist>
            <label className="field-label">Priority<Select name="priority" defaultValue={activity?.priority || "Medium"} options={["Low", "Medium", "High", "Urgent"]} /></label>
            <label className="field-label">Mock reminder<Select name="reminder" defaultValue={activity?.reminder || "None"} options={[...activityReminders]} /><small className="activity-hint">Stored for demonstration; no reminder is delivered.</small></label>
            <label className="field-label">Location<Input name="location" placeholder="Office, phone, or online" defaultValue={activity?.location} /></label>
            <label className="field-label">Meeting link<Input type="url" name="meetingUrl" placeholder="https://meeting.example/…" defaultValue={activity?.meetingUrl} /></label>
            <label className="field-label">Linked support case<Select name="caseId" value={caseId} onChange={(e) => { const id = e.target.value; setCaseId(id); if (taskId && data.tasks.find((t) => t.id === taskId)?.caseId !== id) setTaskId(""); }}>
              <option value="">No linked case</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.title}</option>)}
              {caseId && !cases.some((c) => c.id === caseId) && <option value={caseId}>Existing case (outside your view)</option>}
            </Select></label>
            <label className="field-label">Linked work request<Select name="taskId" value={taskId} onChange={(e) => { const id = e.target.value; setTaskId(id); const linkedCase = data.tasks.find((t) => t.id === id)?.caseId; if (linkedCase && cases.some((c) => c.id === linkedCase)) setCaseId(linkedCase); }}>
              <option value="">No linked work request</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.title}</option>)}
              {taskId && !tasks.some((t) => t.id === taskId) && <option value={taskId}>Existing work request (outside your view)</option>}
            </Select></label>
            <p className="activity-hint full">Related records are limited to the selected account. Selecting a linked work request also fills its visible support case.</p>
            <label className="field-label full">Agenda<Textarea name="agenda" defaultValue={activity?.agenda} /></label>
            <label className="field-label full">Outcome<Textarea name="outcome" defaultValue={activity?.outcome} placeholder="Record what happened after the activity" /></label>
            <label className="field-label full">Next action<Textarea name="nextAction" defaultValue={activity?.nextAction} placeholder="Record the follow-up; this does not create a work request" /></label>
          </fieldset>
        </details>
        {error && <p role="alert" className="activity-error">{error}</p>}
      </div>
      <div className="dialog-footer"><Button variant="outline" type="button" onClick={close}>Close</Button>{writable && <Button disabled={saving || !accountId} type="submit">{saving ? "Saving…" : "Save activity"}</Button>}</div>
    </form>
  );
}

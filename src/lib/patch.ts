import type { Store } from "./data.ts";
export const collections = [
  "accounts",
  "tasks",
  "cases",
  "barrels",
  "billing",
  "activities",
  "users",
  "views",
  "retailerRecords",
] as const;
export const metadata = [
  "workspace",
  "settings",
  "notificationsRead",
  "configuration",
] as const;
export type Collection = (typeof collections)[number];
export type Metadata = (typeof metadata)[number];
export type RecordChange = {
  id: string;
  before: unknown;
  after: unknown;
};
export type StorePatch = {
  collections: Partial<Record<Collection, RecordChange[]>>;
  metadata: Partial<
    Record<
      Metadata,
      {
        before: unknown;
        after: unknown;
      }
    >
  >;
};
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function diffStore(before: Store, after: Store): StorePatch {
  const patch: StorePatch = { collections: {}, metadata: {} };
  for (const name of collections) {
    const old = new Map(before[name].map((r) => [r.id, r]));
    const next = new Map(after[name].map((r) => [r.id, r]));
    const changes: RecordChange[] = [];
    for (const id of new Set([...old.keys(), ...next.keys()])) {
      if (!equal(old.get(id), next.get(id)))
        changes.push({
          id,
          before: old.get(id) ?? null,
          after: next.get(id) ?? null,
        });
    }
    if (changes.length) patch.collections[name] = changes;
  }
  for (const name of metadata)
    if (!equal(before[name], after[name]))
      patch.metadata[name] = { before: before[name], after: after[name] };
  return patch;
}
export function patchIsEmpty(patch: StorePatch) {
  return (
    !Object.values(patch.collections).some((v) => v.length) &&
    !Object.keys(patch.metadata).length
  );
}
/** A bounded wire format: clients never submit audit entries or the BNX catalog. */
export function validatePatch(value: unknown): asserts value is StorePatch {
  if (
    !object(value) ||
    !object(value.collections) ||
    !object(value.metadata) ||
    Object.keys(value).some((k) => !["collections", "metadata"].includes(k))
  )
    throw new Error("Invalid change request.");
  for (const [name, changes] of Object.entries(value.collections)) {
    if (
      !(collections as readonly string[]).includes(name) ||
      !Array.isArray(changes) ||
      changes.length > 2000
    )
      throw new Error("Unknown or oversized record collection.");
    const ids = new Set();
    for (const change of changes) {
      if (
        !object(change) ||
        typeof change.id !== "string" ||
        !change.id ||
        ids.has(change.id)
      )
        throw new Error("Change IDs must be unique.");
      ids.add(change.id);
      for (const key of ["before", "after"])
        if (
          change[key] !== null &&
          (!object(change[key]) || change[key].id !== change.id)
        )
          throw new Error("Record identifiers must match their change.");
    }
  }
  for (const [key, change] of Object.entries(value.metadata))
    if (
      !(metadata as readonly string[]).includes(key) ||
      !object(change) ||
      !("before" in change) ||
      !("after" in change)
    )
      throw new Error("Unknown metadata change.");
}
export class PatchConflictError extends Error {}

/** Strict comparison on the API; replay without comparison for optimistic UI state. */
export function applyPatch(
  store: Store,
  patch: StorePatch,
  compare = true,
): Store {
  const next = { ...store };
  for (const name of collections) {
    const changes = patch.collections[name];
    if (!changes) continue;
    const rows = [...store[name]] as {
      id: string;
    }[];
    for (const change of changes) {
      const index = rows.findIndex((r) => r.id === change.id);
      if (compare && !equal(index < 0 ? null : rows[index], change.before))
        throw new PatchConflictError("This record changed. Reload it before saving again.");
      if (change.after === null) {
        if (index >= 0) rows.splice(index, 1);
      } else if (index >= 0)
        rows[index] = change.after as {
          id: string;
        };
      else
        rows.push(
          change.after as {
            id: string;
          },
        );
    }
    (next[name] as {
      id: string;
    }[]) = rows;
  }
  for (const name of metadata) {
    const change = patch.metadata[name];
    if (!change) continue;
    if (compare && !equal(store[name], change.before))
      throw new PatchConflictError("Shared settings changed. Reload before saving again.");
    (next as unknown as Record<string, unknown>)[name] = change.after;
  }
  return next;
}

/** Check only records a form changes, so unrelated background updates do not block it. */
export function assertPatchBaseline(current: Store, patch: StorePatch, baseline: Store) {
  for (const name of collections) {
    for (const change of patch.collections[name] || []) {
      const old = baseline[name].find((r) => r.id === change.id) ?? null;
      if (!equal(old, current[name].find((r) => r.id === change.id) ?? null))
        throw new PatchConflictError("This record changed while the form was open. Reopen it to review the latest version.");
    }
  }
  for (const name of metadata)
    if (patch.metadata[name] && !equal(baseline[name], current[name]))
      throw new PatchConflictError("Shared settings changed. Reopen the form before saving.");
}

/** Retain unchanged records and collections across JSON API snapshots. */
export function shareSnapshot(previous: Store, incoming: Store): Store {
  const next = { ...incoming };
  for (const key of Object.keys(incoming) as (keyof Store)[]) {
    const old = previous[key], value = incoming[key];
    if (equal(old, value)) {
      (next as Record<string, unknown>)[key] = old;
    } else if (Array.isArray(old) && Array.isArray(value) &&
      value.every((r) => object(r) && typeof r.id === "string")) {
      const byId = new Map((old as unknown[]).filter(object).map((r) => [r.id, r]));
      (next as Record<string, unknown>)[key] = (value as Record<string, unknown>[]).map((r) => {
        const item = byId.get(r.id);
        return equal(item, r) ? item : r;
      });
    }
  }
  return next;
}

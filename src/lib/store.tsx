"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  useLayoutEffect,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import { seed, type Store } from "./data";
import { demoUsers } from "./demo-data";
import { can as allowed, visibleStore, type Action } from "./access";
import { applyMutation, migrateStore } from "./mutations";
import { diffStore, applyPatch, patchIsEmpty, type StorePatch, assertPatchBaseline, shareSnapshot } from "./patch";
import type { DemoUser } from "./model";
import { toast } from "sonner";
export const STORAGE_KEY = "bn-crm-v0";
type Context = {
  revision: number;
  data: Store;
  setData: (
    update: SetStateAction<Store>,
    baseline?: Store,
  ) => Promise<boolean>;
  ready: boolean;
  actor: DemoUser;
  demoUsers: DemoUser[];
  switchDemoUser: (id: string) => Promise<boolean>;
  can: (action: Action, record?: Parameters<typeof allowed>[2]) => boolean;
  canCheck: (a: Store["accounts"][number], i: number) => boolean;
  resetDemo: () => Promise<boolean>;
  serverMode: boolean;
  connectionError: string;
  saving: boolean;
  retry: () => void;
  legacyAvailable: boolean;
  importLegacy: () => Promise<boolean>;
};
type Subscription = {
  getSnapshot: () => Context;
  getServerSnapshot: () => Context;
  subscribe: (listener: () => void) => () => void;
  publish: (value: Context) => void;
};
const StoreContext = createContext<Subscription | null>(null);
type Snapshot = {
  data: Store | null;
  revision: number;
  unchanged?: boolean;
};
type Pending = {
  patch: StorePatch;
  resolve: (ok: boolean) => void;
};
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<Store>(seed),
    rawRef = useRef(raw),
    confirmed = useRef(raw);
  const [userId, setUserId] = useState("olivia"),
    userRef = useRef(userId);
  const [ready, setReady] = useState(false),
    [serverMode, setServerMode] = useState(false),
    serverRef = useRef(false);
  const [connectionError, setConnectionError] = useState(""),
    [saving, setSaving] = useState(false),
    [legacyAvailable, setLegacyAvailable] = useState(false);
  const revision = useRef(0),
    queue = useRef<Pending[]>([]),
    processing = useRef(false),
    switching = useRef(false),
    busy = useRef(false),
    refreshing = useRef(false);
  const commit = (next: Store) => {
    rawRef.current = next;
    setRaw(next);
  };
  const currentActor = () =>
    rawRef.current.users.find((u) => u.id === userRef.current) ||
    rawRef.current.users[0];
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    id = userRef.current,
  ) => {
    const response = await fetch(`/api/${path}`, {
      method,
      headers: {
        "X-Demo-User": id,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error || "The local API could not complete this request.",
      );
    return result;
  };
  const accept = (snapshot: Snapshot) => {
    revision.current = snapshot.revision;
    if (snapshot.unchanged) return;
    if (!snapshot.data)
      throw new Error(
        "Your demo identity is inactive. Choose another identity after reloading.",
      );
    const shared = shareSnapshot(confirmed.current, snapshot.data);
    confirmed.current = shared;
    let optimistic = shared;
    for (const item of queue.current)
      optimistic = applyPatch(optimistic, item.patch, false);
    commit(optimistic);
  };
  const refresh = async () => {
    if (
      refreshing.current ||
      !revision.current ||
      queue.current.length ||
      processing.current ||
      switching.current ||
      busy.current
    )
      return;
    refreshing.current = true;
    const startRevision = revision.current,
      startUser = userRef.current;
    try {
      const snapshot = await request(`state?since=${startRevision}`);
      if (
        queue.current.length ||
        processing.current ||
        switching.current ||
        busy.current ||
        startRevision !== revision.current ||
        startUser !== userRef.current
      )
        return;
      accept(snapshot);
      setConnectionError("");
    } catch (e) {
      setConnectionError(
        e instanceof Error ? e.message : "Local API unavailable.",
      );
    } finally { refreshing.current = false; }
  };
  const initialize = async () => {
    setConnectionError("");
    setReady(false);
    try {
      const response = await fetch("/runtime-config.json", {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok)
        throw new Error("Runtime configuration could not be loaded.");
      const config = await response.json();
      serverRef.current = config.mode === "server";
      setServerMode(serverRef.current);
      const savedId = localStorage.getItem("bn-crm-demo-user");
      if (serverRef.current) {
        const { users } = await request("demo-users");
        const id =
          users.find((u: DemoUser) => u.id === savedId && u.active)?.id ||
          users.find((u: DemoUser) => u.active)?.id;
        userRef.current = id;
        setUserId(id);
        accept(await request("state", "GET", undefined, id));
        setLegacyAvailable(
          !!localStorage.getItem(STORAGE_KEY) && revision.current === 1,
        );
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        const next = saved ? migrateStore(JSON.parse(saved)) : seed();
        commit(next);
        confirmed.current = next;
        const id =
          next.users.find((u) => u.id === savedId && u.active)?.id ||
          next.users.find((u) => u.active)!.id;
        userRef.current = id;
        setUserId(id);
      }
      setReady(true);
    } catch (e) {
      setConnectionError(
        e instanceof Error
          ? e.message
          : "The CRM could not load. Check Docker Compose and retry.",
      );
    }
  };
  useEffect(() => {
    void initialize();
    const timer = setInterval(() => {
      if (serverRef.current && document.visibilityState !== "hidden") void refresh();
    }, 2500);
    const focus = () => {
      if (serverRef.current) void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, []); // refs keep background refresh current
  useEffect(() => {
    if (!ready) return;
    try {
      if (!serverMode) localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
      localStorage.setItem("bn-crm-demo-user", userId);
    } catch {
      toast.error("Browser preferences could not be saved.");
    }
  }, [raw, ready, userId, serverMode]);
  const drain = async () => {
    if (processing.current) return;
    processing.current = true;
    setSaving(true);
    try {
      while (queue.current.length) {
        const item = queue.current[0];
        const response = await request("state", "PATCH", {
          revision: revision.current,
          patch: item.patch,
        });
        if (!response.data)
          throw new Error(
            "Your demo identity is now inactive. Reload to choose another demo identity.",
          );
        queue.current.shift();
        accept(response);
        setConnectionError("");
        setLegacyAvailable(false);
        item.resolve(true);
      }
    } catch (e) {
      const failed = queue.current.splice(0);
      commit(confirmed.current);
      const message = e instanceof Error ? e.message : "Save failed.";
      toast.error(message);
      setConnectionError(message);
      for (const item of failed) item.resolve(false);
      try {
        accept(await request("state"));
      } catch {
        /* retain last confirmed state until API returns */
      }
    } finally {
      processing.current = false;
      setSaving(false);
    }
  };
  const setData = async (
    update: SetStateAction<Store>,
    baseline?: Store,
  ) => {
    if (!ready || switching.current || busy.current) {
      toast.error("Wait for the workspace to finish loading.");
      return false;
    }
    const source = rawRef.current,
      user = currentActor(),
      projected = serverRef.current ? source : visibleStore(source, user);
    const proposed = typeof update === "function" ? update(projected) : update;
    if (baseline) {
      try {
        assertPatchBaseline(projected, diffStore(projected, proposed), baseline);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "This record changed. Reopen the form.");
        return false;
      }
    }
    const result = applyMutation(source, proposed, user);
    if (result.error) {
      if (!serverRef.current) commit(result.store);
      toast.error(result.error);
      return false;
    }
    if (!serverRef.current) {
      commit(result.store);
      return true;
    }
    const next = visibleStore(result.store, user),
      patch = diffStore(projected, next);
    if (patchIsEmpty(patch)) return true;
    commit(next);
    return new Promise<boolean>((resolve) => {
      queue.current.push({ patch, resolve });
      void drain();
    });
  };
  const switchDemoUser = async (id: string) => {
    if (processing.current || busy.current) {
      toast.error("Wait for pending saves before switching identity.");
      return false;
    }
    if (!rawRef.current.users.some((u) => u.id === id && u.active))
      return false;
    switching.current = true;
    try {
      if (serverRef.current) {
        const snapshot = await request("state", "GET", undefined, id);
        accept(snapshot);
      }
      userRef.current = id;
      setUserId(id);
      setConnectionError("");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Identity switch failed.");
      return false;
    } finally {
      switching.current = false;
    }
  };
  const replaceShared = async (kind: "reset" | "import") => {
    const actor = currentActor();
    if (!allowed(actor, "configuration.edit", undefined, rawRef.current)) {
      toast.error("Only a System Admin can reset or import demo data.");
      return false;
    }
    if (processing.current || busy.current) {
      toast.error("Wait for pending saves first.");
      return false;
    }
    busy.current = true;
    setSaving(true);
    try {
      if (serverRef.current) {
        const legacy =
          kind === "import"
            ? JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
            : undefined;
        accept(
          await request(kind, "POST", {
            revision: revision.current,
            ...(legacy ? { data: legacy } : {}),
          }),
        );
        setLegacyAvailable(false);
      } else {
        const next = seed();
        next.audit = [
          {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actorId: actor.id,
            actor: actor.name,
            roles: actor.roles,
            action: "demo.reset",
            recordId: "organization",
            detail: "Restored fictional demo records",
            outcome: "Allowed",
          },
          ...rawRef.current.audit,
        ];
        commit(next);
      }
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The operation failed.");
      if (serverRef.current)
        try {
          accept(await request("state"));
        } catch {}
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const actor = raw.users.find((u) => u.id === userId) || raw.users[0];
  const data = useMemo(() => serverMode ? raw : visibleStore(raw, actor), [raw, actor, serverMode]);
  const can = useMemo(() => (action: Action, record?: Parameters<typeof allowed>[2]) =>
    allowed(actor, action, record, raw), [actor, raw]);
  const canCheck = useMemo(() => (a: Store["accounts"][number], i: number) =>
    can("onboarding.edit", a) &&
    (!actor.roles.includes("Operations Member") ||
      actor.roles.some((r) =>
        ["System Admin", "Operations Manager"].includes(r) ||
        (r === "Account Manager" && a.manager === actor.name)) ||
      a.checkOwners?.[i] === actor.name), [can, actor]);
  const handlers = { setData, switchDemoUser,
    resetDemo: () => replaceShared("reset"),
    importLegacy: () => replaceShared("import"),
    retry: () => { if (ready) void refresh(); else void initialize(); },
  };
  const handlersRef = useRef(handlers);
  useLayoutEffect(() => { handlersRef.current = handlers; });
  const stableHandlers = useMemo(() => ({
    setData: ((...args) => handlersRef.current.setData(...args)) as Context["setData"],
    switchDemoUser: (id: string) => handlersRef.current.switchDemoUser(id),
    resetDemo: () => handlersRef.current.resetDemo(),
    importLegacy: () => handlersRef.current.importLegacy(),
    retry: () => handlersRef.current.retry(),
  }), []);
  const value: Context = { revision: revision.current, data, ready, actor,
    demoUsers: raw.users, can, canCheck, serverMode, connectionError, saving,
    legacyAvailable, ...stableHandlers };
  const [subscription] = useState<Subscription>(() => {
    let current = value;
    const initial = value;
    const listeners = new Set<() => void>();
    return {
      getSnapshot: () => current,
      getServerSnapshot: () => initial,
      subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      publish: (next) => { current = next; listeners.forEach((listener) => listener()); },
    };
  });
  useLayoutEffect(() => { subscription.publish(value); });
  return <StoreContext.Provider value={subscription}>{children}</StoreContext.Provider>;
}
function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) =>
    Object.prototype.hasOwnProperty.call(b, key) &&
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}
/** Subscribe to the fields a screen uses; save/connection changes stay isolated. */
export function useStore<T = Context>(selector: (state: Context) => T = ((state: Context) => state) as (state: Context) => T): T {
  const subscription = useContext(StoreContext);
  if (!subscription) throw new Error("useStore requires StoreProvider");
  const cache = useRef<{ value: T } | null>(null);
  const select = (state: Context) => {
    const next = selector(state);
    if (!cache.current || !shallowEqual(cache.current.value, next)) cache.current = { value: next };
    return cache.current.value;
  };
  return useSyncExternalStore(subscription.subscribe,
    () => select(subscription.getSnapshot()),
    () => select(subscription.getServerSnapshot()));
}

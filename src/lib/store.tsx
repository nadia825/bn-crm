"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { seed, type Store } from "./data";
import { demoUsers } from "./demo-data";
import { can as allowed, visibleStore, type Action } from "./access";
import { applyMutation, migrateStore } from "./mutations";
import type { DemoUser } from "./model";
import { toast } from "sonner";
export const STORAGE_KEY = "bn-crm-v0";
type Context = {
  data: Store;
  setData: (update: SetStateAction<Store>) => boolean;
  ready: boolean;
  actor: DemoUser;
  demoUsers: DemoUser[];
  switchDemoUser: (id: string) => void;
  can: (action: Action, record?: Parameters<typeof allowed>[2]) => boolean;
  canCheck: (a: Store["accounts"][number], index: number) => boolean;
  resetDemo: () => void;
};
const initial = seed();
const StoreContext = createContext<Context>({
  data: initial,
  setData: () => false,
  ready: false,
  actor: demoUsers[0],
  demoUsers,
  switchDemoUser: () => {},
  can: () => false,
  canCheck: () => false,
  resetDemo: () => {},
});
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<Store>(seed);
  const rawRef = useRef(raw);
  const [userId, setUserId] = useState("olivia");
  const userRef = useRef(userId);
  const [ready, setReady] = useState(false);
  const currentActor = () =>
    rawRef.current.users.find((u) => u.id === userRef.current) ||
    rawRef.current.users[0];
  const commit = (next: Store) => {
    rawRef.current = next;
    setRaw(next);
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.version === 1) commit(migrateStore(parsed));
      }
      const id = localStorage.getItem("bn-crm-demo-user");
      if (id && rawRef.current.users.some((u) => u.id === id && u.active)) {
        userRef.current = id;
        setUserId(id);
      }
    } catch {
      toast.error("Saved data could not be loaded. Using sample records.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
        localStorage.setItem("bn-crm-demo-user", userId);
      } catch {
        toast.error("Browser storage is full. Changes last for this session.");
      }
  }, [raw, ready, userId]);
  const actor = raw.users.find((u) => u.id === userId) || raw.users[0];
  const setData = (update: SetStateAction<Store>) => {
    const source = rawRef.current;
    const user = currentActor();
    const projected = visibleStore(source, user);
    const proposed = typeof update === "function" ? update(projected) : update;
    const result = applyMutation(source, proposed, user);
    commit(result.store);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    return true;
  };
  const switchDemoUser = (id: string) => {
    const user = rawRef.current.users.find((u) => u.id === id && u.active);
    if (!user) return;
    userRef.current = id;
    setUserId(id);
  };
  const can = (action: Action, record?: Parameters<typeof allowed>[2]) =>
    allowed(actor, action, record, raw);
  const canCheck = (a: Store["accounts"][number], i: number) =>
    can("onboarding.edit", a) &&
    (!actor.roles.includes("Operations Member") ||
      actor.roles.some(
        (r) =>
          ["System Admin", "Operations Manager"].includes(r) ||
          (r === "Account Manager" && a.manager === actor.name),
      ) ||
      a.checkOwners?.[i] === actor.name);
  const resetDemo = () => {
    if (
      !allowed(currentActor(), "configuration.edit", undefined, rawRef.current)
    ) {
      toast.error("Only a System Admin can reset the demo.");
      return;
    }
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
    userRef.current = "olivia";
    setUserId("olivia");
  };
  return (
    <StoreContext.Provider
      value={{
        data: visibleStore(raw, actor),
        setData,
        ready,
        actor,
        demoUsers: raw.users,
        switchDemoUser,
        can,
        canCheck,
        resetDemo,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export const useStore = () => useContext(StoreContext);

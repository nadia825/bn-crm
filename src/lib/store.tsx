"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { seed, type Store } from "./data";
import { toast } from "sonner";
export const STORAGE_KEY = "bn-crm-v0";
const StoreContext = createContext<{
  data: Store;
  setData: Dispatch<SetStateAction<Store>>;
  ready: boolean;
}>({ data: seed(), setData: () => {}, ready: false });
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Store>(seed);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.version === 1) setData(parsed);
      }
    } catch {
      toast.error("Saved data could not be loaded. Using sample records.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        toast.error(
          "Browser storage is full. Changes will last for this session.",
        );
      }
  }, [data, ready]);
  return (
    <StoreContext.Provider value={{ data, setData, ready }}>
      {children}
    </StoreContext.Provider>
  );
}
export const useStore = () => useContext(StoreContext);

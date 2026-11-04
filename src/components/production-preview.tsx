"use client";
import { createContext, useContext, type ReactNode } from "react";

export const ProductionPreview = createContext(false);
export const useProductionPreview = () => useContext(ProductionPreview);

export function DemoOnly({ children }: { children: ReactNode }) {
  return useProductionPreview() ? null : children;
}

export function PreviewText({ demo, clean }: { demo: string; clean: string }) {
  return useProductionPreview() ? clean : demo;
}

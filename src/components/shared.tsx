"use client";
import { useState } from "react";
import { personPortrait, teamPortraitAtlas } from "@/lib/people";
import "./people.css";
import { useStore } from "@/lib/store";
import {
  ArrowUpRight,
  ArrowUpDown,
  Search,
  ChevronRight,
  SlidersHorizontal,
  List,
  Columns3,
  Plus,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input, Select } from "./ui/primitives";
import { managers } from "@/lib/data";
export function Avatar({
  name,
  size = 28,
  color,
  decorative = false,
}: {
  name: string;
  size?: number;
  color?: string;
  decorative?: boolean;
}) {
  const portrait = personPortrait(name);
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("") || "?";
  return (
    <span
      className={`avatar ${portrait && !failed ? "avatar-with-photo" : ""} ${color || ["purple", "blue", "amber", "green"][name.length % 4]}`}
      style={{ width: size, height: size, fontSize: size / 2.7 }}
      title={name}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {portrait && !failed ? <svg className="avatar-photo" aria-hidden="true" focusable="false"
        viewBox={`${portrait.x} ${portrait.y} ${portrait.width} ${portrait.height}`} preserveAspectRatio="xMidYMid slice">
        <image href={teamPortraitAtlas.src} width={teamPortraitAtlas.width} height={teamPortraitAtlas.height} onError={() => setFailed(true)} />
      </svg> : initials}
    </span>
  );
}
export function PersonIdentity({ name, size = 24, label }: { name: string; size?: number; label?: string }) {
  return <span className="person-identity" title={name}>
    {label && <span className="person-label">{label}</span>}
    <Avatar name={name} size={size} decorative />
    <span className="person-name">{name}</span>
  </span>;
}
export function AccountLogo({
  name,
  color = "purple",
  size = 36,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className={`account-logo ${color}`}
      style={{ width: size, height: size }}
    >
      {name
        .split(" ")
        .filter((x) => x !== "&")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function SectionTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function PanelHeading({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="text-link" onClick={onAction}>
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-field">
      <Search size={16} />
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Toolbar({
  query,
  setQuery,
  filter,
  setFilter,
  filterOptions,
  manager,
  setManager,
  managerLabel = "Account manager",
  managerAllLabel = "All managers",
  managerOptions,
  showManagerIcon = true,
  filterLabel = "Filter by status or type",
  view,
  setView,
  children,
}: {
  query: string;
  setQuery: (s: string) => void;
  filter?: string;
  setFilter?: (s: string) => void;
  filterOptions?: string[];
  manager?: string;
  setManager?: (s: string) => void;
  managerLabel?: string;
  managerAllLabel?: string;
  managerOptions?: string[];
  showManagerIcon?: boolean;
  filterLabel?: string;
  view?: string;
  setView?: (s: string) => void;
  children?: React.ReactNode;
}) {
  const { data } = useStore((s) => ({ data: s.data }));
  return (
    <div className="toolbar">
      <SearchField value={query} onChange={setQuery} />
      {setFilter && (
        <Select
          label={filterLabel}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={filterOptions || []}
        />
      )}
      {setManager && (
        <div className="manager-filter">
          {showManagerIcon && <SlidersHorizontal size={14} aria-hidden="true" />}
          <Select
            label={managerLabel}
            value={manager}
            onChange={(e) => setManager(e.target.value)}
            options={[
              managerAllLabel,
              ...Array.from(
                new Set([
                  ...(managerOptions || [...managers, ...data.users.filter((u) => u.active).map((u) => u.name)]),
                ]),
              ),
            ]}
          />
        </div>
      )}
      <div className="toolbar-end">
        {children}
        {setView && (
          <div className="segmented">
            <button
              className={view === "board" ? "selected" : ""}
              onClick={() => setView("board")}
            >
              <Columns3 size={15} />
              Board
            </button>
            <button
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              <List size={15} />
              List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export function EmptyState({
  title = "No records found",
  description = "Try a different search or filter.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <Search size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function SortHead({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="sort-head" onClick={onClick}>
      {label}
      <ArrowUpDown size={12} />
    </button>
  );
}
export function MetricDelta({ children }: { children: React.ReactNode }) {
  return (
    <span className="metric-delta">
      <ArrowUpRight size={13} />
      {children}
    </span>
  );
}
export function AddButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <Plus size={16} />
      {children}
    </Button>
  );
}

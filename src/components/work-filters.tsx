"use client";
import type { Account, WorkItem } from "@/lib/data";
import {
  activeWorkFilterCount,
  dueFilters,
  workFilterError,
  workFiltersFromView,
  type WorkFilters,
} from "@/lib/work-filters";
import { Button } from "./ui/button";
import { Card, Input, Select } from "./ui/primitives";

export function WorkFilterPanel({
  filters,
  onChange,
  accounts,
  cases,
  categories,
  kind,
  shown,
  total,
}: {
  filters: WorkFilters;
  onChange: (filters: WorkFilters) => void;
  accounts: Account[];
  cases: WorkItem[];
  categories: string[];
  kind: "tasks" | "cases";
  shown: number;
  total: number;
}) {
  const count = activeWorkFilterCount(filters);
  const error = workFilterError(filters);
  const availableCases = cases.filter(
    (c) => !filters.accountId || c.accountId === filters.accountId,
  );
  const update = <K extends keyof WorkFilters>(key: K, value: WorkFilters[K]) =>
    onChange({ ...filters, [key]: value });
  return (
    <Card className="work-filter-panel" aria-label="Work filters">
      <div className="work-filter-heading">
        <div>
          <strong>Filters</strong>
          <span>
            {shown} of {total} {kind === "cases" ? "cases" : "work items"} ·{" "}
            {count ? `${count} active` : "All records"}
          </span>
        </div>
        <div className="work-filter-actions">
          <label>
            <input
              type="checkbox"
              checked={filters.mine}
              onChange={(e) => update("mine", e.target.checked)}
            />{" "}
            Assigned to me
          </label>
          <Button
            size="sm"
            variant="ghost"
            disabled={!count}
            onClick={() => onChange(workFiltersFromView())}
          >
            Clear filters
          </Button>
        </div>
      </div>
      <div className="work-filter-grid">
        <label className="field-label">
          Priority
          <Select
            value={filters.priority}
            onChange={(e) => update("priority", e.target.value)}
          >
            <option value="">All priorities</option>
            {["Low", "Medium", "High", "Urgent"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <label className="field-label">
          Category
          <Select
            value={filters.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">All categories</option>
            {Array.from(
              new Set([
                ...categories,
                ...(filters.category ? [filters.category] : []),
              ]),
            )
              .sort()
              .map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
          </Select>
        </label>
        <label className="field-label">
          Account
          <Select
            value={filters.accountId}
            onChange={(e) => {
              const accountId = e.target.value;
              const selectedCase = cases.find(
                (c) => c.id === filters.linkedCase,
              );
              onChange({
                ...filters,
                accountId,
                linkedCase:
                  accountId &&
                  selectedCase?.accountId !== accountId &&
                  !["", "linked", "unlinked"].includes(filters.linkedCase)
                    ? ""
                    : filters.linkedCase,
              });
            }}
          >
            <option value="">All accounts</option>
            {filters.accountId &&
              !accounts.some((a) => a.id === filters.accountId) && (
                <option value={filters.accountId}>Unavailable account</option>
              )}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="field-label">
          Due date
          <Select
            value={filters.due}
            onChange={(e) =>
              update("due", e.target.value as WorkFilters["due"])
            }
          >
            {dueFilters.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="field-label">
          {kind === "cases" ? "Support case" : "Linked support case"}
          <Select
            value={filters.linkedCase}
            onChange={(e) => update("linkedCase", e.target.value)}
          >
            <option value="">
              {kind === "cases" ? "All support cases" : "Any case link"}
            </option>
            <option value="linked">
              {kind === "cases" ? "With linked requests" : "With linked case"}
            </option>
            <option value="unlinked">
              {kind === "cases" ? "No linked requests" : "No linked case"}
            </option>
            {filters.linkedCase &&
              !["linked", "unlinked"].includes(filters.linkedCase) &&
              !availableCases.some((c) => c.id === filters.linkedCase) && (
                <option value={filters.linkedCase}>
                  Unavailable support case
                </option>
              )}
            {availableCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.title}
              </option>
            ))}
          </Select>
        </label>
        {filters.due === "custom" && (
          <>
            <label className="field-label">
              Due from
              <Input
                type="date"
                value={filters.dueFrom}
                aria-invalid={!!error}
                onChange={(e) => update("dueFrom", e.target.value)}
              />
            </label>
            <label className="field-label">
              Due through
              <Input
                type="date"
                value={filters.dueTo}
                aria-invalid={!!error}
                onChange={(e) => update("dueTo", e.target.value)}
              />
            </label>
          </>
        )}
      </div>
      {error ? (
        <p className="work-filter-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="work-filter-help">
          All filters apply together.
          {filters.due === "overdue"
            ? " Overdue includes unfinished work only."
            : ""}
          {filters.due === "week"
            ? " This week runs Monday through Sunday."
            : ""}
          {kind === "cases"
            ? " Linked request filters use work visible to your role."
            : ""}
        </p>
      )}
    </Card>
  );
}

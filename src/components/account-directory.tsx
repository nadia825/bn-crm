"use client";
import { SupplierProvisionalNotice } from "./supplier-provisional";

import { useEffect, useState, type ReactNode } from "react";
import {
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  GitBranch,
} from "lucide-react";
import { event, type Account } from "@/lib/data";
import {
  accountNextStep,
  compareAccounts,
  type AccountSection,
} from "@/lib/account-directory";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";
import { Card, Badge, Select } from "./ui/primitives";
import {
  AccountLogo,
  Avatar,
  EmptyState,
  SectionTitle,
  SearchField,
  SortHead,
} from "./shared";
import { ViewControls } from "./saved-views";
import { toast } from "sonner";

const pageSize = 6;
const columns = [
  "Account",
  "Status",
  "Manager",
  "Setup",
  "Next step",
  "Type",
  "Email",
  "Retailer",
  "Shopify",
  "Activity",
  "Open",
];
const sortable: Record<string, string> = {
  Account: "name",
  Status: "status",
  Manager: "manager",
  Setup: "setup",
  Type: "type",
  Activity: "updated",
};

export function Accounts({
  openAccount,
  create,
  accountType,
}: {
  openAccount: (account: Account, section?: AccountSection) => void;
  create: () => void;
  accountType?: Account["type"];
}) {
  const { data, can, actor, setData, saving } = useStore((s) => ({ data: s.data, can: s.can, actor: s.actor, setData: s.setData, saving: s.saving }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newOwner, setNewOwner] = useState("");
  const isBrand = accountType === "Corporate Brand";
  const isAffiliate = accountType === "Affiliate";
  const allAccounts = data.accounts.filter(
    (a) => !accountType || a.type === accountType,
  );
  const allLabel = isBrand
    ? "All brands"
    : isAffiliate
      ? "All affiliates"
      : "All accounts";
  const defaultColumns = isBrand
    ? ["Account", "Status", "Manager", "Setup", "Next step"]
    : [
        "Account",
        "Status",
        "Manager",
        accountType ? "Shopify" : "Type",
        "Next step",
      ];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(allLabel);
  const [manager, setManager] = useState("All managers");
  const [sort, setSort] = useState("updated");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState(defaultColumns);
  const module = `accounts-${accountType || "all"}`.replace(/[^a-z0-9-]/gi, "");
  const selectColumns = (value: string[]) =>
    setSelectedColumns([
      "Account",
      ...value.filter((c) => c !== "Account" && columns.includes(c)),
    ]);
  const visibleColumns = columns.filter((c) => selectedColumns.includes(c));
  const applyView = (view: Record<string, unknown>) => {
    setQuery(String(view.query || ""));
    setFilter(String(view.filter || allLabel));
    setManager(String(view.manager || "All managers"));
    setSort(String(view.sort || "updated"));
    setAsc(view.asc === true);
    setPage(0);
  };
  const statuses = Array.from(new Set(allAccounts.map((a) => a.status)));
  const tabs = [
    allLabel,
    ...(isBrand
      ? ["Onboarding", "Active"]
      : ["Active", ...statuses.filter((s) => s !== "Active")]),
  ];
  const filterOptions = Array.from(
    new Set([
      allLabel,
      ...(!accountType ? ["Corporate Brand", "Affiliate", "Supplier"] : []),
      ...statuses,
    ]),
  );
  const managers = Array.from(
    new Set(allAccounts.map((a) => a.manager)),
  ).sort();
  const countFor = (value: string) =>
    allAccounts.filter(
      (a) => value === allLabel || a.status === value || a.type === value,
    ).length;
  const rows = allAccounts
    .filter(
      (a) =>
        (filter === allLabel || a.status === filter || a.type === filter) &&
        (manager === "All managers" || a.manager === manager) &&
        `${a.name} ${a.email} ${a.retailers.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) => compareAccounts(a, b, sort, asc));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  useEffect(() => { setSelectedIds([]); }, [query, filter, manager, current, accountType]);
  const canReassign = (a: Account) => can("accounts.assign", a) && actor.roles.some((r) =>
    ["System Admin", "Sales Manager"].includes(r) || (r === "Operations Manager" && a.type === "Supplier"));
  const pageAccounts = rows.slice(current * pageSize, current * pageSize + pageSize);
  const eligible = pageAccounts.filter(canReassign);
  const selected = eligible.filter((a) => selectedIds.includes(a.id));
  const assignSelected = async () => {
    if (!newOwner || !selected.length) return;
    const ids = new Set(selected.map((a) => a.id));
    const saved = await setData((d) => ({ ...d, accounts: d.accounts.map((a) => ids.has(a.id) && a.manager !== newOwner ?
      { ...a, manager: newOwner, history: [event(`Account owner changed to ${newOwner} in a bulk update.`), ...a.history] } : a) }), data);
    if (saved) { toast.success(`${selected.length} account owners updated`); setSelectedIds([]); setNewOwner(""); }
  };
  const resetFilters = () => {
    setQuery("");
    setFilter(allLabel);
    setManager("All managers");
    setPage(0);
  };
  const doSort = (key: string) => {
    setAsc(sort === key ? !asc : key !== "updated");
    setSort(key);
    setPage(0);
  };
  const cell = (column: string, account: Account): ReactNode => {
    const next = accountNextStep(account);
    switch (column) {
      case "Account":
        return (
          <button
            className="account-name-button"
            onClick={(e) => {
              e.stopPropagation();
              openAccount(account);
            }}
            aria-label={`View ${account.name}`}
          >
            <AccountLogo name={account.name} color={account.color} size={33} />
            <span>
              <strong>{account.name}</strong>
              <small>{accountType ? account.type : account.id}</small>
            </span>
          </button>
        );
      case "Status":
        return <Badge>{account.status}</Badge>;
      case "Manager":
        return (
          <span className="account-owner">
            <Avatar name={account.manager} size={24} />
            <span>{account.manager}</span>
          </span>
        );
      case "Setup":
        return account.type === "Corporate Brand" ? (
          <div className="account-setup">
            <span>{account.checks.filter(Boolean).length} / 6</span>
            <div
              className="progress"
              role="progressbar"
              aria-label={`${account.name} setup checks`}
              aria-valuenow={account.checks.filter(Boolean).length}
              aria-valuemin={0}
              aria-valuemax={6}
            >
              <span
                style={{
                  width: `${(account.checks.filter(Boolean).length / 6) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <span className="muted">—</span>
        );
      case "Next step":
        return (
          <button
            className="account-next-step"
            onClick={(e) => {
              e.stopPropagation();
              openAccount(account, next.section);
            }}
            aria-label={`${next.label} for ${account.name}`}
          >
            <span>{next.label}</span>
            <ChevronRight size={14} />
          </button>
        );
      case "Type":
        return (
          <span className="account-type">
            {account.type === "Supplier"
              ? "Supplier (provisional)"
              : account.type}
          </span>
        );
      case "Email":
        return account.email;
      case "Retailer":
        return account.retailers[0] || "—";
      case "Shopify":
        return <Badge>{account.shopify}</Badge>;
      case "Activity":
        return account.lastActivity;
      case "Open":
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open ${account.name}`}
            onClick={(e) => {
              e.stopPropagation();
              openAccount(account);
            }}
          >
            <ChevronRight size={16} />
          </Button>
        );
    }
  };
  return (
    <div className="accounts-workspace">
      <SectionTitle
        title={
          isBrand
            ? "Brand accounts"
            : isAffiliate
              ? "Affiliate accounts"
              : "Accounts"
        }
        subtitle="Relationships, onboarding, and the next step for every account."
      >
        <Button variant="outline" onClick={() => exportCSV(rows)}>
          <Download size={15} />
          Export
        </Button>
        <Button
          disabled={
            !can("accounts.create", {
              type: accountType || "Corporate Brand",
              manager: actor.name,
            })
          }
          onClick={create}
        >
          <Plus size={16} />
          {isBrand
            ? "New brand"
            : isAffiliate
              ? "New affiliate"
              : "New account"}
        </Button>
      </SectionTitle>
      {!accountType && allAccounts.some((a) => a.type === "Supplier") && (
        <SupplierProvisionalNotice />
      )}
      <Card className="account-directory" data-view-table={module}>
        <div
          className="account-directory-tabs"
          role="group"
          aria-label="Account status"
        >
          {tabs.map((value) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setPage(0);
              }}
            >
              {value}
              <span>{countFor(value)}</span>
            </button>
          ))}
        </div>
        <div className="account-directory-toolbar">
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(0);
            }}
            placeholder={
              isBrand
                ? "Search brands…"
                : isAffiliate
                  ? "Search affiliates…"
                  : "Search accounts…"
            }
          />
          <Select
            className="input select"
            aria-label="Filter by owner"
            value={manager}
            onChange={(e) => {
              setManager(e.target.value);
              setPage(0);
            }}
          >
            <option value="All managers">All owners</option>
            {!managers.includes(manager) && manager !== "All managers" && (
              <option>{manager}</option>
            )}
            {managers.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
          {!accountType && (
            <Select
              className="input select"
              aria-label="Filter by status or type"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
            >
              {filterOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          )}
          <Select
            className="input select account-sort"
            aria-label="Sort accounts"
            value={`${sort}:${asc ? "asc" : "desc"}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split(":");
              setSort(key);
              setAsc(direction === "asc");
              setPage(0);
            }}
          >
            <option value="updated:desc">Recent updates</option>
            <option value="name:asc">Name: A–Z</option>
            <option value="name:desc">Name: Z–A</option>
            {isBrand && <option value="setup:asc">Setup remaining</option>}
            {![
              "updated:desc",
              "name:asc",
              "name:desc",
              ...(isBrand ? ["setup:asc"] : []),
            ].includes(`${sort}:${asc ? "asc" : "desc"}`) && (
              <option value={`${sort}:${asc ? "asc" : "desc"}`}>
                {sort} · {asc ? "ascending" : "descending"}
              </option>
            )}
          </Select>
        </div>
        <details className="account-view-options">
          <summary>
            <SlidersHorizontal size={14} />
            Views & columns
          </summary>
          <ViewControls
            module={module}
            snapshot={{ query, filter, manager, sort, asc }}
            defaults={{
              filter: allLabel,
              sort: "updated",
              asc: false,
              columns: defaultColumns,
            }}
            onApply={applyView}
            columns={columns}
            selectedColumns={selectedColumns}
            onColumns={selectColumns}
            requiredColumns={["Account"]}
          />
        </details>
        {eligible.length > 0 && <div className="selection-controls"><label><input className="record-checkbox" type="checkbox" aria-label="Select accounts on this page" checked={selected.length === eligible.length} ref={(node) => { if (node) node.indeterminate = selected.length > 0 && selected.length < eligible.length; }} onChange={(e) => setSelectedIds(e.target.checked ? eligible.map((a) => a.id) : [])} /> Select this page</label></div>}
        {selected.length > 0 && <div className="bulk-actions" role="region" aria-label="Bulk account actions"><strong aria-live="polite">{selected.length} selected</strong><Select aria-label="New account owner" value={newOwner} onChange={(e) => setNewOwner(e.target.value)}><option value="">Choose account owner</option>{data.users.filter((u) => u.active && u.roles.includes("Account Manager")).map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</Select><Button disabled={saving || !newOwner} onClick={assignSelected}>Assign owner</Button><Button variant="ghost" disabled={saving} onClick={() => setSelectedIds([])}>Clear selection</Button></div>}
        <div className="table-scroll">
          <table
            className={`account-table ${visibleColumns.length > 5 ? "account-table-expanded" : ""}`}
            aria-label={
              isBrand
                ? "Brand accounts"
                : isAffiliate
                  ? "Affiliate accounts"
                  : "Accounts"
            }
          >
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    data-column={column}
                    aria-sort={
                      sortable[column] === sort
                        ? asc
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {sortable[column] ? (
                      <SortHead
                        label={
                          column === "Account"
                            ? isBrand
                              ? "Brand"
                              : "Account"
                            : column === "Manager"
                              ? "Owner"
                              : column
                        }
                        onClick={() => doSort(sortable[column])}
                      />
                    ) : column === "Open" ? (
                      <span className="sr-only">Open account</span>
                    ) : (
                      column
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows
                .slice(current * pageSize, current * pageSize + pageSize)
                .map((account) => (
                  <tr key={account.id} onClick={() => openAccount(account)}>
                    {visibleColumns.map((column) => (
                      <td key={column} data-column={column}>
                        {column === "Account" ? <div className="account-selection-cell">{canReassign(account) && <input className="record-checkbox" type="checkbox" aria-label={`Select ${account.name}`} checked={selectedIds.includes(account.id)} onClick={(e) => e.stopPropagation()} onChange={() => setSelectedIds((ids) => ids.includes(account.id) ? ids.filter((id) => id !== account.id) : [...ids, account.id])} />}{cell(column, account)}</div> : cell(column, account)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="account-empty">
              <EmptyState
                title="No matching accounts"
                description="Try a different name, owner, or status."
              />
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <footer className="table-footer">
          <span aria-live="polite">
            Showing {rows.length ? current * pageSize + 1 : 0}–
            {Math.min(current * pageSize + pageSize, rows.length)} of{" "}
            {rows.length}{" "}
            {isBrand ? "brands" : isAffiliate ? "affiliates" : "accounts"}
          </span>
          <div>
            <Button
              variant="outline"
              size="icon"
              disabled={current === 0}
              aria-label="Previous page"
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={15} />
            </Button>
            <span>
              {current + 1} of {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={current === pages - 1}
              aria-label="Next page"
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </footer>
      </Card>
      <div className="account-directory-foot">
        <span>
          <GitBranch size={14} />
          Connected with {accountType ? "Operations" : "all workspaces"}
        </span>
        <span>Select an account to view details</span>
      </div>
    </div>
  );
}

export function exportCSV(rows: Account[]) {
  const fields = [
    "name",
    "type",
    "manager",
    "email",
    "status",
    "shopify",
  ] as const;
  const csv = [
    fields.join(","),
    ...rows.map((a) =>
      fields
        .map((field) => '"' + String(a[field]).replaceAll('"', '""') + '"')
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "bn-crm-accounts.csv";
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Account export downloaded");
}

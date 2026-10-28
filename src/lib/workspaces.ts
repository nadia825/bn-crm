import type { Account, Store } from "./data.ts";

export type WorkspaceId = "brands" | "affiliates" | "operations";
export type NavigationItem = { page: string; label: string };
export type NavigationGroup = { section: string; items: NavigationItem[] };
export type WorkspaceRoute = { workspace: WorkspaceId; page: string };

export const WORKSPACES = {
  brands: {
    name: "Brands",
    description: "Relationships, onboarding & brand growth",
    color: "purple",
    accountType: "Corporate Brand" as Account["type"],
  },
  affiliates: {
    name: "Affiliates",
    description: "Acquisition, launches & partnerships",
    color: "blue",
    accountType: "Affiliate" as Account["type"],
  },
  operations: {
    name: "Operations",
    description: "Business work, support & approvals",
    color: "amber",
    accountType: undefined,
  },
} as const;

const item = (page: string, label = page): NavigationItem => ({ page, label });
export const workspaceNavigation: Record<WorkspaceId, NavigationGroup[]> = {
  brands: [
    { section: "Overview", items: [item("Dashboard")] },
    {
      section: "Relationships",
      items: [item("Accounts", "Brand accounts"), item("Contacts")],
    },
    { section: "Brand launch", items: [item("Brand Onboarding")] },
    { section: "Brand work", items: [item("Tasks"), item("Support Cases")] },
  ],
  affiliates: [
    { section: "Overview", items: [item("Dashboard")] },
    {
      section: "Relationships",
      items: [item("Accounts", "Affiliate accounts"), item("Contacts")],
    },
    { section: "Partnership growth", items: [item("Affiliate Pipeline")] },
    {
      section: "Affiliate work",
      items: [item("Barrel Management"), item("Tasks"), item("Support Cases")],
    },
  ],
  operations: [
    { section: "Overview", items: [item("Dashboard")] },
    {
      section: "Delivery",
      items: [item("Work Board"), item("Tasks"), item("Support Cases")],
    },
    {
      section: "Review",
      items: [item("Brand Onboarding"), item("Pending Approvals")],
    },
    {
      section: "Partners & barrels",
      items: [item("Supplier Pipeline"), item("Barrel Management")],
    },
  ],
};
export const sharedGroups: NavigationGroup[] = [
  {
    section: "Across Bottle Nexus",
    items: [
      item("Company Overview", "Company overview"),
      item("All Accounts"),
      item("Activities"),
      item("Follow-ups"),
      item("Reports"),
    ],
  },
  {
    section: "Partners",
    items: [item("Team Assignments"), item("Retailers")],
  },
  {
    section: "Finance",
    items: [
      item("Billing"),
      item("Payment Follow-ups"),
      item("Finance Reports"),
    ],
  },
  {
    section: "Administration",
    items: [
      item("Users & Roles"),
      item("Configuration"),
      item("Audit Log"),
      item("Settings"),
    ],
  },
];
export const sharedNavigation: NavigationGroup = {
  section: "Across Bottle Nexus",
  items: sharedGroups.flatMap((g) => g.items),
};
export const navigationFor = (id: WorkspaceId) => [
  ...workspaceNavigation[id],
  ...sharedGroups,
];
export const pageSlug = (page: string) =>
  page === "Company Overview"
    ? "overview"
    : page.toLowerCase().replaceAll(" ", "-");
export const isWorkspace = (id: unknown): id is WorkspaceId =>
  typeof id === "string" && Object.hasOwn(WORKSPACES, id);
export const isSharedPage = (page: string) =>
  sharedNavigation.items.some((i) => i.page === page);
export const hasWorkspacePage = (id: WorkspaceId, page: string) =>
  workspaceNavigation[id].some((g) => g.items.some((i) => i.page === page));
export function workspaceForPage(
  page: string,
  preferred: WorkspaceId,
): WorkspaceId {
  if (isSharedPage(page) || hasWorkspacePage(preferred, page)) return preferred;
  return (
    (Object.keys(WORKSPACES) as WorkspaceId[]).find((id) =>
      hasWorkspacePage(id, page),
    ) || preferred
  );
}
export function routeHash(route: WorkspaceRoute) {
  return `#${isSharedPage(route.page) ? "company" : route.workspace}/${pageSlug(route.page)}`;
}
export function parseRoute(
  hash: string,
  preferred: WorkspaceId = "brands",
): WorkspaceRoute {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "company") {
    const page = sharedNavigation.items.find(
      (i) => pageSlug(i.page) === parts[1],
    )?.page;
    return { workspace: preferred, page: page || "Company Overview" };
  }
  if (isWorkspace(parts[0])) {
    const workspace = parts[0];
    const page = workspaceNavigation[workspace]
      .flatMap((g) => g.items)
      .find((i) => pageSlug(i.page) === parts[1])?.page;
    return { workspace, page: page || "Dashboard" };
  }
  if (!parts[0]) return { workspace: preferred, page: "Dashboard" };
  // Keep links from the original single-workspace prototype useful.
  if (parts[0] === "dashboard")
    return { workspace: preferred, page: "Company Overview" };
  const page = [
    ...Object.values(workspaceNavigation).flatMap((groups) =>
      groups.flatMap((g) => g.items),
    ),
    ...sharedNavigation.items,
  ].find((i) => pageSlug(i.page) === parts[0])?.page;
  return {
    workspace: page ? workspaceForPage(page, preferred) : preferred,
    page: page || "Dashboard",
  };
}
export function scopedAccounts(data: Store, id: WorkspaceId): Account[] {
  const type = WORKSPACES[id].accountType;
  return type ? data.accounts.filter((a) => a.type === type) : data.accounts;
}
export function scopedItems(
  data: Store,
  kind: "tasks" | "cases",
  id: WorkspaceId,
) {
  if (id === "operations") return data[kind];
  const ids = new Set(scopedAccounts(data, id).map((a) => a.id));
  return data[kind].filter((item) => ids.has(item.accountId));
}
export const openWork = (status: string) =>
  !["Done", "Aborted"].includes(status);
export const openCase = (status: string) =>
  !["Resolved", "Closed"].includes(status);

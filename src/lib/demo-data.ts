import type { Account, WorkItem } from "./data.ts";
import type { DemoData, DemoUser } from "./model.ts";
export const demoUsers: DemoUser[] = [
  {
    id: "olivia",
    name: "Olivia Parker",
    email: "olivia@bottlenexus.example",
    roles: ["System Admin"],
    active: true,
  },
  {
    id: "james",
    name: "James Wilson",
    email: "james@bottlenexus.example",
    roles: ["Sales Manager"],
    active: true,
  },
  {
    id: "sofia",
    name: "Sofia Chen",
    email: "sofia@bottlenexus.example",
    roles: ["Account Manager"],
    active: true,
  },
  {
    id: "marcus",
    name: "Marcus Reed",
    email: "marcus@bottlenexus.example",
    roles: ["Operations Manager"],
    active: true,
  },
  {
    id: "avery",
    name: "Avery Lane",
    email: "avery@bottlenexus.example",
    roles: ["Operations Member"],
    active: true,
  },
  {
    id: "taylor",
    name: "Taylor Morgan",
    email: "taylor@bottlenexus.example",
    roles: ["Finance"],
    active: true,
  },
  {
    id: "riley",
    name: "Riley Brooks",
    email: "riley@bottlenexus.example",
    roles: ["Viewer"],
    active: true,
    accountIds: ["BR-001", "BR-003", "AF-001", "AF-003"],
  },
  {
    id: "maya",
    name: "Maya Robinson",
    email: "maya@bottlenexus.example",
    roles: ["Account Manager", "Finance"],
    active: true,
  },
];
export function createDemoData(
  accounts: Account[],
  tasks: WorkItem[],
  cases: WorkItem[],
  retailers: string[],
): DemoData {
  accounts.forEach((a, i) => {
    a.bnxId = `BNX-${a.id}`;
    a.bnxVerified = true;
    a.customFields = {};
    a.checkOwners =
      a.type === "Corporate Brand"
        ? Array.from({ length: 6 }, (_, n) =>
            i < 6 && n % 3 === 2 ? "Avery Lane" : a.manager,
          )
        : [];
    if (a.type === "Affiliate" && i % 9 === 0) a.manager = "Maya Robinson";
  });
  tasks.forEach((t, i) => {
    if (i % 6 === 0) t.assignee = "Avery Lane";
  });
  cases.forEach((c, i) => {
    if (i % 4 === 0) c.assignee = "Avery Lane";
  });
  const clients = accounts.filter((a) => a.type !== "Supplier");
  return {
    users: structuredClone(demoUsers),
    audit: [],
    views: [],
    billing: clients
      .slice(0, 12)
      .concat(clients.slice(22, 28))
      .map((a, i) => ({
        id: `INV-${3001 + i}`,
        accountId: a.id,
        description: [
          "Platform subscription",
          "Launch configuration",
          "Distribution services",
        ][i % 3],
        amount: 350 + i * 125,
        due:
          i % 4 === 0
            ? `2026-10-${20 + (i % 7)}`
            : i % 4 === 1
              ? "2026-11-05"
              : `2026-10-${25 + (i % 6)}`,
        status: (["Overdue", "Open", "Paid", "Draft"] as const)[i % 4],
        reference: `DEMO-${i + 1}`,
      })),
    activities: clients
      .filter((_, i) => i % 5 === 0)
      .map((a, i) => ({
        id: `ACT-${401 + i}`,
        accountId: a.id,
        owner: a.manager,
        title: [
          "Launch planning call",
          "Quarterly account review",
          "Confirm retailer readiness",
          "Partnership follow-up",
        ][i % 4],
        kind: (["Meeting", "Call", "Note", "Follow-up"] as const)[i % 4],
        due: `2026-10-${29 + (i % 3)}T${10 + (i % 5)}:00`,
        status: i % 4 === 2 ? "Done" : "Scheduled",
        notes:
          "Fictional activity for reviewing the next steps with the account.",
      })),
    retailerRecords: retailers.map((name, i) => ({
      id: `RET-${String(i + 1).padStart(3, "0")}`,
      name,
      email: `store${i + 1}@retailers.example`,
      status: i % 6 === 0 ? "Onboarding" : "Active",
      region: ["Northeast", "Southeast", "Midwest", "West"][i % 4],
    })),
    configuration: {
      affiliateExtras: [],
      supplierStages: [
        "Prospect",
        "Qualification",
        "Samples & Review",
        "Agreement",
        "Active",
        "On Hold",
      ],
      customFields: [],
    },
    bnxDirectory: [
      ...accounts.map((a) => ({ id: a.bnxId!, name: a.name, type: a.type })),
      {
        id: "BNX-BR-901",
        name: "Meadowlight Spirits",
        type: "Corporate Brand",
      },
      { id: "BNX-AF-901", name: "The Tasting Society", type: "Affiliate" },
    ],
  };
}

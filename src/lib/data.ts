import { createDemoData } from "./demo-data.ts";
import type { DemoData } from "./model.ts";
export const managers = [
  "Olivia Parker",
  "James Wilson",
  "Sofia Chen",
  "Marcus Reed",
];
export const affiliateStages = [
  "Old Leads",
  "New",
  "Contacted",
  "Negotiation",
  "Contract Signed / Shopify",
  "Pre-Launch: Shop Ready",
  "Live",
  "On Hold",
  "Rejected",
  "Inactive",
];
export const workStages = [
  "New",
  "In Progress",
  "On Hold / Under Review",
  "Done",
  "Aborted",
];
export const caseStages = [
  "Open",
  "In Progress",
  "Waiting for Customer",
  "Resolved",
  "Closed",
];
export const supplierStages = [
  "Prospect",
  "Qualification",
  "Samples & Review",
  "Agreement",
  "Active",
  "On Hold",
];
export const barrelStages = [
  "Sourcing",
  "Reserved",
  "Bottling",
  "Live",
  "Sold Out",
];
export const requirements = [
  "Brand information & company profile",
  "Brand users & access permissions",
  "Product configuration",
  "Billing & Stripe configuration",
  "Buy Button / checkout configuration",
  "Shipping & distributor settings",
];
export type Comment = { id: string; author: string; text: string; at: string };
export type Account = {
  id: string;
  bnxId?: string;
  bnxVerified?: boolean;
  customFields?: Record<string, string>;
  checkOwners?: string[];
  name: string;
  type: "Corporate Brand" | "Affiliate" | "Supplier";
  manager: string;
  email: string;
  status: string;
  stage: string;
  retailers: string[];
  shopify: string;
  lastActivity: string;
  followUp: string;
  color: string;
  description: string;
  contacts: { name: string; role: string; email: string }[];
  notes: Comment[];
  history: Comment[];
  attachments: string[];
  checks: boolean[];
  verification: "Pending" | "Verified";
  approval: "Not submitted" | "Pending approval" | "Approved" | "Rejected";
};
export type WorkItem = {
  id: string;
  title: string;
  description: string;
  accountId: string;
  caseId?: string;
  category: string;
  assignee: string;
  priority: string;
  due: string;
  status: string;
  comments: Comment[];
  history: Comment[];
  attachments: string[];
  resolution: string;
  reminder: string;
};
export type Barrel = {
  id: string;
  name: string;
  affiliateId: string;
  supplierId: string;
  retailer: string;
  stock: number;
  sales: number;
  status: string;
};
export type Store = DemoData & {
  version: number;
  accounts: Account[];
  tasks: WorkItem[];
  cases: WorkItem[];
  barrels: Barrel[];
  retailers: string[];
  workspace: string;
  notificationsRead: boolean;
  settings: { reminders: boolean; digest: boolean };
};
const brandNames = [
  "Oak & Ember",
  "Northstar Spirits",
  "Copperline Distilling",
  "Wildwood Reserve",
  "Juniper House",
  "Stillwater Bourbon",
  "Cedar & Stone",
  "Hollow Creek",
  "Golden Hour Spirits",
  "Meridian Craft",
  "Bluebird Distillery",
  "Atlas Whiskey Co.",
  "Redwood Republic",
  "Fieldwork Spirits",
  "Foundry & Flask",
  "Saltwater Gin",
  "Ironwood Reserve",
  "Highland Vale",
  "Silverleaf Spirits",
  "The Good Cask",
];
const affiliateNames = [
  "The Bourbon Collective",
  "Bourbon & Beyond",
  "Cask Society",
  "Whiskey with Alex",
  "The Barrel Edit",
  "Proof & Palate",
  "Amber Enthusiast",
  "The Whiskey Journal",
  "Sip with Sarah",
  "Bourbon Trail Club",
  "Barrel & Bond",
  "The Neat Pour",
  "Cask Explorers",
  "Oak Notes",
  "Golden Dram",
  "Whiskey Weekends",
  "Single Barrel Social",
  "The Spirit Circle",
  "Pour Decisions Club",
  "Proof Positive",
  "The Bourbon Room",
  "Dram Discovery",
  "The Oak Club",
  "Whiskey Workshop",
  "Aged to Perfection",
  "Barrel Stories",
  "The Tasting Table",
  "Rye Society",
  "The Copper Cup",
  "Cask & Conversation",
  "Whiskey Compass",
  "Southern Sips",
  "The Malt Map",
  "Bourbon Avenue",
  "The Last Drop",
];
const supplierNames = [
  "Blue Ridge Cooperage",
  "Riverbend Distillers",
  "Heartland Barrel Co.",
  "Oak Valley Supply",
  "Cumberland Spirits",
  "Pioneer Cooperage",
  "Heritage Cask Works",
  "Mountain Creek Distillery",
  "Westward Barrel House",
  "Greenfield Spirits",
  "Old Mill Cooperage",
  "Stonebridge Distillers",
];
export const retailers = [
  "Oak Street Liquors",
  "The Bottle Shop",
  "Reserve Wine & Spirits",
  "Cask & Cork",
  "Downtown Spirits",
  "Westside Bottle Co.",
  "The Spirit Market",
  "Heritage Liquor",
  "Northside Cellars",
  "Barrel House Retail",
  "Main Street Spirits",
  "The Pour Store",
  "Craft Bottle Collective",
  "Fine Spirits Depot",
  "Copper City Liquors",
];
const colors = ["purple", "amber", "blue", "green", "rose", "teal"];
export const dateLabel = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export const event = (text: string): Comment => ({
  id: crypto.randomUUID(),
  author: "Olivia Parker",
  text,
  at: new Date().toISOString(),
});
function makeAccount(name: string, i: number, type: Account["type"]): Account {
  const stem = name.toLowerCase().replace(/[^a-z]/g, "");
  const isBrand = type === "Corporate Brand",
    isSupplier = type === "Supplier";
  const checks = Array.from(
    { length: 6 },
    (_, n) => (isBrand && i >= 7) || n < i % 6,
  );
  const stage = isSupplier
    ? supplierStages[i % 5]
    : isBrand
      ? i < 7
        ? "Onboarding"
        : "Active"
      : affiliateStages[
          i < 2
            ? 0
            : i < 7
              ? 1
              : i < 12
                ? 2
                : i < 17
                  ? 3
                  : i < 21
                    ? 4
                    : i < 25
                      ? 5
                      : i < 32
                        ? 6
                        : i < 33
                          ? 7
                          : i < 34
                            ? 8
                            : 9
        ];
  const person = [
    "Alex Bennett",
    "Sarah Mitchell",
    "Daniel Brooks",
    "Emma Collins",
    "Noah Hayes",
    "Maya Robinson",
  ][i % 6];
  return {
    id: `${isSupplier ? "SUP" : isBrand ? "BR" : "AF"}-${String(i + 1).padStart(3, "0")}`,
    name,
    type,
    manager: managers[i % 4],
    email: `hello@${stem}.example`,
    status: isBrand
      ? i < 7
        ? "Onboarding"
        : "Active"
      : isSupplier
        ? stage === "Active"
          ? "Active"
          : "Prospect"
        : stage === "Live"
          ? "Active"
          : ["On Hold", "Rejected", "Inactive"].includes(stage)
            ? stage
            : "Prospect",
    stage,
    retailers: [
      retailers[i % 15],
      ...(i % 3 === 0 ? [retailers[(i + 4) % 15]] : []),
    ],
    shopify:
      !isSupplier &&
      (["Contract Signed / Shopify", "Pre-Launch: Shop Ready", "Live"].includes(
        stage,
      ) ||
        (isBrand && i > 6))
        ? "Connected"
        : "Not connected",
    lastActivity: `${(i % 5) + 1}h ago`,
    followUp: `2026-10-${String(28 + (i % 4)).padStart(2, "0")}`,
    color: colors[i % 6],
    description: isBrand
      ? "Independent craft spirits brand creating distinctive bottles for a growing community. Building a connected direct-to-consumer experience with Bottle Nexus."
      : isSupplier
        ? "Trusted sourcing and production partner specializing in premium barrels and small-batch spirits."
        : "A passionate spirits community bringing exceptional single-barrel selections to enthusiasts nationwide.",
    contacts: [
      {
        name: person,
        role: isBrand ? "Brand Director" : "Founder",
        email: `${person.split(" ")[0].toLowerCase()}@${stem}.example`,
      },
      {
        name: "Taylor Morgan",
        role: "Operations",
        email: `operations@${stem}.example`,
      },
    ],
    notes: [
      {
        id: `note-${i}`,
        author: managers[i % 4],
        text: "Introductory call completed. Excited about the upcoming seasonal release and expanding retailer partnerships.",
        at: "2026-10-27T14:00:00Z",
      },
    ],
    history: [
      {
        id: `history-${i}`,
        author: managers[i % 4],
        text: "Updated account details after the weekly check-in.",
        at: "2026-10-28T08:30:00Z",
      },
    ],
    attachments: ["Partnership overview.pdf"],
    checks,
    verification: isBrand && i >= 7 ? "Verified" : "Pending",
    approval: isBrand && i >= 7 ? "Approved" : "Not submitted",
  };
}
const titles = [
  "Review autumn product catalog",
  "Configure Shopify buy button",
  "Confirm barrel-pick allocation",
  "Review distributor shipping zones",
  "Update brand assets",
  "Prepare partnership agreement",
  "Validate retailer inventory",
  "Set up billing configuration",
  "Schedule onboarding walkthrough",
  "Approve new product labels",
  "Coordinate launch announcement",
  "Follow up on collaborator access",
  "Reconcile September sales",
  "Review storefront experience",
  "Confirm seasonal stock delivery",
  "Prepare affiliate welcome pack",
  "Verify checkout configuration",
  "Update retailer contact details",
  "Arrange supplier sample tasting",
  "Finalize barrel release schedule",
];
export function seed(): Store {
  const accounts = [
    ...brandNames.map((n, i) => makeAccount(n, i, "Corporate Brand")),
    ...affiliateNames.map((n, i) => makeAccount(n, i, "Affiliate")),
    ...supplierNames.map((n, i) => makeAccount(n, i, "Supplier")),
  ];
  const tasks: WorkItem[] = Array.from({ length: 40 }, (_, i) => ({
    id: `BNT-${1041 + i}`,
    title: titles[i % 20],
    description: `Coordinate with the account team to ${titles[i % 20].toLowerCase()}. Confirm requirements, review the available materials, and document the outcome for the next business review.`,
    accountId: accounts[(i * 3) % accounts.length].id,
    category: [
      "Brand Operations",
      "Integration",
      "Barrel Picks",
      "Logistics",
      "Account Management",
    ][i % 5],
    assignee: managers[i % 4],
    priority: ["High", "Medium", "Low", "Medium", "Urgent"][i % 5],
    due: `2026-${i % 7 === 0 ? "11" : "10"}-${i % 7 === 0 ? "02" : String(27 + (i % 5))}`,
    status: workStages[i < 7 ? 0 : i < 21 ? 1 : i < 27 ? 2 : i < 38 ? 3 : 4],
    comments: [
      {
        id: `tc-${i}`,
        author: managers[(i + 1) % 4],
        text: "The latest details are ready for review. Please confirm the next steps with the account.",
        at: "2026-10-27T11:00:00Z",
      },
    ],
    history: [
      {
        id: `th-${i}`,
        author: managers[i % 4],
        text: "Work request created and assigned.",
        at: "2026-10-26T10:00:00Z",
      },
    ],
    attachments: i % 3 === 0 ? ["Reference brief.pdf"] : [],
    resolution: "",
    reminder: "On due date",
  }));
  const caseTitles = [
    "Bottle received without a label",
    "Shopify collaborator access blocked",
    "Retailer stock discrepancy",
    "Billing configuration issue",
    "Shipping tracking not updating",
    "Buy button displays wrong variant",
    "Barrel allocation mismatch",
    "Product images not appearing",
    "Missing retailer confirmation",
    "Checkout shipping rate incorrect",
    "Customer order confirmation missing",
    "Label artwork approval delay",
    "Distributor address update",
    "Shopify inventory sync delayed",
    "Refund status clarification",
  ];
  const cases: WorkItem[] = caseTitles.map((title, i) => ({
    id: `CASE-${201 + i}`,
    title,
    description: [
      "A customer reported receiving a bottle without the approved front label. Review the fulfillment batch and coordinate a replacement with the retailer.",
      "The account cannot grant collaborator access because Shopify is requesting additional identity verification. Coordinate the verification steps with the store owner.",
      "Retailer available inventory differs from the stock shown in the storefront. Please reconcile the latest stock report before the next release.",
      "The brand needs assistance confirming billing settings before activation. Review the mock configuration with the account owner.",
    ][i % 4],
    accountId: accounts[(i * 4) % 55].id,
    category: ["Fulfillment", "Integration", "Inventory", "Billing"][i % 4],
    assignee: managers[i % 4],
    priority: ["Urgent", "High", "High", "Medium", "Low"][i % 5],
    due: `2026-10-${28 + (i % 3)}`,
    status: caseStages[i % 5],
    comments: [
      {
        id: `cc-${i}`,
        author: managers[i % 4],
        text: "Account notified. Reviewing the supporting information with the operations team.",
        at: "2026-10-28T09:00:00Z",
      },
    ],
    history: [
      {
        id: `ch-${i}`,
        author: managers[i % 4],
        text: "Case opened from account request.",
        at: "2026-10-27T10:00:00Z",
      },
    ],
    attachments: i % 2 === 0 ? ["Customer reference.png"] : [],
    resolution:
      i % 5 > 2 ? "Configuration reviewed and confirmed with the account." : "",
    reminder: "On due date",
  }));
  tasks.forEach((t) => {
    const linked = cases.find((c) => c.accountId === t.accountId);
    if (linked) t.caseId = linked.id;
  });
  const barrels = Array.from({ length: 20 }, (_, i) => ({
    id: `BBL-${701 + i}`,
    name: [
      "Kentucky Straight Bourbon",
      "Single Barrel Rye",
      "Double Oak Reserve",
      "Wheated Bourbon",
    ][i % 4],
    affiliateId: `AF-${String((i % 35) + 1).padStart(3, "0")}`,
    supplierId: `SUP-${String((i % 12) + 1).padStart(3, "0")}`,
    retailer: retailers[i % 15],
    stock: i % 5 === 4 ? 0 : 240 - i * 9,
    sales: i % 5 < 2 ? 0 : i % 5 === 4 ? 240 : 24 + i * 7,
    status: barrelStages[i % 5],
  }));
  const extra = createDemoData(accounts, tasks, cases, retailers);
  return {
    ...extra,
    version: 1,
    accounts,
    tasks,
    cases,
    barrels,
    retailers,
    workspace: "Bottle Nexus",
    notificationsRead: false,
    settings: { reminders: true, digest: false },
  };
}

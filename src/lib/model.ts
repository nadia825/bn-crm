export type Role =
  | "System Admin"
  | "Sales Manager"
  | "Account Manager"
  | "Operations Manager"
  | "Operations Member"
  | "Finance"
  | "Viewer";
export type DemoUser = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  active: boolean;
  accountIds?: string[];
};
export type AuditEntry = {
  id: string;
  at: string;
  actorId: string;
  actor: string;
  roles: Role[];
  action: string;
  recordId: string;
  detail: string;
  outcome: "Allowed" | "Denied";
};
export type SavedView = {
  id: string;
  name: string;
  module: string;
  ownerId: string;
  visibility: "Personal" | "Shared";
  snapshot: Record<string, unknown>;
};
export type Invoice = {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  due: string;
  status: "Draft" | "Open" | "Overdue" | "Paid";
  reference: string;
};
export type Activity = {
  id: string;
  accountId: string;
  owner: string;
  title: string;
  kind: "Meeting" | "Call" | "Note" | "Follow-up";
  due: string;
  status: "Scheduled" | "Done";
  notes: string;
  participantIds?: string[];
  endAt?: string;
  timeZone?: string;
  location?: string;
  meetingUrl?: string;
  caseId?: string;
  taskId?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  reminder?: "None" | "At start" | "15 minutes before" | "1 hour before" | "1 day before";
  agenda?: string;
  outcome?: string;
  nextAction?: string;
};
export type RetailerRecord = {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Onboarding" | "Inactive";
  region: string;
};
export type CustomField = {
  id: string;
  label: string;
  type: "Text" | "Select";
  options: string[];
  scope: "All accounts" | "Corporate Brand" | "Affiliate";
  sensitive: boolean;
};
export type Configuration = {
  affiliateExtras: string[];
  supplierStages: string[];
  customFields: CustomField[];
};
export type BnxReference = {
  id: string;
  name: string;
  type: "Corporate Brand" | "Affiliate" | "Supplier";
};
export type DemoData = {
  users: DemoUser[];
  audit: AuditEntry[];
  views: SavedView[];
  billing: Invoice[];
  activities: Activity[];
  retailerRecords: RetailerRecord[];
  configuration: Configuration;
  bnxDirectory: BnxReference[];
};

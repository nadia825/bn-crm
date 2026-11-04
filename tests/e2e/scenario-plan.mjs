export const browserProjects = [
  { name: "desktop-chromium", device: "Desktop Chrome" },
  { name: "mobile-chromium", device: "Pixel 7" },
];

export const roleScenarios = [
  { name: "Olivia Parker", role: "System Admin", module: "Users & Roles" },
  { name: "James Wilson", role: "Sales Manager", module: "Team Assignments" },
  { name: "Sofia Chen", role: "Account Manager", module: "Brand accounts" },
  { name: "Marcus Reed", role: "Operations Manager", module: "Pending Approvals" },
  { name: "Avery Lane", role: "Operations Member", module: "Assigned work" },
  { name: "Taylor Morgan", role: "Finance", module: "Billing" },
  { name: "Riley Brooks", role: "Viewer", module: "Accessible accounts" },
  { name: "Maya Robinson", role: "Account Manager + Finance", module: "Billing" },
].map((person, index) => ({
  ...person,
  id: `ROLE-${String(index + 1).padStart(2, "0")}`,
  title: `${person.role} opens their workspace and retains identity after reload`,
  roles: [person.role],
  category: "Role/navigation",
  steps: [
    { id: "identity", action: `Open the CRM and select ${person.name}.`, expected: `The role switcher displays ${person.role} and ${person.name}.` },
    { id: "navigation", action: "Open navigation and inspect the available modules.", expected: `${person.module} is available. ${person.role === "System Admin" ? "Administration is available." : "Users & Roles is unavailable."}` },
    { id: "module", action: `Open ${person.module}.`, expected: "The destination page heading is visible and its route is recorded." },
    { id: "reload", action: "Reload the browser.", expected: "The selected identity, destination route and visible page are preserved." },
  ],
}));

const step = (id, action, expected) => ({ id, action, expected });
const requirements = [
  "Brand information & company profile", "Brand users & access permissions",
  "Product configuration", "Billing & Stripe configuration",
  "Buy Button / checkout configuration", "Shipping & distributor settings",
];

export const journeyScenarios = [
  {
    id: "JOURNEY-01", title: "Sales hands a new brand to its Account Manager; notes sync and survive reload",
    roles: ["Sales Manager", "Account Manager"], steps: [
      step("create", "As James, create Browser Harbor Spirits and assign Sofia Chen; open its notes.", "The account saves successfully and its profile can be opened."),
      step("note", "In a separate Sofia browser session, open the assigned brand and add the launch handoff note.", "Sofia owns the account and the saved note appears in its notes."),
      step("sync", "Return to James's already-open account without reloading.", "The note from Sofia appears automatically in James's session."),
      step("persist", "Reload James's browser, reopen the brand and inspect its notes.", "The saved handoff note remains after reload."),
    ],
  },
  {
    id: "JOURNEY-02", title: "Account Manager completes setup; Operations rejects, then approves a corrected brand",
    roles: ["System Admin", "Account Manager", "Operations Manager"], steps: [
      step("create", "Create Browser Juniper Launch and assign Sofia Chen.", "The brand is created successfully."),
      step("gates", "As Sofia, select the brand in onboarding before completing setup.", "There are six requirements; verification and submission are disabled."),
      ...requirements.map((name, index) => step(`check-${index + 1}`, `Complete requirement ${index + 1}: ${name}.`, "The requirement is checked and the server finishes saving.")),
      step("verify", "Run configuration verification.", "Configuration verified is displayed."),
      step("submit", "Submit the brand for approval as Sofia.", "The brand awaits Operations approval; Sofia cannot review it as an approver."),
      step("reject-gate", "As Marcus, open Pending Approvals and try to reject without a reason.", "Rejection is blocked with an instruction to supply a reason."),
      step("reject", "Enter distributor/shipping feedback and reject the launch.", "Sofia sees the exact Operations rejection feedback; resubmission is disabled."),
      step("correct", "As Sofia, reopen Shipping & distributor settings to address the rejection, complete that requirement again, then rerun simulated verification.", "The shipping check is saved as false, then true; configuration passes verification again. This verifies the prototype checklist workflow, not a real shipping integration."),
      step("resubmit", "Resubmit the corrected brand for Operations approval.", "The server accepts the submission."),
      step("approve", "As Marcus, approve and activate the corrected brand.", "Sofia sees This brand is active, and all six checklist controls are locked."),
      step("persist", "Reload Sofia's browser and select the brand again.", "The brand remains active after reload."),
    ],
  },
  {
    id: "JOURNEY-03", title: "Operations turns a support case into assigned work, then records its resolution",
    roles: ["System Admin", "Operations Member"], steps: [
      step("create", "Create Browser Support Brand, then open Operations support cases.", "The case list fits the device viewport."),
      step("case", "Create a missing-checkout-configuration case linked to the brand and assigned to Avery.", "The case editor closes after saving. The next step checks opening the record."),
      step("resolution-gate", "Try to resolve the case before recording an outcome.", "The app requests a resolution and the case remains Open."),
      step("work", "Create a repair request from the case and assign Avery.", "The account and support case are preselected; the request saves."),
      step("member", "In Avery's separate browser, open My tasks and the repair request.", "The linked case title is visible and reassignment is disabled."),
      step("comment", "As Avery, add a comment confirming the checkout repair.", "The saved comment is visible."),
      step("complete", "Set the repair request to Done, reload and reopen it.", "The request remains Done after reload."),
      step("resolve", "As the administrator, edit the support case, add a resolution and mark it Resolved.", "The case editor closes after the save is accepted."),
      step("persist", "Reload and reopen the case.", "The case is Resolved and retains the exact recorded resolution."),
    ],
  },
  {
    id: "JOURNEY-04", title: "A team lead filters requests and updates only the selected work together",
    roles: ["System Admin"], steps: [
      step("setup", "Create Browser Bulk Brand and open Operations Tasks.", "The task screen loads for the administrator."),
      step("request-1", "Create Browser batch prepare catalog for the brand.", "The page fits the viewport and the request saves."),
      step("request-2", "Create Browser batch confirm delivery for the brand.", "The second request saves."),
      step("request-3", "Create Browser untouched request for the brand.", "The control request saves without a status or priority change."),
      step("select", "Search for Browser batch and select all visible work.", "Exactly two requests are selected."),
      step("bulk", "Apply In Progress and High priority to the selection, then reload.", "The bulk save is accepted and the selection clears."),
      step("verify-1", "Reopen Browser batch prepare catalog.", "The request is In Progress with High priority."),
      step("verify-2", "Reopen Browser batch confirm delivery.", "The request is In Progress with High priority."),
      step("untouched", "Reopen Browser untouched request.", "The unselected request remains New with Medium priority."),
      step("filters", "Filter the batch by Urgent priority, then clear filters.", "The combined filter produces no results; clearing it restores the batch request."),
    ],
  },
  {
    id: "JOURNEY-05", title: "Two people editing the same account see a conflict instead of losing a saved change",
    roles: ["System Admin", "Account Manager"], steps: [
      step("first", "Create Browser Shared Edit and open its account editor as the administrator.", "The first editor is open with the initial record version."),
      step("second", "As Sofia in a separate browser, open the same account editor before either person saves.", "A second editor is open from the original record version."),
      step("save", "Save a Friday launch description in the administrator's browser.", "The first editor closes after saving."),
      step("conflict", "Try to save an outdated Tuesday launch description from Sofia's already-open editor.", "The editor stays open and the app reports that the record changed."),
      step("persist", "Cancel, reload Sofia's browser and reopen the account editor.", "The saved Friday description remains; the stale Tuesday edit did not overwrite it."),
    ],
  },
  {
    id: "JOURNEY-06", title: "A failed network save rolls back; the person can reconnect and retry",
    roles: ["System Admin"], steps: [
      step("setup", "Create Browser Network Recovery and open its notes.", "The account notes editor is available."),
      step("failure", "Simulate failed state requests and try to save a launch-window note.", "A connection error offers Reconnect; the failed note is absent from saved comments and its draft is retained."),
      step("reconnect", "Close the drawer, restore requests and click Reconnect.", "The CRM reports that it is connected to the shared database again."),
      step("retry", "Reopen notes and save the same note again.", "The note now appears in saved comments."),
      step("persist", "Reload and reopen the account's notes.", "The successfully retried note remains after reload."),
    ],
  },
  {
    id: "JOURNEY-07", title: "A Viewer can read designated accounts but cannot edit or add notes",
    roles: ["Viewer"], steps: [
      step("scope", "As Riley, open Brand accounts.", "Exactly two designated brands are available and New brand is disabled."),
      step("edit", "Open a designated brand profile.", "Edit account is disabled and New work request is unavailable."),
      step("note", "Open Notes & files and enter a note draft.", "Add note remains disabled for the Viewer."),
    ],
  },
  {
    id: "JOURNEY-08", title: "A person saves a filtered working list, restores it and exports only those accounts",
    roles: ["System Admin"], steps: [
      step("setup", "Create Browser Export Harbor and Browser Export Cedar.", "Both accounts save successfully."),
      step("filter", "Search for Harbor, open Views & columns and name a personal working list.", "The Save this view dialog is available with the supplied name."),
      step("keyboard", "Use Enter to open visibility options and Escape to dismiss them.", "The listbox opens, focus returns to the control, and Personal stays selected."),
      step("save", "Save the view and reload the browser.", "The Harbor filter is restored and Cedar is absent from the results."),
      step("restore", "Select Default view, then reselect the saved personal view.", "Default clears the search; the personal view restores the Harbor search."),
      step("export", "Download the filtered account CSV and inspect its contents.", "The file is bn-crm-accounts.csv with one header and one Harbor row, and no Cedar row."),
    ],
  },
  {
    id: "JOURNEY-09", title: "Reassign an account across managers without losing its notes, linked work or access boundaries",
    roles: ["System Admin", "Account Manager", "Account Manager + Finance"], steps: [
      step("setup", "Create Complex Handoff Brand owned by Sofia, save a handoff note and create linked work assigned to Avery.", "One account and one linked request exist; the note and original IDs are recorded from the server."),
      step("original-owner", "In Sofia's separate browser, open the account before reassignment.", "Sofia can see the account while she owns it."),
      step("reassign", "As Olivia, edit Account manager to Maya Robinson and save.", "The stored owner becomes Maya Robinson on the same account ID."),
      step("revoke", "Return to Sofia's already-open browser, then reload and search for the brand.", "The account disappears from Sofia's UI and server projection."),
      step("new-owner", "As Maya in a third browser, open the brand's notes and linked tasks.", "Maya sees the original handoff note and the same linked request."),
      step("integrity", "Read the server records after handoff and compare them to the original account and request IDs.", "No duplicate account or request exists; the note, task link and Avery assignment are preserved."),
    ],
  },
  {
    id: "JOURNEY-10", title: "Reject an invalid multi-case resolution atomically, then resolve only the selected cases",
    roles: ["System Admin", "Operations Manager"], steps: [
      step("setup", "Create Complex Bulk Brand; switch to Marcus and open Support Cases.", "Marcus can create cases for the brand."),
      step("case-1", "Create Complex selected case A with an empty resolution.", "The first case saves as Open."),
      step("case-2", "Create Complex selected case B with an empty resolution.", "The second case saves as Open."),
      step("control", "Create Complex untouched case as an unselected control.", "The control case saves as Open."),
      step("gate", "Search Complex selected, select the two visible cases and choose Resolved without a resolution.", "Exactly two cases are selected; Apply changes is disabled and neither record is saved as Resolved."),
      step("server-reject", "Send an explicit negative API test: attempt to resolve both cases while supplying a resolution for only the first.", "The API returns 422; the revision and both complete case records remain unchanged. This is an API validation probe, not a simulated UI click."),
      step("commit", "Enter Customer confirmed the repair in the UI bulk resolution field and apply the selection.", "The bulk save succeeds and the selection clears."),
      step("reload", "Reload, open each selected case and inspect its status and resolution.", "Both selected cases are Resolved with the exact shared resolution."),
      step("integrity", "Compare all three server records with the saved IDs.", "Only the selected cases changed; the unselected control remains Open with an empty resolution."),
    ],
  },
  {
    id: "JOURNEY-11", title: "Share a filtered account view across roles without exposing another owner's records",
    roles: ["System Admin", "Account Manager", "Viewer"], steps: [
      step("sofia-brand", "Create Complex Shared Sofia and assign Sofia Chen.", "Exactly one Sofia-owned brand is stored."),
      step("maya-brand", "Create Complex Shared Maya and assign Maya Robinson.", "Exactly one Maya-owned brand is stored."),
      step("publish", "As Olivia, filter Brand accounts by Complex Shared and save Complex Shared Review with Shared visibility.", "The shared view is stored with the exact search; Olivia sees both brands."),
      step("manager-scope", "As Sofia in a separate browser, select Complex Shared Review and reload.", "The saved search survives reload, only Sofia's brand is visible, and Sofia cannot delete the shared view."),
      step("viewer-scope", "As Riley in a third browser, select the same shared view.", "No new brand is visible because neither is designated for Riley; exporting produces only the CSV header."),
      step("integrity", "Read Sofia's and Riley's server projections and the administrator's view record.", "The shared filter does not widen record access; the same shared view remains stored."),
    ],
  },
];

export const scenarios = [...roleScenarios, ...journeyScenarios.map((scenario) => ({
  ...scenario,
  category: Number(scenario.id.split("-")[1]) >= 9 ? "Complex workflow" : "Workflow",
  preconditions: "Fresh seeded SQLite database; isolated browser storage; fictional demo identities; no dependencies on another scenario.",
}))];
export function findScenario(id) {
  const scenario = scenarios.find((entry) => entry.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}

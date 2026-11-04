import { scenarioTest, stepsFor, expect, ready, switchPerson, workspace, navigate, choose, createBrand, openBrand, notes, openWork, verify, readState } from "./fixtures";
import type { Page, Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function start(page: Page) {
  await page.goto("/");
  await ready(page);
}

async function closeDialog(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Close dialog", exact: true }).click();
}

async function createRequest(page: Page, title: string, account: string, assignee = "Olivia Parker") {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
    message: "The work list fits the viewport so its modal actions stay reachable",
  }).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "New work request", exact: true }).click();
  const form = page.getByRole("dialog");
  await form.getByRole("textbox", { name: "Summary", exact: true }).fill(title);
  await choose(page, form.getByRole("combobox", { name: /^Related account/ }), new RegExp(`^${account} ·`));
  await choose(page, form.getByRole("combobox", { name: /^Assignee/ }), assignee);
  await form.getByRole("button", { name: "Create request", exact: true }).click();
  await expect(form).toBeHidden();
  await ready(page);
}

scenarioTest("JOURNEY-01", async ({ page, people }) => {
  const step = stepsFor("JOURNEY-01");
  let manager: Page;
  const brand = "Browser Harbor Spirits";
  const note = "Dana confirmed the launch date. Operations can prepare the handoff.";
  await step("create", async () => {
    await start(page);
    await switchPerson(page, "James Wilson");
    await createBrand(page, brand);
    await openBrand(page, brand);
    await notes(page);
  });
  await step("note", async () => {
    manager = await people("Sofia Chen");
    await openBrand(manager, brand);
    await expect(manager.getByRole("dialog")).toContainText("Sofia Chen");
    await notes(manager);
    await manager.getByRole("textbox", { name: "Account note", exact: true }).fill(note);
    await manager.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(manager.getByRole("dialog").locator(".comment").getByText(note, { exact: true })).toBeVisible();
    await verify("Stored handoff note and its author", async () => (await readState(manager, "sofia")).data.accounts.find(record => record.name === brand)?.notes.filter(entry => entry.text === note).map(entry => ({ text: entry.text, author: entry.author })), [{ text: note, author: "Sofia Chen" }]);
  });
  await step("sync", async () => {
    // The other person's already-open screen must refresh without a manual reload.
    await page.bringToFront();
    await expect(page.getByRole("dialog").locator(".comment").getByText(note, { exact: true })).toBeVisible();
  });
  await step("persist", async () => {
    await page.reload();
    await ready(page);
    await openBrand(page, brand);
    await notes(page);
    await expect(page.getByRole("dialog").locator(".comment").getByText(note, { exact: true })).toBeVisible();
  });
});

scenarioTest("JOURNEY-02", async ({ page, people }) => {
  const step = stepsFor("JOURNEY-02");
  let manager: Page;
  let operations: Page;
  let checks: Locator;
  const brand = "Browser Juniper Launch";
  const reason = "Confirm the shipping zones with the distributor before launch.";
  await step("create", async () => {
    await start(page);
    await createBrand(page, brand);
  });
  await step("gates", async () => {
    manager = await people("Sofia Chen");
    await workspace(manager, "Brands");
    await navigate(manager, /Brand Onboarding/i);
    await manager.getByRole("button", { name: new RegExp(brand) }).click();
    await expect(manager.getByRole("button", { name: "Run verification", exact: true })).toBeDisabled();
    await expect(manager.getByRole("button", { name: "Submit for approval", exact: true })).toBeDisabled();
    checks = manager.getByRole("checkbox");
    await expect(checks).toHaveCount(6);
  });
  for (let index = 0; index < 6; index++) {
    await step(`check-${index + 1}`, async () => {
      await checks.nth(index).check();
      await ready(manager);
      await verify(`Requirement ${index + 1}: persisted check value`, async () => (await readState(manager, "sofia")).data.accounts.find(record => record.name === brand)?.checks[index], true);
    });
  }
  await step("verify", async () => {
    await manager.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(manager.getByRole("heading", { name: "Configuration verified", exact: true })).toBeVisible();
  });
  await step("submit", async () => {
    await manager.getByRole("button", { name: "Submit for approval", exact: true }).click();
    await expect(manager.getByRole("heading", { name: "Awaiting Operations approval", exact: true })).toBeVisible();
    await expect(manager.getByRole("button", { name: "Review in Operations", exact: true })).toBeDisabled();
  });
  await step("reject-gate", async () => {
    operations = await people("Marcus Reed");
    await navigate(operations, "Pending Approvals");
    await operations.getByRole("button", { name: new RegExp(brand) }).click();
    await operations.getByRole("button", { name: "Reject & return", exact: true }).click();
    await expect(operations.getByText("Add a reason before rejecting.", { exact: true })).toBeVisible();
  });
  await step("reject", async () => {
    await operations.getByRole("textbox", { name: "Approval review notes" }).fill(reason);
    await operations.getByRole("button", { name: "Reject & return", exact: true }).click();
    await manager.bringToFront();
    await expect(manager.getByRole("note", { name: "Operations rejection feedback" })).toContainText(reason);
    await expect(manager.getByRole("button", { name: "Submit for approval", exact: true })).toBeDisabled();
  });
  await step("correct", async () => {
    await checks.nth(5).uncheck();
    await ready(manager);
    await verify("Rejected shipping requirement is reopened on the server", async () => (await readState(manager, "sofia")).data.accounts.find(record => record.name === brand)?.checks[5], false);
    await checks.nth(5).check();
    await ready(manager);
    await verify("Corrected shipping requirement is saved on the server", async () => (await readState(manager, "sofia")).data.accounts.find(record => record.name === brand)?.checks[5], true);
    await manager.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(manager.getByRole("heading", { name: "Configuration verified", exact: true })).toBeVisible();
  });
  await step("resubmit", async () => {
    await manager.getByRole("button", { name: "Submit for approval", exact: true }).click();
    await ready(manager);
  });
  await step("approve", async () => {
    await operations.bringToFront();
    await operations.getByRole("button", { name: new RegExp(brand) }).click();
    await operations.getByRole("button", { name: "Approve & activate", exact: true }).click();
    await manager.bringToFront();
    await expect(manager.getByRole("heading", { name: "This brand is active", exact: true })).toBeVisible();
    for (let index = 0; index < 6; index++) await expect(checks.nth(index)).toBeDisabled();
    await verify("Approved brand status, approval and verification", async () => {
      const record = (await readState(manager, "sofia")).data.accounts.find(record => record.name === brand);
      return { status: record?.status, approval: record?.approval, verification: record?.verification, completedChecks: record?.checks.filter(Boolean).length };
    }, { status: "Active", approval: "Approved", verification: "Verified", completedChecks: 6 });
  });
  await step("persist", async () => {
    await manager.reload();
    await ready(manager);
    await manager.getByRole("button", { name: new RegExp(brand) }).click();
    await expect(manager.getByRole("heading", { name: "This brand is active", exact: true })).toBeVisible();
  });
});

scenarioTest("JOURNEY-03", async ({ page, people }) => {
  const step = stepsFor("JOURNEY-03");
  let dialog: Locator;
  let member: Page;
  const brand = "Browser Support Brand";
  const caseTitle = "Browser missing checkout configuration";
  const workTitle = "Browser repair checkout settings";
  await step("create", async () => {
    await start(page);
    await createBrand(page, brand);
    await workspace(page, "Operations");
    await navigate(page, /Support Cases/i);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
      message: "The case list fits the viewport so its modal actions stay reachable",
    }).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
  await step("case", async () => {
    await page.getByRole("button", { name: "New case", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Summary", exact: true }).fill(caseTitle);
    await choose(page, dialog.getByRole("combobox", { name: /^Related account/ }), new RegExp(`^${brand} ·`));
    await choose(page, dialog.getByRole("combobox", { name: /^Assignee/ }), "Avery Lane");
    await dialog.getByRole("button", { name: "Create case", exact: true }).click();
    await expect(dialog).toBeHidden();
  });
  await step("resolution-gate", async () => {
    await openWork(page, caseTitle);
    await choose(page, page.getByRole("combobox", { name: "Record status", exact: true }), "Resolved");
    await expect(page.getByText("Add a resolution before resolving this case.", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Record status", exact: true })).toContainText("Open");
  });
  await step("work", async () => {
    await dialog.getByRole("button", { name: "Create work request", exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("combobox", { name: /^Related account/ })).toContainText(brand);
    await expect(dialog.getByRole("combobox", { name: /^Linked support case/ })).toContainText(caseTitle);
    await dialog.getByRole("textbox", { name: "Summary", exact: true }).fill(workTitle);
    await choose(page, dialog.getByRole("combobox", { name: /^Assignee/ }), "Avery Lane");
    await dialog.getByRole("button", { name: "Create request", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "New work request", exact: true })).toBeHidden();
    await closeDialog(page);
    await ready(page);
  });
  await step("member", async () => {
    member = await people("Avery Lane");
    await navigate(member, "My tasks");
    await openWork(member, workTitle);
    await expect(member.getByRole("dialog")).toContainText(caseTitle);
    await expect(member.getByRole("combobox", { name: "Assigned owner", exact: true })).toBeDisabled();
  });
  await step("comment", async () => {
    await member.getByRole("textbox", { name: "New comment", exact: true }).fill("Checkout settings corrected and verified with the account owner.");
    await member.getByRole("button", { name: "Add comment", exact: true }).click();
    await expect(member.getByRole("dialog").locator(".comment").getByText("Checkout settings corrected and verified with the account owner.", { exact: true })).toBeVisible();
  });
  await step("complete", async () => {
    await choose(member, member.getByRole("combobox", { name: "Record status", exact: true }), "Done");
    await ready(member);
    await member.reload();
    await ready(member);
    await openWork(member, workTitle);
    await expect(member.getByRole("combobox", { name: "Record status", exact: true })).toContainText("Done");
  });
  await step("resolve", async () => {
    await page.bringToFront();
    await openWork(page, caseTitle);
    await page.getByRole("dialog").getByRole("button", { name: "Edit details", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Resolution", exact: true }).fill("Checkout repaired; the account owner confirmed the result.");
    await choose(page, dialog.getByRole("combobox", { name: /^Status/ }), "Resolved");
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit support case", exact: true })).toBeHidden();
  });
  await step("persist", async () => {
    await page.reload();
    await ready(page);
    await openWork(page, caseTitle);
    await expect(page.getByRole("combobox", { name: "Record status", exact: true })).toContainText("Resolved");
    await expect(page.getByRole("textbox", { name: "Case resolution", exact: true })).toHaveValue("Checkout repaired; the account owner confirmed the result.");
    await verify("Persisted case outcome after reload", async () => {
      const record = (await readState(page)).data.cases.find(record => record.title === caseTitle);
      return { status: record?.status, resolution: record?.resolution };
    }, { status: "Resolved", resolution: "Checkout repaired; the account owner confirmed the result." });
  });
});

scenarioTest("JOURNEY-04", async ({ page }) => {
  const step = stepsFor("JOURNEY-04");
  let search: Locator;
  let bulk: Locator;
  let filters: Locator;
  const brand = "Browser Bulk Brand";
  await step("setup", async () => {
    await start(page);
    await createBrand(page, brand);
    await workspace(page, "Operations");
    await navigate(page, "Tasks");
  });
  await step("request-1", async () => {
    await createRequest(page, "Browser batch prepare catalog", brand);
  });
  await step("request-2", async () => {
    await createRequest(page, "Browser batch confirm delivery", brand);
  });
  await step("request-3", async () => {
    await createRequest(page, "Browser untouched request", brand);
  });
  await step("select", async () => {
    search = page.getByRole("textbox", { name: "Search records…", exact: true });
    await search.fill("Browser batch");
    await page.getByRole("checkbox", { name: "Select all visible work", exact: true }).check();
    bulk = page.getByRole("region", { name: "Bulk work actions" });
    await expect(bulk).toContainText("2 selected");
  });
  await step("bulk", async () => {
    await choose(page, bulk.getByRole("combobox", { name: "Bulk status", exact: true }), "In Progress");
    await choose(page, bulk.getByRole("combobox", { name: "Bulk priority", exact: true }), "High");
    await bulk.getByRole("button", { name: "Apply changes", exact: true }).click();
    await expect(bulk).toBeHidden();
    await page.reload();
    await ready(page);
  });
  for (const title of ["Browser batch prepare catalog", "Browser batch confirm delivery"]) {
    await step(title.includes("catalog") ? "verify-1" : "verify-2", async () => {
      await openWork(page, title);
      await expect(page.getByRole("combobox", { name: "Record status", exact: true })).toContainText("In Progress");
      await expect(page.getByRole("dialog")).toContainText("High");
      await verify(`${title}: exact stored status and priority`, async () => {
        const record = (await readState(page)).data.tasks.find(record => record.title === title);
        return { status: record?.status, priority: record?.priority };
      }, { status: "In Progress", priority: "High" });
      await closeDialog(page);
    });
  }
  await step("untouched", async () => {
    await openWork(page, "Browser untouched request");
    await expect(page.getByRole("combobox", { name: "Record status", exact: true })).toContainText("New");
    await expect(page.getByRole("dialog")).toContainText("Medium");
    await closeDialog(page);
  });
  await step("filters", async () => {
    await search.fill("Browser batch");
    filters = page.getByLabel("Work filters", { exact: true });
    await choose(page, filters.getByRole("combobox", { name: /^Priority/ }), "Urgent");
    await expect(page.getByRole("heading", { name: "No records found", exact: true })).toBeVisible();
    await filters.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(page.getByText("Browser batch prepare catalog", { exact: true })).toBeVisible();
  });
});

scenarioTest("JOURNEY-05", async ({ page, people }) => {
  const step = stepsFor("JOURNEY-05");
  let second: Page;
  const brand = "Browser Shared Edit";
  await step("first", async () => {
    await start(page);
    await createBrand(page, brand);
    await openBrand(page, brand);
    await page.getByRole("button", { name: "Edit account", exact: true }).click();
  });
  await step("second", async () => {
    second = await people("Sofia Chen");
    await openBrand(second, brand);
    await second.getByRole("button", { name: "Edit account", exact: true }).click();
  });
  await step("save", async () => {
    await page.getByRole("textbox", { name: "Description", exact: true }).fill("First person confirmed a Friday launch.");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit account", exact: true })).toBeHidden();
  });
  await step("conflict", async () => {
    await second.getByRole("textbox", { name: "Description", exact: true }).fill("Second person has an outdated Tuesday launch.");
    await second.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(second.getByRole("dialog")).toBeVisible();
    await expect(second.getByText(/This record changed/i).first()).toBeVisible();
  });
  await step("persist", async () => {
    await second.getByRole("button", { name: "Cancel", exact: true }).click();
    await second.reload();
    await ready(second);
    await openBrand(second, brand);
    await second.getByRole("button", { name: "Edit account", exact: true }).click();
    await expect(second.getByRole("textbox", { name: "Description", exact: true })).toHaveValue("First person confirmed a Friday launch.");
  });
});

scenarioTest("JOURNEY-06", async ({ page }) => {
  const step = stepsFor("JOURNEY-06");
  const brand = "Browser Network Recovery";
  const note = "The account owner confirmed the new launch window.";
  await step("setup", async () => {
    await start(page);
    await createBrand(page, brand);
    await openBrand(page, brand);
    await notes(page);
  });
  await step("failure", async () => {
    await page.route("**/api/state*", (route) => route.abort("connectionfailed"));
    await page.getByRole("textbox", { name: "Account note", exact: true }).fill(note);
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(page.getByRole("status", { includeHidden: true }).filter({ hasText: "Reconnect" })).toBeVisible();
    await expect(page.getByRole("dialog").locator(".comment").filter({ hasText: note })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Account note", exact: true })).toHaveValue(note);
  });
  await step("reconnect", async () => {
    await closeDialog(page);
    await expect(page.getByRole("button", { name: "Reconnect", exact: true })).toBeVisible();
    await page.unroute("**/api/state*");
    await page.getByRole("button", { name: "Reconnect", exact: true }).click();
    await ready(page);
  });
  await step("retry", async () => {
    await openBrand(page, brand);
    await notes(page);
    await page.getByRole("textbox", { name: "Account note", exact: true }).fill(note);
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(page.getByRole("dialog").locator(".comment").getByText(note, { exact: true })).toBeVisible();
  });
  await step("persist", async () => {
    await page.reload();
    await ready(page);
    await openBrand(page, brand);
    await notes(page);
    await expect(page.getByRole("dialog").locator(".comment").getByText(note, { exact: true })).toBeVisible();
  });
});

scenarioTest("JOURNEY-07", async ({ page }) => {
  const step = stepsFor("JOURNEY-07");
  let viewButtons: Locator;
  await step("scope", async () => {
    await start(page);
    await switchPerson(page, "Riley Brooks");
    await workspace(page, "Brands");
    await navigate(page, "Brand accounts");
    await expect(page.getByRole("button", { name: "New brand", exact: true })).toBeDisabled();
    viewButtons = page.getByRole("button", { name: /^View / });
    await expect(viewButtons).toHaveCount(2);
  });
  await step("edit", async () => {
    await viewButtons.first().click();
    await expect(page.getByRole("button", { name: "Edit account", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "New work request", exact: true })).toHaveCount(0);
  });
  await step("note", async () => {
    await notes(page);
    await page.getByRole("textbox", { name: "Account note", exact: true }).fill("A Viewer should not be able to save this.");
    await expect(page.getByRole("button", { name: "Add note", exact: true })).toBeDisabled();
  });
});

scenarioTest("JOURNEY-08", async ({ page }) => {
  const step = stepsFor("JOURNEY-08");
  let search: Locator;
  let dialog: Locator;
  let visibility: Locator;
  const brand = "Browser Export Harbor";
  const other = "Browser Export Cedar";
  const viewName = "My Harbor launch list";
  await step("setup", async () => {
    await start(page);
    await createBrand(page, brand);
    await createBrand(page, other);
  });
  await step("filter", async () => {
    search = page.getByRole("textbox", { name: "Search brands…", exact: true });
    await search.fill(brand);
    await page.getByText("Views & columns", { exact: true }).click();
    await page.getByRole("button", { name: "Save view", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Save this view", exact: true });
    await dialog.getByRole("textbox", { name: "View name", exact: true }).fill(viewName);
    visibility = dialog.getByRole("combobox", { name: "View visibility", exact: true });
  });
  await step("keyboard", async () => {
    await visibility.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(visibility).toBeFocused();
    await expect(visibility).toContainText("Personal");
  });
  await step("save", async () => {
    await dialog.getByRole("button", { name: "Save view", exact: true }).click();
    await expect(dialog).toBeHidden();
    await ready(page);
    await page.reload();
    await ready(page);
    await expect(search).toHaveValue(brand);
    await expect(page.getByRole("button", { name: `View ${other}`, exact: true })).toHaveCount(0);
  });
  await step("restore", async () => {
    await page.getByText("Views & columns", { exact: true }).click();
    await choose(page, page.getByRole("combobox", { name: "Saved view", exact: true }), "Default view");
    await expect(search).toHaveValue("");
    await choose(page, page.getByRole("combobox", { name: "Saved view", exact: true }), `${viewName} · Personal`);
    await expect(search).toHaveValue(brand);
  });
  await step("export", async () => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("bn-crm-accounts.csv");
    const path = await download.path();
    expect(path).not.toBeNull();
    const csv = await readFile(path!, "utf8");
    expect(csv.trim().split("\n")).toHaveLength(2);
    expect(csv).toContain(brand);
    expect(csv).not.toContain(other);
  });
});

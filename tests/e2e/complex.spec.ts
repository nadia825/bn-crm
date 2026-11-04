import { scenarioTest, stepsFor, test, expect, ready, switchPerson, workspace, navigate, choose, createBrand, openBrand, notes, openWork, verify, readState, screenshotEvidence } from "./fixtures";
import type { Page } from "@playwright/test";
import type { WorkItem } from "../../src/lib/data.ts";
import { readFile } from "node:fs/promises";

const close = (page: Page) => page.getByRole("dialog").getByRole("button", { name: "Close dialog", exact: true }).click();
const search = (page: Page) => page.getByRole("textbox", { name: "Search records…", exact: true });

async function createCase(page: Page, title: string, brand: string) {
  await page.getByRole("button", { name: "New case", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Summary", exact: true }).fill(title);
  await choose(page, dialog.getByRole("combobox", { name: /^Related account/ }), new RegExp(`^${brand} ·`));
  await dialog.getByRole("button", { name: "Create case", exact: true }).click();
  await expect(dialog).toBeHidden();
  await verify(`${title}: stored status`, async () => (await readState(page, "marcus")).data.cases.find(record => record.title === title)?.status, "Open");
}

scenarioTest("JOURNEY-09", async ({ page, people }) => {
  const step = stepsFor("JOURNEY-09");
  const brand = "Complex Handoff Brand", title = "Complex preserve distributor follow-up";
  const note = "Distributor approved the Friday handoff; preserve this context for Maya.";
  let accountId: string, requestId: string, original: Page;
  await step("setup", async () => {
    await page.goto("/"); await ready(page); await createBrand(page, brand);
    await openBrand(page, brand); await notes(page);
    await page.getByRole("textbox", { name: "Account note", exact: true }).fill(note);
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    await expect(page.getByRole("dialog").locator(".comment").getByText(note, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "New work request", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Summary", exact: true }).fill(title);
    await choose(page, dialog.getByRole("combobox", { name: /^Assignee/ }), "Avery Lane");
    await dialog.getByRole("button", { name: "Create request", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "New work request", exact: true })).toBeHidden();
    await close(page);
    const state = await readState(page);
    accountId = state.data.accounts.find(record => record.name === brand)!.id;
    requestId = state.data.tasks.find(record => record.title === title)!.id;
    await verify("Original account ownership, saved note and linked request", async () => {
      const data = (await readState(page)).data;
      return { accounts: data.accounts.filter(record => record.name === brand).length, owner: data.accounts.find(record => record.id === accountId)?.manager, note: data.accounts.find(record => record.id === accountId)?.notes.some(entry => entry.text === note), taskAccount: data.tasks.find(record => record.id === requestId)?.accountId };
    }, { accounts: 1, owner: "Sofia Chen", note: true, taskAccount: accountId });
  });
  await step("original-owner", async () => {
    original = await people("Sofia Chen"); await openBrand(original, brand);
    await verify("Sofia can read the original account ID", async () => (await readState(original, "sofia")).data.accounts.filter(record => record.id === accountId).length, 1);
  });
  await step("reassign", async () => {
    await openBrand(page, brand);
    await page.getByRole("button", { name: "Edit account", exact: true }).click();
    await choose(page, page.getByRole("dialog").getByRole("combobox", { name: /^Account manager/ }), "Maya Robinson");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit account", exact: true })).toBeHidden();
    await verify("Account owner after reassignment", async () => (await readState(page)).data.accounts.find(record => record.id === accountId)?.manager, "Maya Robinson");
    await screenshotEvidence(page, "handoff-owner-saved");
  });
  await step("revoke", async () => {
    await original.bringToFront();
    await expect(original.getByRole("dialog", { name: brand, exact: true })).toBeHidden();
    await original.reload(); await ready(original);
    await original.getByRole("textbox", { name: "Search brands…", exact: true }).fill(brand);
    await verify("Former owner: visible matching account buttons", () => original.getByRole("button", { name: `View ${brand}`, exact: true }).count(), 0);
    await verify("Former owner: server account projection", async () => (await readState(original, "sofia")).data.accounts.filter(record => record.id === accountId).length, 0);
  });
  await step("new-owner", async () => {
    const maya = await people("Maya Robinson"); await openBrand(maya, brand); await notes(maya);
    await verify("Maya sees the exact handoff note", () => maya.getByRole("dialog").locator(".comment").getByText(note, { exact: true }).count(), 1);
    await choose(maya, maya.getByRole("dialog").getByRole("combobox", { name: "More account sections" }), "Tasks & cases");
    await expect(maya.getByRole("dialog").getByText(title, { exact: true })).toBeVisible();
    await screenshotEvidence(maya, "new-owner-linked-work");
  });
  await step("integrity", async () => {
    await verify("Stored IDs, assignments and note after handoff", async () => {
      const data = (await readState(page)).data;
      return { accountIds: data.accounts.filter(record => record.name === brand).map(record => record.id), taskIds: data.tasks.filter(record => record.title === title).map(record => record.id), taskAccount: data.tasks.find(record => record.id === requestId)?.accountId, assignee: data.tasks.find(record => record.id === requestId)?.assignee, notes: data.accounts.find(record => record.id === accountId)?.notes.filter(entry => entry.text === note).length };
    }, { accountIds: [accountId], taskIds: [requestId], taskAccount: accountId, assignee: "Avery Lane", notes: 1 });
  });
});

scenarioTest("JOURNEY-10", async ({ page }) => {
  const step = stepsFor("JOURNEY-10");
  const brand = "Complex Bulk Brand", titles = ["Complex selected case A", "Complex selected case B"], control = "Complex untouched case", resolution = "Customer confirmed the repair";
  let baseline: Awaited<ReturnType<typeof readState>>, selected: WorkItem[], controlId: string;
  await step("setup", async () => {
    await page.goto("/"); await ready(page); await createBrand(page, brand);
    await switchPerson(page, "Marcus Reed"); await navigate(page, /Support Cases/i);
    await expect(page.getByRole("button", { name: "New case", exact: true })).toBeEnabled();
  });
  await step("case-1", () => createCase(page, titles[0], brand));
  await step("case-2", () => createCase(page, titles[1], brand));
  await step("control", () => createCase(page, control, brand));
  await step("gate", async () => {
    await search(page).fill("Complex selected");
    await page.getByRole("checkbox", { name: "Select all visible work", exact: true }).check();
    const bulk = page.getByRole("region", { name: "Bulk work actions" });
    await expect(bulk).toContainText("2 selected");
    await choose(page, bulk.getByRole("combobox", { name: "Bulk status", exact: true }), "Resolved");
    await verify("Bulk resolution requires an outcome before applying", () => bulk.getByRole("button", { name: "Apply changes", exact: true }).isDisabled(), true);
    baseline = await readState(page, "marcus"); selected = baseline.data.cases.filter(record => titles.includes(record.title));
    controlId = baseline.data.cases.find(record => record.title === control)!.id;
    await verify("Both selected case statuses before any write", async () => selected.map(record => ({ status: record.status, resolution: record.resolution })), [{ status: "Open", resolution: "" }, { status: "Open", resolution: "" }]);
  });
  await step("server-reject", async () => {
    const payload = { revision: baseline.revision, patch: { collections: { cases: selected.map((record, index) => ({ id: record.id, before: record, after: { ...record, status: "Resolved", resolution: index === 0 ? resolution : "" } })) }, metadata: {} } };
    await test.info().attach("negative-api-request", { body: JSON.stringify({ actor: "marcus", method: "PATCH", url: "/api/state", body: payload }, null, 2), contentType: "application/json" });
    const response = await page.request.patch(new URL("/api/state", page.url()).href, { headers: { "X-Demo-User": "marcus" }, data: payload });
    const body = await response.json();
    await verify("Invalid batch response", async () => ({ status: response.status(), mentionsResolution: /resolution/i.test(body.error || "") }), { status: 422, mentionsResolution: true });
    await verify("Rejected batch leaves revision and both full records unchanged", async () => {
      const current = await readState(page, "marcus");
      return { revision: current.revision, cases: current.data.cases.filter(record => titles.includes(record.title)) };
    }, { revision: baseline.revision, cases: selected });
  });
  await step("commit", async () => {
    const bulk = page.getByRole("region", { name: "Bulk work actions" });
    await bulk.getByRole("textbox", { name: "Bulk case resolution", exact: true }).fill(resolution);
    await bulk.getByRole("button", { name: "Apply changes", exact: true }).click();
    await expect(bulk).toBeHidden(); await ready(page);
  });
  await step("reload", async () => {
    await page.reload(); await ready(page);
    for (const title of titles) {
      await openWork(page, title);
      await verify(`${title}: status shown after reload`, () => page.getByRole("combobox", { name: "Record status", exact: true }).innerText(), "Resolved");
      await verify(`${title}: resolution shown after reload`, () => page.getByRole("textbox", { name: "Case resolution", exact: true }).inputValue(), resolution);
      await screenshotEvidence(page, `resolved-${title.at(-1)}`); await close(page);
    }
  });
  await step("integrity", async () => {
    await verify("Selected records changed; control did not", async () => {
      const data = (await readState(page, "marcus")).data;
      return { selected: data.cases.filter(record => titles.includes(record.title)).map(record => ({ id: record.id, status: record.status, resolution: record.resolution })), control: data.cases.filter(record => record.id === controlId).map(record => ({ status: record.status, resolution: record.resolution })) };
    }, { selected: selected.map(record => ({ id: record.id, status: "Resolved", resolution })), control: [{ status: "Open", resolution: "" }] });
  });
});

scenarioTest("JOURNEY-11", async ({ page, people }) => {
  const step = stepsFor("JOURNEY-11");
  const sofiaBrand = "Complex Shared Sofia", mayaBrand = "Complex Shared Maya", viewName = "Complex Shared Review", query = "Complex Shared";
  let viewId: string, sofiaId: string, mayaId: string, sofia: Page, viewer: Page;
  await step("sofia-brand", async () => {
    await page.goto("/"); await ready(page); await createBrand(page, sofiaBrand);
    await verify("Created Sofia brand count", async () => (await readState(page)).data.accounts.filter(record => record.name === sofiaBrand && record.manager === "Sofia Chen").length, 1);
  });
  await step("maya-brand", async () => {
    await createBrand(page, mayaBrand, "Maya Robinson");
    await verify("Created Maya brand count", async () => (await readState(page)).data.accounts.filter(record => record.name === mayaBrand && record.manager === "Maya Robinson").length, 1);
    const data = (await readState(page)).data;
    sofiaId = data.accounts.find(record => record.name === sofiaBrand)!.id; mayaId = data.accounts.find(record => record.name === mayaBrand)!.id;
  });
  await step("publish", async () => {
    await page.getByRole("textbox", { name: "Search brands…", exact: true }).fill(query);
    await page.getByText("Views & columns", { exact: true }).click();
    await page.getByRole("button", { name: "Save view", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Save this view", exact: true });
    await dialog.getByRole("textbox", { name: "View name", exact: true }).fill(viewName);
    await choose(page, dialog.getByRole("combobox", { name: "View visibility", exact: true }), "Shared");
    await dialog.getByRole("button", { name: "Save view", exact: true }).click(); await expect(dialog).toBeHidden();
    await verify("Administrator sees both filtered brands", () => page.getByRole("button", { name: /^View Complex Shared / }).count(), 2);
    const saved = (await readState(page)).data.views.find(record => record.name === viewName)!; viewId = saved.id;
    await verify("Shared view visibility and saved query", async () => { const record = (await readState(page)).data.views.find(record => record.id === viewId); return { visibility: record?.visibility, query: record?.snapshot.query }; }, { visibility: "Shared", query });
  });
  await step("manager-scope", async () => {
    sofia = await people("Sofia Chen"); await navigate(sofia, "Brand accounts");
    await sofia.getByText("Views & columns", { exact: true }).click();
    await choose(sofia, sofia.getByRole("combobox", { name: "Saved view", exact: true }), `${viewName} · Shared`);
    await sofia.reload(); await ready(sofia);
    await verify("Sofia's restored shared-view search", () => sofia.getByRole("textbox", { name: "Search brands…", exact: true }).inputValue(), query);
    await verify("Sofia's visible brand buttons", async () => ({ own: await sofia.getByRole("button", { name: `View ${sofiaBrand}`, exact: true }).count(), other: await sofia.getByRole("button", { name: `View ${mayaBrand}`, exact: true }).count() }), { own: 1, other: 0 });
    await sofia.getByText("Views & columns", { exact: true }).click();
    await verify("Non-admin cannot delete the shared view", () => sofia.getByRole("button", { name: "Delete selected view", exact: true }).isDisabled(), true);
    await screenshotEvidence(sofia, "shared-view-manager-scope");
  });
  await step("viewer-scope", async () => {
    viewer = await people("Riley Brooks"); await navigate(viewer, "Brand accounts");
    await viewer.getByText("Views & columns", { exact: true }).click();
    await choose(viewer, viewer.getByRole("combobox", { name: "Saved view", exact: true }), `${viewName} · Shared`);
    await verify("Viewer's matching brands in shared view", () => viewer.getByRole("button", { name: /^View Complex Shared / }).count(), 0);
    const pending = viewer.waitForEvent("download"); await viewer.getByRole("button", { name: "Export", exact: true }).click();
    const file = await pending; const path = await file.path(); expect(path).not.toBeNull(); const csv = await readFile(path!, "utf8");
    await verify("Viewer CSV contains only the header", async () => ({ rows: csv.trim().split("\n").length, includesSofia: csv.includes(sofiaBrand), includesMaya: csv.includes(mayaBrand) }), { rows: 1, includesSofia: false, includesMaya: false });
    await screenshotEvidence(viewer, "shared-view-viewer-scope");
  });
  await step("integrity", async () => {
    await verify("Role-filtered API records and preserved shared view", async () => ({ sofia: (await readState(sofia, "sofia")).data.accounts.filter(record => [sofiaId, mayaId].includes(record.id)).map(record => record.id), viewer: (await readState(viewer, "riley")).data.accounts.filter(record => [sofiaId, mayaId].includes(record.id)).map(record => record.id), sharedViews: (await readState(page)).data.views.filter(record => record.id === viewId && record.visibility === "Shared").length }), { sofia: [sofiaId], viewer: [], sharedViews: 1 });
  });
});

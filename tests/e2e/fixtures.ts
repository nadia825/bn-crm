import { test as base, expect, devices, type Page, type Locator, type BrowserContext, type TestInfo } from "@playwright/test";
import { findScenario } from "./scenario-plan.mjs";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../../src/lib/data.ts";
import { CrmDatabase } from "../../server/database.ts";
import { createCrmServer } from "../../server/service.ts";

const exportRoot = process.env.BN_CRM_E2E_EXPORT_ROOT || fileURLToPath(new URL("../../out/", import.meta.url));
const pagesByTest = new WeakMap<TestInfo, Page[]>();
function registerPage(info: TestInfo, page: Page) {
  const pages = pagesByTest.get(info) || [];
  if (!pages.includes(page)) pages.push(page);
  pagesByTest.set(info, pages);
}

async function checkpoints(info: TestInfo) {
  return Promise.all((pagesByTest.get(info) || []).map(async (page, index) => {
    if (page.isClosed()) return { session: index + 1, unavailable: "Browser session was closed." };
    try {
      return { session: index + 1, url: page.url(), ...await page.evaluate(() => {
        const visible = (element: Element) => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== "hidden";
        const rolePicker = document.querySelector('[role="combobox"][aria-label="Demo role switcher"]');
        const root = Array.from(document.querySelectorAll('[role="dialog"]')).find(visible) || document.querySelector("main") || document.body;
        const allFields = Array.from(root.querySelectorAll('input, textarea, [role="combobox"]')).filter(element => visible(element) && element.getAttribute("aria-hidden") !== "true" && element.getAttribute("type") !== "password");
        return {
          actor: rolePicker?.textContent?.trim() || "Identity control unavailable",
          headings: Array.from(root.querySelectorAll("h1,h2")).filter(visible).map(element => element.textContent?.trim()),
          fields: allFields.slice(0, 50).map(element => {
            const input = element as HTMLInputElement;
            const label = element.getAttribute("aria-label") || element.closest("label")?.querySelector("strong")?.textContent?.trim() || Array.from(element.closest("label")?.childNodes || []).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent?.trim()).filter(Boolean).join(" ") || input.name || input.type;
            return { label, value: element.getAttribute("role") === "combobox" ? element.textContent?.trim() : input.value, checked: input.type === "checkbox" ? input.checked : undefined, disabled: input.disabled };
          }),
          omittedFields: Math.max(0, allFields.length - 50),
          savedComments: Array.from(root.querySelectorAll(".comment p")).map(element => element.textContent?.trim()),
          capturedAt: new Date().toISOString(),
        };
      }) };
    } catch (error) { return { session: index + 1, unavailable: error instanceof Error ? error.message : String(error) }; }
  }));
}
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// Each test gets its own real backend, SQLite file and ephemeral loopback port.
// There is deliberately no option to redirect these write tests to the live CRM.
export const test = base.extend<{ appURL: string; people: (name: string) => Promise<Page> }>({
  appURL: async ({}, use) => {
    await readFile(join(exportRoot, "index.html")).catch(() => {
      throw new Error("Missing static export. Run npm run test:e2e to build it first.");
    });
    const directory = await mkdtemp(join(tmpdir(), "bn-crm-e2e-"));
    const database = new CrmDatabase(join(directory, "test.sqlite"));
    const api = createCrmServer(database);
    const server = createServer(async (req, res) => {
      try {
        const pathname = new URL(req.url || "/", "http://localhost").pathname;
        if (pathname.startsWith("/api/")) {
          api.emit("request", req, res);
          return;
        }
        if (pathname === "/runtime-config.json") {
          res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify({ mode: "server" }));
          return;
        }
        const path = resolve(exportRoot, `.${decodeURIComponent(pathname === "/" ? "/index.html" : pathname)}`);
        if (!path.startsWith(resolve(exportRoot) + sep)) {
          res.writeHead(403).end();
          return;
        }
        const body = await readFile(path);
        res.writeHead(200, { "Content-Type": contentTypes[extname(path)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404).end("Not found");
      }
    });
    try {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No test server address");
      await use(`http://127.0.0.1:${address.port}`);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
      database.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
  baseURL: async ({ appURL }, use) => use(appURL),
  people: async ({ browser, appURL }, use, testInfo) => {
    const sessions: BrowserContext[] = [];
    const errors: string[] = [];
    try {
      await use(async (name) => {
        const device = testInfo.project.name.startsWith("mobile") ? "Pixel 7" : "Desktop Chrome";
        const session = await browser.newContext({ ...devices[device], baseURL: appURL, locale: "en-US", timezoneId: "Africa/Tunis" });
        sessions.push(session);
        const page = await session.newPage();
        registerPage(testInfo, page);
        page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
        await page.goto("/");
        await ready(page);
        await switchPerson(page, name);
        return page;
      });
    } finally {
      for (const session of sessions) await session.close();
    }
    expect(errors, "No uncaught exceptions in other user sessions").toEqual([]);
  },
  // Uncaught browser exceptions fail journeys, including on additional user pages.
  context: async ({ context }, use, testInfo) => {
    const errors: string[] = [];
    context.on("page", (page) => {
      registerPage(testInfo, page);
      page.on("pageerror", (error) => errors.push(error.message));
    });
    await use(context);
    if (errors.length) {
      await testInfo.attach("browser-errors", { body: errors.join("\n"), contentType: "text/plain" });
      expect(errors, "No uncaught browser exceptions").toEqual([]);
    }
  },
});

export { expect };

export function scenarioTest(id: string, body: (args: { page: Page; people: (name: string) => Promise<Page> }, info: TestInfo) => Promise<void>) {
  const scenario = findScenario(id);
  test(scenario.title, { annotation: { type: "scenario", description: id } }, body);
}

export function stepsFor(scenarioId: string) {
  const scenario = findScenario(scenarioId);
  const seen = new Set<string>();
  return async <T,>(id: string, body: () => Promise<T>): Promise<T> => {
    const step = scenario.steps.find((entry) => entry.id === id);
    if (!step || seen.has(id)) throw new Error(`Unknown or duplicate step: ${scenarioId}/${id}`);
    seen.add(id);
    return test.step(`[${id}] ${step.action}`, async (info) => {
      try { return await body(); }
      finally {
        await info.attach("page-checkpoints", { body: JSON.stringify(await checkpoints(test.info())), contentType: "application/json" });
      }
    });
  };
}

/** Records the value actually read by the successful/failing poll, never a copied expected result. */
export async function verify<T>(label: string, read: () => Promise<T>, expected: T) {
  await test.step(`Observed comparison: ${label}`, async (info) => {
    let observed: T | undefined;
    let matched = false;
    try {
      await expect.poll(async () => { observed = await read(); return observed; }, { message: label }).toEqual(expected);
      matched = true;
    } finally {
      await info.attach("observed-comparison", { body: JSON.stringify({ label, expected, observed, available: observed !== undefined, matched, capturedAt: new Date().toISOString() }), contentType: "application/json" });
    }
  });
}

export async function readState(page: Page, actorId = "olivia"): Promise<{ revision: number; data: Store }> {
  const response = await page.request.get(new URL("/api/state", page.url()).href, { headers: { "X-Demo-User": actorId } });
  expect(response.status(), `Read server state as ${actorId}`).toBe(200);
  return response.json();
}

export async function screenshotEvidence(page: Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot(), contentType: "image/png" });
}

export async function choose(page: Page, control: Locator, option: string | RegExp) {
  await control.click();
  await page.getByRole("option", { name: option, exact: typeof option === "string" }).click();
}

export async function ready(page: Page) {
  await expect(page.getByRole("combobox", { name: "Demo role switcher", includeHidden: true })).toBeEnabled();
  await expect(page.getByRole("status", { includeHidden: true }).filter({ hasText: "Shared across local sessions" })).toBeVisible();
}

export async function switchPerson(page: Page, name: string) {
  await choose(page, page.getByRole("combobox", { name: "Demo role switcher" }), new RegExp(`— ${name}$`));
  await expect(page.getByRole("combobox", { name: "Demo role switcher" })).toContainText(name);
  await ready(page);
}

export async function openNavigation(page: Page) {
  if (await page.getByRole("button", { name: "Close navigation", exact: true }).isVisible()) return;
  const opener = page.getByRole("button", { name: "Open navigation", exact: true });
  if (await opener.isVisible()) await opener.click();
}

export async function navigate(page: Page, name: string | RegExp) {
  await openNavigation(page);
  await page.getByRole("complementary").getByRole("button", { name, exact: typeof name === "string" }).click();
}

export async function workspace(page: Page, name: string) {
  await openNavigation(page);
  await page.getByRole("button", { name: "Switch workspace", exact: true }).click();
  await page.getByRole("button", { name: `${name} workspace`, exact: true }).click();
  const closer = page.getByRole("button", { name: "Close navigation", exact: true });
  if (await closer.isVisible()) await closer.click();
}

export async function createBrand(page: Page, name: string, owner = "Sofia Chen") {
  await workspace(page, "Brands");
  await navigate(page, "Brand accounts");
  await page.getByRole("button", { name: "New brand", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Account name", exact: true }).fill(name);
  await dialog.getByRole("textbox", { name: "Email", exact: true }).fill("browser-test@brands.example");
  await dialog.getByRole("textbox", { name: "Primary contact", exact: true }).fill("Dana Browser");
  await choose(page, dialog.getByRole("combobox", { name: /^Account manager/ }), owner);
  await dialog.getByRole("button", { name: "Create brand", exact: true }).click();
  await expect(dialog).toBeHidden();
  await ready(page);
  const actorId = await page.evaluate(() => localStorage.getItem("bn-crm-demo-user") || "olivia");
  await verify("Persisted new brand: exact name, owner, count and initial status", async () => {
    const matches = (await readState(page, actorId)).data.accounts.filter(record => record.name === name);
    return { count: matches.length, name: matches[0]?.name, owner: matches[0]?.manager, status: matches[0]?.status };
  }, { count: 1, name, owner, status: "Onboarding" });
}

export async function openBrand(page: Page, name: string) {
  await workspace(page, "Brands");
  await navigate(page, "Brand accounts");
  await page.getByRole("textbox", { name: "Search brands…", exact: true }).fill(name);
  await page.getByRole("button", { name: `View ${name}`, exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name, exact: true })).toBeVisible();
}

export async function notes(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Notes & files", exact: true }).click();
}

export async function openWork(page: Page, title: string) {
  await page.getByRole("textbox", { name: "Search records…", exact: true }).fill(title);
  await page.getByText(title, { exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: title, exact: true })).toBeVisible();
}

import { scenarioTest, stepsFor, expect, ready, switchPerson, openNavigation, navigate, verify } from "./fixtures";
import { roleScenarios } from "./scenario-plan.mjs";

for (const person of roleScenarios) {
  scenarioTest(person.id, async ({ page }) => {
    const step = stepsFor(person.id);
    let route: string;
    await step("identity", async () => {
      await page.goto("/");
      await ready(page);
      await switchPerson(page, person.name);
      await expect(page.getByRole("combobox", { name: "Demo role switcher" })).toContainText(person.role);
      await verify("Exact selected demo identity", () => page.getByRole("combobox", { name: "Demo role switcher" }).innerText(), `${person.role} — ${person.name}`);
    });
    await step("navigation", async () => {
      await openNavigation(page);
      const sidebar = page.getByRole("complementary");
      await expect(sidebar.getByRole("button", { name: person.module, exact: true })).toBeVisible();
      if (person.role !== "System Admin") {
        await expect(sidebar.getByRole("button", { name: "Users & Roles", exact: true })).toHaveCount(0);
      }
      await verify("Available module and administration control", async () => ({ module: await sidebar.getByRole("button", { name: person.module, exact: true }).count(), administration: await sidebar.getByRole("button", { name: "Users & Roles", exact: true }).count() }), { module: 1, administration: person.role === "System Admin" ? 1 : 0 });
    });
    await step("module", async () => {
      await navigate(page, person.module);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      route = new URL(page.url()).hash;
    });
    await step("reload", async () => {
      await page.reload();
      await ready(page);
      await expect(page.getByRole("combobox", { name: "Demo role switcher" })).toContainText(person.name);
      expect(new URL(page.url()).hash).toBe(route);
      await verify("Destination route after browser reload", async () => new URL(page.url()).hash, route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });
}

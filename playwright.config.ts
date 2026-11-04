import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { browserProjects } from "./tests/e2e/scenario-plan.mjs";

const artifacts = process.env.BN_CRM_E2E_ARTIFACTS;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  outputDir: artifacts ? join(artifacts, "test-results") : "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: artifacts ? join(artifacts, "playwright-report") : "playwright-report" }],
    ["json", { outputFile: artifacts ? join(artifacts, "test-results/results.json") : "test-results/results.json" }],
    ["./tests/e2e/scenario-reporter.mjs", { outputDir: process.env.BN_CRM_SCENARIO_REPORT_DIR || join(artifacts || "test-results", "scenario-report") }],
  ],
  use: {
    actionTimeout: 15_000,
    locale: "en-US",
    timezoneId: "Africa/Tunis",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: browserProjects.map((project) => ({ name: project.name, use: { ...devices[project.device] } })),
});

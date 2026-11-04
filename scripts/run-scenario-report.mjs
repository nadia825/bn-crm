import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, appendFileSync, writeFileSync, renameSync, readdirSync, readFileSync, copyFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { createReport, readReport, writeReport, finishReport, clean } from "../tests/e2e/scenario-report.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const runId = `${new Date().toISOString().replaceAll(":", "-").replace(".000", "")}-${randomUUID().slice(0, 8)}`;
const directory = join(root, "reports/user-journeys", runId);
const git = (args) => { try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
const executableTests = () => ["playwright.config.ts", "scripts/run-scenario-report.mjs", "package.json", ...readdirSync(join(root, "tests/e2e")).filter(name => /\.(ts|mjs|json)$/.test(name)).map(name => `tests/e2e/${name}`)].sort();
const hashFile = path => createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
const manifest = executableTests().map(path => ({ path, sha256: hashFile(path) }));
for (const file of manifest) {
  // Plaintext copies preserve reviewable source without entering TypeScript's **/*.ts build inputs.
  const target = join(directory, "sources", `${file.path}.txt`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, file.path), target);
}
writeFileSync(join(directory, "sources/manifest.json"), JSON.stringify(manifest, null, 2));
const stages = [
  { id: "typecheck", title: "TypeScript checks", binary: npm, args: ["run", "typecheck"] },
  { id: "data", title: "Data and API tests", binary: npm, args: ["run", "test:data"] },
  { id: "build", title: "Fresh production build", binary: npm, args: ["run", "build"] },
  { id: "browser", title: "Desktop and mobile user scenarios", binary: process.execPath, args: [join(root, "node_modules/@playwright/test/cli.js"), "test"] },
];
let interrupted = false, activeChild;
const stop = (signal) => {
  interrupted = true;
  if (activeChild?.pid) {
    try { if (process.platform !== "win32") process.kill(-activeChild.pid, signal); else activeChild.kill(signal); } catch { /* the owned command may already have exited */ }
  }
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

async function execute(stage, env) {
  const startedAt = new Date().toISOString(), start = Date.now();
  const log = `logs/${stage.id}.log`;
  let tail = "";
  writeFileSync(join(directory, log), "");
  const result = await new Promise((done) => {
    const child = spawn(stage.binary, stage.args, { cwd: root, env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
    activeChild = child;
    const output = (chunk, stream) => {
      appendFileSync(join(directory, log), chunk);
      stream.write(chunk);
      tail = (tail + chunk.toString()).slice(-24000);
    };
    child.stdout.on("data", (chunk) => output(chunk, process.stdout));
    child.stderr.on("data", (chunk) => output(chunk, process.stderr));
    child.on("error", (error) => done({ exitCode: 1, signal: null, error: error.message }));
    child.on("close", (exitCode, signal) => done({ exitCode, signal }));
  });
  activeChild = undefined;
  return {
    id: stage.id, title: stage.title, command: `${stage.binary === process.execPath ? "node" : "npm"} ${stage.args.join(" ")}`,
    status: interrupted ? "Interrupted" : result.exitCode === 0 ? "Passed" : "Failed",
    startedAt, durationMs: Date.now() - start, exitCode: result.exitCode, signal: result.signal, log,
    ...((result.exitCode !== 0 || result.error) ? { error: clean(result.error || tail) } : {}),
  };
}

let report = createReport({ runId, commit: git(["rev-parse", "--short", "HEAD"]), dirty: !!git(["status", "--porcelain"]), nodeVersion: process.version, platform: process.platform, testSourceSha256: createHash("sha256").update(JSON.stringify(manifest)).digest("hex"), sourceManifest: "sources/manifest.json" });
report.stages = stages.map((stage) => ({ id: stage.id, title: stage.title, command: `${stage.binary === process.execPath ? "node" : "npm"} ${stage.args.join(" ")}`, status: "Not run", durationMs: 0 }));
mkdirSync(join(directory, "logs"), { recursive: true });
writeReport(directory, report);
const env = { ...process.env, BN_CRM_E2E_ARTIFACTS: join(directory, "artifacts"), BN_CRM_SCENARIO_REPORT_DIR: directory, NEXT_TELEMETRY_DISABLED: "1" };
console.log(`\nRunning CRM checks and all user scenarios.\nReports: ${directory}\n`);
try {
  for (const stage of stages) {
    if (interrupted) break;
    if (stage.id === "browser" && report.stages.find((item) => item.id === "build").status !== "Passed") {
      report.stages.find((item) => item.id === "browser").error = "Browser scenarios were not run because the fresh production build failed.";
      break;
    }
    const slot = report.stages.findIndex((item) => item.id === stage.id);
    report.stages[slot].status = "Running";
    writeReport(directory, report);
    const result = await execute(stage, env);
    // The Playwright reporter writes live scenario progress into the same report.
    if (stage.id === "browser") report = readReport(directory);
    report.stages[slot] = result;
    writeReport(directory, report);
  }
} catch (error) {
  report = readReport(directory);
  report.errors.push(clean(error.stack || error.message));
} finally {
  const changed = manifest.filter(file => { try { return hashFile(file.path) !== file.sha256; } catch { return true; } }).map(file => file.path);
  if (changed.length) report.errors.push(`Executable test sources changed during this run; rerun before relying on these results: ${changed.join(", ")}`);
  finishReport(report, interrupted ? "interrupted" : "finished");
  writeReport(directory, report);
  const latest = join(root, "reports/user-journeys/latest.json"), temporary = `${latest}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify({ runId, status: report.status, html: resolve(directory, "report.html"), json: resolve(directory, "report.json"), summary: report.summary }, null, 2));
  renameSync(temporary, latest);
  console.log(`\n${report.status}: ${report.summary.scenarios.Passed || 0}/${report.summary.scenarioRuns} scenario runs passed.\nHTML: ${join(directory, "report.html")}\nJSON: ${join(directory, "report.json")}\n`);
  process.exitCode = interrupted ? 130 : report.status === "Passed" ? 0 : 1;
}

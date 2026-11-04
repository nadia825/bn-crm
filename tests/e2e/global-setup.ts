import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export default async function snapshotExport() {
  const source = fileURLToPath(new URL("../../out/", import.meta.url));
  await readFile(join(source, "index.html")).catch(() => {
    throw new Error("Missing static export. Run npm run test:e2e to build it first.");
  });
  const directory = await mkdtemp(join(tmpdir(), "bn-crm-e2e-build-"));
  try {
    await cp(source, directory, { recursive: true });
    // Workers inherit this path. A later local build cannot replace their assets.
    process.env.BN_CRM_E2E_EXPORT_ROOT = directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return async () => {
    await rm(directory, { recursive: true, force: true });
    delete process.env.BN_CRM_E2E_EXPORT_ROOT;
  };
}

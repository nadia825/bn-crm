import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
const destination = process.argv[2] || "/tmp/bn-crm-backup.sqlite";
if (existsSync(destination))
  throw new Error("Backup destination already exists. Choose a new filename.");
const database = new DatabaseSync(
  process.env.BN_CRM_DB_PATH || ".local-data/bn-crm.sqlite",
);
try {
  database.prepare("VACUUM INTO ?").run(destination);
  console.log(`Consistent SQLite backup written to ${destination}`);
} finally {
  database.close();
}

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { seed, type Store } from "../src/lib/data.ts";
import { validateStore } from "./schema.ts";
const tables = {
  users: "users",
  retailerRecords: "retailers",
  accounts: "accounts",
  cases: "cases",
  tasks: "tasks",
  barrels: "barrels",
  billing: "billing",
  activities: "activities",
  views: "views",
  audit: "audit",
} as const;
export class CrmDatabase {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
    const version = (
      this.db.prepare("PRAGMA user_version").get() as {
        user_version: number;
      }
    ).user_version;
    if (version > 1)
      throw new Error("This database requires a newer CRM backend.");
    if (version === 0)
      this.transaction(() =>
        this.db.exec(
          readFileSync(
            new URL("./migrations/001-initial.sql", import.meta.url),
            "utf8",
          ),
        ),
      );
    if (
      !this.db.prepare("SELECT value FROM metadata WHERE key='revision'").get()
    )
      this.transaction(() => this.save(seed(), 1));
  }
  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  get revision(): number {
    return JSON.parse(
      (
        this.db
          .prepare("SELECT value FROM metadata WHERE key='revision'")
          .get() as {
          value: string;
        }
      ).value,
    );
  }
  user(id: string): Store["users"][number] | undefined {
    const row = this.db.prepare("SELECT payload FROM users WHERE id=?").get(id) as { payload: string } | undefined;
    return row ? JSON.parse(row.payload) : undefined;
  }
  read(): Store {
    const meta = Object.fromEntries(
      (
        this.db
          .prepare("SELECT key,value FROM metadata WHERE key!='revision'")
          .all() as {
          key: string;
          value: string;
        }[]
      ).map((r) => [r.key, JSON.parse(r.value)]),
    );
    for (const [name, table] of Object.entries(tables))
      meta[name] = (
        this.db
          .prepare(`SELECT payload FROM ${table} ORDER BY position`)
          .all() as {
          payload: string;
        }[]
      ).map((r) => JSON.parse(r.payload));
    meta.retailers = (meta.retailerRecords as Store["retailerRecords"]).map(
      (r) => r.name,
    );
    return meta as Store;
  }
  save(store: Store, revision: number) {
    validateStore(store);
    // Keep foreign keys enforced at commit while related records move together.
    this.db.exec("PRAGMA defer_foreign_keys=ON");
    const previous = new Map<string, Map<string, { position: number; payload: string }>>();
    for (const table of Object.values(tables)) {
      const rows = this.db.prepare(`SELECT id,position,payload FROM ${table}`).all() as
        { id: string; position: number; payload: string }[];
      previous.set(table, new Map(rows.map((row) => [row.id, row])));
    }
    const desiredLinks = new Set(store.accounts.flatMap((a) =>
      a.retailers.map((r) => JSON.stringify([a.id, r]))));
    const existingLinks = this.db.prepare("SELECT account_id,retailer_name FROM account_retailers").all() as
      { account_id: string; retailer_name: string }[];
    const removeLink = this.db.prepare("DELETE FROM account_retailers WHERE account_id=? AND retailer_name=?");
    for (const row of existingLinks)
      if (!desiredLinks.has(JSON.stringify([row.account_id, row.retailer_name])))
        removeLink.run(row.account_id, row.retailer_name);
    for (const [name, table] of Object.entries(tables).reverse()) {
      const desired = new Set(store[name as keyof typeof tables].map((r) => r.id));
      const remove = this.db.prepare(`DELETE FROM ${table} WHERE id=?`);
      for (const id of previous.get(table)!.keys())
        if (!desired.has(id)) remove.run(id);
    }
    const meta = this.db.prepare(
      "INSERT INTO metadata(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE value!=excluded.value",
    );
    for (const key of [
      "version",
      "workspace",
      "settings",
      "notificationsRead",
      "configuration",
      "bnxDirectory",
    ] as const)
      meta.run(key, JSON.stringify(store[key]));
    meta.run("revision", JSON.stringify(revision));
    for (const [name, table] of Object.entries(tables)) {
      const rows = store[name as keyof typeof tables];
      rows.forEach((row: any, position: number) => {
        const payload = JSON.stringify(row);
        const old = previous.get(table)!.get(row.id);
        if (old?.payload === payload) {
          if (old.position !== position)
            this.db.prepare(`UPDATE ${table} SET position=? WHERE id=?`).run(position, row.id);
          return;
        }
        const columns = ["id", "position", "payload"],
          values: (string | number | null)[] = [row.id, position, payload];
        const extra: Record<string, any> =
          name === "accounts"
            ? {
                type: row.type,
                bnx_id: row.bnxId || null,
                bnx_verified: row.bnxVerified ? 1 : 0,
              }
            : name === "retailerRecords"
              ? { name: row.name }
              : name === "tasks"
                ? { account_id: row.accountId, case_id: row.caseId || null }
                : name === "cases" ||
                    name === "billing" ||
                    name === "activities"
                  ? { account_id: row.accountId }
                  : name === "barrels"
                    ? {
                        affiliate_id: row.affiliateId,
                        supplier_id: row.supplierId,
                        retailer_name: row.retailer,
                      }
                    : name === "views"
                      ? { owner_id: row.ownerId }
                      : {};
        columns.push(...Object.keys(extra));
        values.push(...Object.values(extra));
        this.db
          .prepare(
            `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${columns.slice(1).map((c) => `${c}=excluded.${c}`).join(",")}` ,
          )
          .run(...values);
      });
    }
    const link = this.db.prepare(
      "INSERT OR IGNORE INTO account_retailers(account_id,retailer_name) VALUES (?,?)",
    );
    store.accounts.forEach((a) =>
      a.retailers.forEach((r) => link.run(a.id, r)),
    );
  }
  close() {
    this.db.close();
  }
}

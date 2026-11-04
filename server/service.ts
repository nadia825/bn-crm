import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { seed, type Store } from "../src/lib/data.ts";
import { can, visibleStore } from "../src/lib/access.ts";
import { applyMutation, migrateStore } from "../src/lib/mutations.ts";
import { applyPatch, validatePatch, PatchConflictError, patchIsEmpty } from "../src/lib/patch.ts";
import type { DemoUser } from "../src/lib/model.ts";
import { CrmDatabase } from "./database.ts";
import { validateStore } from "./schema.ts";
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
function event(actor: DemoUser, action: string) {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorId: actor.id,
    actor: actor.name,
    roles: [...actor.roles],
    action,
    recordId: "organization",
    detail:
      action === "demo.import"
        ? "Imported fictional browser data into the local database"
        : "Restored fictional demo records",
    outcome: "Allowed" as const,
  };
}
async function body(req: IncomingMessage) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new HttpError(415, "Use application/json.");
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024)
      throw new HttpError(413, "Change request is too large.");
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
export function createCrmServer(database: CrmDatabase) {
  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const reply = (status: number, data: unknown) => {
        res.writeHead(status, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(JSON.stringify(data));
      };
      try {
        const url = new URL(req.url || "/", "http://localhost");
        if (req.method === "GET" && url.pathname === "/api/health") {
          database.db.prepare("SELECT 1").get();
          reply(200, { status: "ok", storage: "sqlite", mock: true });
          return;
        }
        // The identity picker is intentionally public in this fictional, local demo.
        if (req.method === "GET" && url.pathname === "/api/demo-users") {
          reply(200, { users: database.read().users });
          return;
        }
        const actorId = req.headers["x-demo-user"];
        if (typeof actorId !== "string")
          throw new HttpError(401, "Choose a demo identity first.");
        let raw: Store;
        let actor = database.user(actorId);
        if (!actor?.active)
          throw new HttpError(
            401,
            "This demo identity is unavailable or inactive.",
          );
        const snapshot = () => {
          const current = database.read();
          const user = current.users.find((u) => u.id === actorId && u.active);
          return {
            revision: database.revision,
            data: user ? visibleStore(current, user) : null,
            identityUnavailable: !user,
          };
        };
        if (req.method === "GET" && url.pathname === "/api/state") {
          reply(
            200,
            url.searchParams.get("since") === String(database.revision)
              ? { revision: database.revision, unchanged: true }
              : snapshot(),
          );
          return;
        }
        if (
          !["PATCH", "POST"].includes(req.method || "") ||
          !["/api/state", "/api/reset", "/api/import"].includes(url.pathname)
        )
          throw new HttpError(404, "Unknown API endpoint.");
        if (
          (url.pathname === "/api/state" && req.method !== "PATCH") ||
          (url.pathname !== "/api/state" && req.method !== "POST")
        )
          throw new HttpError(405, "Method not allowed.");
        if (req.headers.origin) {
          let origin: URL;
          try {
            origin = new URL(req.headers.origin);
          } catch {
            throw new HttpError(403, "Invalid request origin.");
          }
          if (origin.host !== req.headers.host)
            throw new HttpError(403, "Use the CRM's own origin for changes.");
        }
        const input = await body(req);
        let denial: string | undefined;
        database.transaction(() => {
          if (
            !Number.isSafeInteger(input.revision) || input.revision < 1 ||
            (url.pathname === "/api/state"
              ? input.revision > database.revision
              : input.revision !== database.revision)
          )
            throw new HttpError(
              409,
              "The shared data changed in another session. Your pending changes were not saved. Review the latest records and try again.",
            );
          raw = database.read();
          actor = raw.users.find((u) => u.id === actorId && u.active);
          if (!actor)
            throw new HttpError(
              401,
              "This demo identity is unavailable or inactive.",
            );
          let next: Store;
          if (url.pathname === "/api/state") {
            validatePatch(input.patch);
            if (patchIsEmpty(input.patch)) return;
            // Validate complete shapes before comparing baselines so malformed records
            // remain validation errors rather than looking like concurrent edits.
            validateStore(applyPatch(raw, input.patch, false));
            const proposed = applyPatch(visibleStore(raw, actor), input.patch);
            const result = applyMutation(raw, proposed, actor);
            next = result.store;
            denial = result.error;
          } else {
            if (!can(actor, "configuration.edit", undefined, raw))
              throw new HttpError(
                403,
                "Only a System Admin can import or reset shared demo data.",
              );
            if (url.pathname === "/api/import") {
              if (database.revision !== 1)
                throw new HttpError(
                  409,
                  "Browser data can only be imported into a fresh database before its first change.",
                );
              next = migrateStore(input.data);
              validateStore(next);
              next.audit = [event(actor, "demo.import"), ...raw.audit];
            } else {
              next = seed();
              next.audit = [event(actor, "demo.reset"), ...raw.audit];
            }
          }
          validateStore(next);
          database.save(next, database.revision + 1);
        });
        reply(denial ? 403 : 200, {
          ...snapshot(),
          ...(denial ? { error: denial } : {}),
        });
      } catch (error) {
        if (error instanceof PatchConflictError)
          reply(409, { error: error.message });
        else if (error instanceof HttpError)
          reply(error.status, { error: error.message });
        else if (error instanceof Error && !("code" in error))
          reply(422, { error: error.message });
        else {
          console.error("CRM request failed", error);
          reply(500, {
            error:
              "The database could not save this change. Nothing was partially saved.",
          });
        }
      }
    },
  );
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

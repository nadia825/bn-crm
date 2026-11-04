import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CrmDatabase } from "../server/database.ts";
import { createCrmServer } from "../server/service.ts";
import { diffStore } from "../src/lib/patch.ts";
import { seed } from "../src/lib/data.ts";
async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "bn-crm-api-"));
  const path = join(dir, "test.sqlite");
  const db = new CrmDatabase(path),
    server = createCrmServer(db);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const req = async (
    path,
    actor = "olivia",
    method = "GET",
    body,
    headers = {},
  ) => {
    const response = await fetch(url + "/api/" + path, {
      method,
      headers: {
        "X-Demo-User": actor,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, ...(await response.json()) };
  };
  const change = async (actor, mutate, snapshot) => {
    const before = snapshot || (await req("state", actor)),
      next = structuredClone(before.data);
    mutate(next);
    return req("state", actor, "PATCH", {
      revision: before.revision,
      patch: diffStore(before.data, next),
    });
  };
  return { db, path, req, change };
}
test("API seeds linked records, projects role scopes and exposes health", async (t) => {
  const { req } = await fixture(t);
  assert.equal((await req("health")).status, "ok");
  const admin = await req("state");
  assert.equal(admin.data.accounts.length, 67);
  assert.equal(admin.revision, 1);
  const viewer = await req("state", "riley");
  assert.equal(viewer.data.accounts.length, 4);
  assert.equal(viewer.data.billing.length, 0);
  assert.equal(viewer.data.audit.length, 0);
  assert.equal((await req("state", "unknown")).status, 401);
  assert.equal((await req("state?since=1")).unchanged, true);
});
test("saves persist after reopening SQLite; foreign keys remain intact", async (t) => {
  const { req, change, db, path } = await fixture(t);
  const result = await change(
    "olivia",
    (d) => (d.accounts[0].description = "Persistent test note"),
  );
  assert.equal(result.status, 200);
  const second = new CrmDatabase(path);
  assert.equal(second.read().accounts[0].description, "Persistent test note");
  assert.equal(second.revision, 2);
  assert.equal(second.db.prepare("PRAGMA foreign_key_check").all().length, 0);
  second.close();
  assert.equal((await req("state")).data.audit[0].actorId, "olivia");
  assert.throws(() =>
    db.db
      .prepare("INSERT INTO account_retailers VALUES ('missing','missing')")
      .run(),
  );
});
test("stale browser saves return conflict without overwriting newer work", async (t) => {
  const { req, change } = await fixture(t);
  const before = await req("state");
  assert.equal(
    (
      await change(
        "olivia",
        (d) => (d.accounts[0].description = "First browser"),
        before,
      )
    ).status,
    200,
  );
  const conflict = await change(
    "olivia",
    (d) => (d.accounts[0].description = "Stale browser"),
    before,
  );
  assert.equal(conflict.status, 409);
  const fresh = await req("state");
  assert.equal(fresh.data.accounts[0].description, "First browser");
  assert.equal(fresh.revision, 2);
});
test("viewer cannot write; API records denial using server identity", async (t) => {
  const { req, change } = await fixture(t);
  const result = await change("riley", (d) => {
    d.accounts[0].description = "Forged write";
  });
  assert.equal(result.status, 403);
  const admin = await req("state");
  assert.notEqual(
    admin.data.accounts.find((a) => a.id === "BR-001").description,
    "Forged write",
  );
  assert.equal(admin.data.audit[0].actorId, "riley");
  assert.equal(admin.data.audit[0].outcome, "Denied");
});
test("six required checks, verification, submission and Operations approval are enforced", async (t) => {
  const { req, change } = await fixture(t);
  const id = "BR-001",
    account = (d) => d.accounts.find((a) => a.id === id);
  let r = await change("olivia", (d) =>
    Object.assign(account(d), {
      checks: Array(6).fill(false),
      verification: "Pending",
      approval: "Not submitted",
      status: "Onboarding",
      stage: "Onboarding",
    }),
  );
  assert.equal(r.status, 200);
  assert.equal(
    (
      await change("olivia", (d) => {
        account(d).verification = "Verified";
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await change("olivia", (d) => {
        account(d).checks = Array(6).fill(true);
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await change("marcus", (d) => {
        account(d).approval = "Pending approval";
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await change("marcus", (d) => {
        account(d).verification = "Verified";
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await change("marcus", (d) => {
        account(d).approval = "Pending approval";
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await change("james", (d) =>
        Object.assign(account(d), {
          approval: "Approved",
          status: "Active",
          stage: "Active",
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await change("marcus", (d) =>
        Object.assign(account(d), {
          approval: "Approved",
          status: "Active",
          stage: "Active",
        }),
      )
    ).status,
    200,
  );
  assert.equal(account((await req("state")).data).status, "Active");
});
test("malformed payloads, forged roles, audit entries and invalid relationships are rejected atomically", async (t) => {
  const { req, change } = await fixture(t);
  let before = await req("state");
  const malformed = await req("state", "olivia", "PATCH", {
    revision: 1,
    patch: {
      collections: {
        accounts: [{ id: "BR-001", before: null, after: { id: "BR-001" } }],
      },
      metadata: {},
    },
  });
  assert.equal(malformed.status, 422);
  assert.equal((await req("state")).revision, 1);
  assert.equal(
    (
      await change("riley", (d) => {
        d.users.find((u) => u.id === "riley").roles = ["System Admin"];
      })
    ).status,
    403,
  );
  before = await req("state");
  assert.equal(
    (
      await req("state", "olivia", "PATCH", {
        revision: before.revision,
        patch: { collections: { audit: [] }, metadata: {} },
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await change("olivia", (d) => {
        d.tasks[0].accountId = "missing";
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await change("olivia", (d) => {
        d.cases[0].status = "Closed";
        d.cases[0].resolution = "";
      })
    ).status,
    422,
  );
  assert.equal((await req("state")).revision, before.revision);
  assert.equal((await req("state", "riley")).data.billing.length, 0);
});
test("verified BNX IDs cannot be relinked or duplicated", async (t) => {
  const { change } = await fixture(t);
  assert.equal(
    (
      await change("olivia", (d) => {
        const [a, b] = d.accounts.filter(
          (a) => a.bnxVerified && a.type === "Corporate Brand",
        );
        b.bnxId = a.bnxId;
      })
    ).status,
    403,
  );
});
test("deactivated identities lose API access, imports require pristine database, reset preserves audit", async (t) => {
  const { req, change } = await fixture(t);
  assert.equal(
    (await req("import", "riley", "POST", { revision: 1, data: seed() }))
      .status,
    403,
  );
  const data = seed();
  data.workspace = "Imported browser demo";
  assert.equal(
    (await req("import", "olivia", "POST", { revision: 1, data })).status,
    200,
  );
  assert.equal((await req("state")).data.workspace, "Imported browser demo");
  assert.equal(
    (await req("import", "olivia", "POST", { revision: 2, data })).status,
    409,
  );
  assert.equal(
    (
      await change("olivia", (d) => {
        d.users.find((u) => u.id === "riley").active = false;
      })
    ).status,
    200,
  );
  assert.equal((await req("state", "riley")).status, 401);
  const before = await req("state");
  assert.equal(
    (await req("reset", "taylor", "POST", { revision: before.revision }))
      .status,
    403,
  );
  const reset = await req("reset", "olivia", "POST", {
    revision: before.revision,
  });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.workspace, seed().workspace);
  assert.ok(reset.data.audit.some((e) => e.action === "demo.import"));
  assert.ok(reset.data.audit.some((e) => e.action === "demo.reset"));
});
test("same-origin checks reject cross-site writes", async (t) => {
  const { req } = await fixture(t);
  const result = await req(
    "reset",
    "olivia",
    "POST",
    { revision: 1 },
    { Origin: "https://other.invalid" },
  );
  assert.equal(result.status, 403);
  assert.equal((await req("state")).revision, 1);
});
test("editing a redacted account preserves hidden financial fields and records", async (t) => {
  const { req, change } = await fixture(t);
  assert.equal(
    (
      await change("olivia", (d) => {
        d.configuration.customFields.push({
          id: "contract-value",
          label: "Contract value",
          type: "Text",
          options: [],
          scope: "All accounts",
          sensitive: true,
        });
        d.accounts.find(
          (a) => a.manager === "Sofia Chen" && a.type === "Corporate Brand",
        ).customFields["contract-value"] = "1234";
      })
    ).status,
    200,
  );
  const admin = await req("state");
  const chosen = admin.data.accounts.find(
    (a) => a.manager === "Sofia Chen" && a.type === "Corporate Brand",
  );
  assert.equal(
    (await req("state", "sofia")).data.accounts.find((a) => a.id === chosen.id)
      .customFields["contract-value"],
    undefined,
  );
  const result = await change("sofia", (d) => {
    d.accounts.find((a) => a.id === chosen.id).description = "Scoped update";
  });
  assert.equal(result.status, 200);
  const next = await req("state");
  assert.equal(next.data.accounts.length, 67);
  assert.equal(
    next.data.accounts.find((a) => a.id === chosen.id).customFields[
      "contract-value"
    ],
    "1234",
  );
});
test("new client records, cases, tasks, activities and invoices remain connected", async (t) => {
  const { req, change } = await fixture(t);
  const assertSaved = (r) => assert.equal(r.status, 200, r.error);
  assertSaved(
    await change("olivia", (d) => {
      const brand = structuredClone(d.accounts[0]);
      Object.assign(brand, {
        id: "BR-QA-NEW",
        bnxId: "",
        bnxVerified: false,
        name: "QA Local Brand",
        email: "qa@local.example",
        checks: Array(6).fill(false),
        verification: "Pending",
        approval: "Not submitted",
        status: "Onboarding",
        stage: "Onboarding",
      });
      d.accounts.push(brand);
    }),
  );
  assertSaved(
    await change("olivia", (d) => {
      const item = structuredClone(d.cases[0]);
      Object.assign(item, {
        id: "CASE-QA",
        accountId: "BR-QA-NEW",
        title: "QA launch support",
        status: "Open",
        resolution: "",
      });
      d.cases.push(item);
    }),
  );
  assertSaved(
    await change("olivia", (d) => {
      const item = structuredClone(d.tasks[0]);
      Object.assign(item, {
        id: "TASK-QA",
        accountId: "BR-QA-NEW",
        caseId: "CASE-QA",
        title: "QA launch task",
      });
      d.tasks.push(item);
    }),
  );
  assertSaved(
    await change("olivia", (d) => {
      d.activities.push({
        ...d.activities[0],
        id: "ACT-QA",
        accountId: "BR-QA-NEW",
      });
      d.billing.push({ ...d.billing[0], id: "INV-QA", accountId: "BR-QA-NEW" });
    }),
  );
  const final = (await req("state")).data;
  assert.equal(final.tasks.find((t) => t.id === "TASK-QA").caseId, "CASE-QA");
  assert.equal(
    final.cases.find((c) => c.id === "CASE-QA").accountId,
    "BR-QA-NEW",
  );
  assert.ok(
    final.audit.some(
      (e) => e.action === "accounts.created" && e.recordId === "BR-QA-NEW",
    ),
  );
});

test("unrelated stale edits merge, same-record edits conflict, and reset stays revision guarded", async (t) => {
  const { req, change } = await fixture(t);
  const before = await req("state");
  assert.equal((await change("olivia", (d) => { d.accounts[0].description = "Browser A"; }, before)).status, 200);
  const unrelated = await change("olivia", (d) => { d.accounts[1].description = "Browser B"; }, before);
  assert.equal(unrelated.status, 200, unrelated.error);
  assert.equal(unrelated.revision, 3);
  assert.equal(unrelated.data.accounts[0].description, "Browser A");
  assert.equal(unrelated.data.accounts[1].description, "Browser B");
  assert.equal((await change("olivia", (d) => { d.accounts[0].description = "Stale replacement"; }, before)).status, 409);
  assert.equal((await req("reset", "olivia", "POST", { revision: before.revision })).status, 409);
  assert.equal((await req("state")).revision, 3);
});

test("incremental save leaves unchanged rows untouched and supports linked case moves", async (t) => {
  const { db, change, req } = await fixture(t);
  db.db.exec(`CREATE TEMP TABLE touched (name TEXT, id TEXT, action TEXT);
    CREATE TEMP TRIGGER watch_accounts AFTER UPDATE OF payload ON accounts BEGIN INSERT INTO touched VALUES ('accounts',new.id,'update'); END;
    CREATE TEMP TRIGGER watch_tasks AFTER UPDATE OF payload ON tasks BEGIN INSERT INTO touched VALUES ('tasks',new.id,'update'); END;
    CREATE TEMP TRIGGER watch_deletions AFTER DELETE ON accounts BEGIN INSERT INTO touched VALUES ('accounts',old.id,'delete'); END;`);
  const result = await change("olivia", (d) => { d.accounts[0].description = "One row only"; });
  assert.equal(result.status, 200, result.error);
  assert.deepEqual(db.db.prepare("SELECT * FROM touched").all().map((r) => ({...r})), [{ name: "accounts", id: result.data.accounts[0].id, action: "update" }]);
  const before = await req("state");
  const linked = before.data.tasks.find((task) => task.caseId);
  assert.ok(linked);
  const moved = await change("olivia", (d) => {
    const support = d.cases.find((c) => c.id === linked.caseId);
    support.accountId = d.accounts.find((a) => a.id !== support.accountId && a.type === "Corporate Brand").id;
    d.tasks.filter((task) => task.caseId === support.id).forEach((task) => { task.caseId = undefined; });
  }, before);
  assert.equal(moved.status, 200, moved.error);
  assert.equal(db.db.prepare("PRAGMA foreign_key_check").all().length, 0);
});

test("bulk saves are atomic when any case lacks a resolution", async (t) => {
  const { req, change } = await fixture(t);
  const before = await req("state");
  const selected = before.data.cases.filter((c) => !["Closed", "Resolved"].includes(c.status)).slice(0, 2);
  const denied = await change("marcus", (d) => {
    selected.forEach((c, index) => Object.assign(d.cases.find((r) => r.id === c.id), { status: "Resolved", resolution: index ? "" : "Resolved by team" }));
  });
  assert.equal(denied.status, 422);
  assert.equal((await req("state")).revision, before.revision);
  const saved = await change("marcus", (d) => {
    selected.forEach((c) => Object.assign(d.cases.find((r) => r.id === c.id), { status: "Resolved", resolution: "Resolved by team" }));
  });
  assert.equal(saved.status, 200, saved.error);
  assert.ok(selected.every((c) => saved.data.cases.find((r) => r.id === c.id).status === "Resolved"));
});

test("combined work filters persist as personal views without widening another role's scope", async (t) => {
  const { req, change, path } = await fixture(t);
  const snapshot = {query:"launch",status:"In Progress",assignee:"Avery Lane",priority:"High",category:"Brand Operations",accountId:"BR-003",due:"custom",dueFrom:"2026-11-01",dueTo:"2026-11-08",linkedCase:"CASE-201",mine:false,view:"list",sort:"due",asc:true,columns:["ID","Summary","Status"]};
  const saved=await change("marcus",d=>{d.views.push({id:"VIEW-COMBINED",name:"Launch follow-ups",module:"work-operations-tasks",ownerId:"marcus",visibility:"Personal",snapshot});});
  assert.equal(saved.status,200,saved.error);
  const reopened=new CrmDatabase(path);
  assert.deepEqual(reopened.read().views.find(v=>v.id==="VIEW-COMBINED").snapshot,snapshot);
  reopened.close();
  assert.deepEqual((await req("state","marcus")).data.views.find(v=>v.id==="VIEW-COMBINED").snapshot,snapshot);
  assert.equal((await req("state","avery")).data.views.some(v=>v.id==="VIEW-COMBINED"),false);
});

test("rich mock activities persist in SQLite and enforce assignments and related accounts", async (t) => {
  const { req, change, path } = await fixture(t);
  const initial = await req("state", "marcus");
  const supportCase = initial.data.cases[0];
  const work = initial.data.tasks.find((x) => x.accountId === supportCase.accountId);
  const activity = {
    id: "QA-RICH-ACTIVITY", title: "QA — Mock launch coordination", accountId: supportCase.accountId,
    owner: "Marcus Reed", participantIds: ["avery", "sofia"], kind: "Meeting", status: "Scheduled",
    due: "2026-11-04T14:00", endAt: "2026-11-04T14:45", timeZone: "Africa/Tunis", notes: "Mock only",
    location: "Online", meetingUrl: "https://meeting.example/launch", priority: "High", reminder: "15 minutes before",
    caseId: supportCase.id, agenda: "Review label", outcome: "Pending artwork", nextAction: "Request correction",
  };
  const saved = await change("marcus", (d) => d.activities.push(activity));
  assert.equal(saved.status, 200);
  const reopened = new CrmDatabase(path);
  assert.deepEqual(reopened.read().activities.find((a) => a.id === activity.id), activity);
  reopened.close();
  const participant = await req("state", "avery");
  assert.ok(participant.data.activities.some((a) => a.id === activity.id));
  const denied = await change("avery", (d) => { d.activities.find((a) => a.id === activity.id).outcome = "Unauthorized"; });
  assert.equal(denied.status, 403);
  for (const patch of [
    { endAt: "2026-11-04T13:00" }, { participantIds: ["avery", "avery"] },
    { participantIds: ["marcus"] }, { participantIds: ["unknown"] }, { meetingUrl: "javascript:alert(1)" },
    { timeZone: "Invalid/Zone" }, { taskId: initial.data.tasks.find((x) => x.accountId !== supportCase.accountId).id },
  ]) {
    const invalid = await change("marcus", (d) => Object.assign(d.activities.find((a) => a.id === activity.id), patch));
    assert.equal(invalid.status, 422, JSON.stringify(patch));
  }
  if (work) {
    assert.equal((await change("marcus", (d) => { d.tasks.find((x) => x.id === work.id).caseId = supportCase.id; })).status, 200);
    const linked = await change("marcus", (d) => { d.activities.find((a) => a.id === activity.id).taskId = work.id; });
    assert.equal(linked.status, 200);
  }
  const after = await req("state", "marcus");
  assert.equal(after.data.activities.find((a) => a.id === activity.id).outcome, "Pending artwork");
});

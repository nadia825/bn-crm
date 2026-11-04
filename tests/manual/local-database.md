# Local Compose acceptance scripts

Use fictional records and a disposable test environment for reset/import cases. Record the actual result and PASS/FAIL for each expected result. Run the existing business cases against the same local URL. Unlike the published browser-only demo, two local browsers share one database; they retain separate navigation and demo identity preferences.

## DB-01 — Shared account follow-up
1. Open localhost:3000 in two different browsers. Select Olivia in one and Sofia in the other.
2. As Olivia, edit a brand owned by Sofia and change its description to a recognizable test sentence. Save.
3. Focus the second browser and open that brand.
Expected: the same account ID and updated description appear; Sofia's other record restrictions still apply. The save confirmation follows an accepted API save.

## DB-02 — Work linked across workspaces
1. Create a task on a brand as Olivia, recording its ID.
2. Open Operations → Work Board, find that ID and change its status.
3. Open the brand's linked tasks in the other browser.
Expected: the same task updates; no duplicate record is created. Reload either browser and confirm the result remains.

## DB-03 — Restart persistence
1. Add a dated fictional account note. Record the account ID and text.
2. Run `docker compose restart` and reload the UI.
3. Run `docker compose down`, followed by `docker compose up -d --wait`.
Expected: the note, account, task statuses and audit entries survive both operations. Do not add `-v`.

## DB-04 — Stale save
1. Open the same edit form in two browsers as Olivia, before either saves.
2. Save a description change in browser A.
3. Save a different description from the already-open form in browser B.
Expected: if B's base snapshot has not refreshed, it receives a shared-data conflict and rolls back pending edits. If background refresh already happened, the form save is still checked against the version it was opened with. A's saved edit must never be silently overwritten. Review the latest record and reopen the form before retrying.

## DB-05 — Backend business gates
1. On an incomplete onboarding brand, try verification/submission: controls should block the action.
2. Complete all six checks using authorized roles, verify, then submit.
3. As the Account Manager, confirm approval is unavailable. As Marcus, approve.
Expected: verification cannot bypass checks, submission cannot bypass verification, and approval requires Operations Manager or System Admin. The brand is Active in both workspaces after approval. Automated API tests also exercise direct bypass attempts.

## DB-06 — API outage and recovery
1. Run `docker compose stop api` while leaving the UI open.
2. Attempt to save an account note.
3. Run `docker compose up -d --wait api`, then use Reconnect or refocus the UI.
Expected: no false success message; pending edits roll back and an error appears. The app never writes shared records into browser storage as a fallback. After reconnection, review server data before retrying; a network timeout could have occurred after a commit.

## DB-07 — Backup
1. Follow README backup commands with a fresh output filename.
2. Inspect the resulting backup using a SQLite tool: run `PRAGMA integrity_check` and `PRAGMA foreign_key_check`.
Expected: integrity returns `ok`, no foreign-key errors occur, and the recognizable DB-03 note is present.

## DB-08 — Legacy import (fresh disposable database only)
1. Start with a fresh database at revision 1 and existing fictional `bn-crm-v0` data in that browser.
2. As Olivia, open Settings → Import previous browser data and confirm.
3. Check an old account edit, linked records and audit history. Try importing again.
Expected: legacy edits become shared, the browser copy remains preserved, an import audit entry exists, and a second import is blocked. Invalid legacy relationships produce a clear error without partial import.

## DB-09 — Shared reset (disposable database only)
1. Make a fictional edit and confirm it in a second browser.
2. As Olivia, read and confirm Settings → Reset demo data.
Expected: both browsers show original fictional business records after refresh. Audit history includes previous accepted actions and the reset. Other roles cannot reset the shared database.

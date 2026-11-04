# Optimization acceptance checks

Use fictional records. Automated API tests use temporary databases and cover actual bulk mutations; on an existing shared database, preview selections without applying changes unless the records are disposable.

1. Open each workspace dashboard as Admin, Operations Manager, Operations Member, Account Manager and Viewer. Check Needs your attention against each identity's record scope. Filter Overdue, Blocked, Approvals and My work; open a row and verify the intended record or brand review is shown.
2. Create a request from an account profile. The account is prefilled, the owner defaults to the identity, and the due date is today. Expand/collapse More options and verify its category/status/case values persist. Check the footer remains visible while scrolling at desktop and narrow window sizes. Cancel without changing shared records.
3. On Work board and Tasks, select individual records and all visible records. Verify the bulk toolbar appears, status/priority options work, and selection clears when changing filters. Only Admin/Operations Manager should see delegation. In Support cases, selecting Resolved/Closed shows the shared resolution field.
4. In an authorized account directory, select the current page, verify the owner toolbar, then change page/filter and confirm selection clears. A Viewer should have no editing checkboxes.
5. With disposable test records in two sessions, open a form in A and edit a different record in B. A should save. Repeat with the same record: A should be blocked from overwriting B. Reset/import must still reject a stale global revision.
6. Reload after a save and check the shared records remain. Stop/restart the local stack without deleting its volume and verify persistence. Automated tests assert unchanged payload rows are not rewritten and foreign keys stay valid.
7. Load the company dashboard and then open Reports/Finance to verify lazy-loaded screens display. Trigger a save and confirm connection status changes without resetting form inputs or the active view.

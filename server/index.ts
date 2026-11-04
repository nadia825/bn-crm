import { CrmDatabase } from "./database.ts";
import { createCrmServer } from "./service.ts";
const database = new CrmDatabase(
  process.env.BN_CRM_DB_PATH || ".local-data/bn-crm.sqlite",
);
const server = createCrmServer(database);
server.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      "BN CRM local API ready (fictional demo identities; no authentication).",
    ),
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () =>
    server.close(() => {
      database.close();
      process.exit(0);
    }),
  );

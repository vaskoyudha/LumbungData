import { Hono } from "hono";

const health = new Hono();

health.get("/", async (c) => {
  const couchdbUrl = process.env["COUCHDB_URL"] ?? "http://localhost:5984";
  const user = process.env["COUCHDB_USER"] ?? "admin";
  const pass = process.env["COUCHDB_PASSWORD"] ?? "changeme";

  let couchdbOk = false;
  try {
    const res = await fetch(`${couchdbUrl}/_up`, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
      },
    });
    couchdbOk = res.ok;
  } catch (_err: unknown) {
    couchdbOk = false;
  }

  return c.json({ status: "ok", couchdb: couchdbOk });
});

export { health };

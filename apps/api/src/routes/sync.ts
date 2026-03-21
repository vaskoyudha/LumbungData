import { Hono } from "hono";
import type { Context } from "hono";

const sync = new Hono();

function getCouchAuth(): { url: string; headers: Record<string, string> } {
  const couchdbUrl = process.env["COUCHDB_URL"] ?? "http://localhost:5984";
  const user = process.env["COUCHDB_USER"] ?? "admin";
  const pass = process.env["COUCHDB_PASSWORD"] ?? "changeme";
  return {
    url: couchdbUrl,
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
    },
  };
}

const ALLOWED_DBS = new Set([
  "lumbung_soil",
  "lumbung_market",
  "lumbung_farmers",
  "lumbung_subsidies",
]);

async function proxyCouchDB(
  c: Context,
  db: string,
  couchPath: string
): Promise<Response> {
  if (!ALLOWED_DBS.has(db)) {
    return c.json({ error: "database not allowed" }, 403);
  }

  const { url, headers } = getCouchAuth();
  const targetUrl = new URL(couchPath, url);

  const reqUrl = new URL(c.req.url);
  targetUrl.search = reqUrl.search;

  const proxyHeaders: Record<string, string> = {
    ...headers,
    "Content-Type": c.req.header("content-type") ?? "application/json",
  };

  const method = c.req.method;
  let body: string | null = null;
  if (method !== "GET" && method !== "HEAD") {
    body = await c.req.text();
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      method,
      headers: proxyHeaders,
      body,
    });

    const responseBody = await res.text();
    return new Response(responseBody, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown proxy error";
    console.error(`[sync] proxy error: ${message}`);
    return c.json({ error: "couchdb proxy failed", detail: message }, 502);
  }
}

sync.all("/:db/*", async (c) => {
  const db = c.req.param("db");
  const subPath = c.req.path.replace(`/sync/${db}/`, "");
  return proxyCouchDB(c, db, `/${db}/${subPath}`);
});

sync.all("/:db", async (c) => {
  const db = c.req.param("db");
  return proxyCouchDB(c, db, `/${db}`);
});

export { sync };

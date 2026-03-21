import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health.js";
import { sync } from "./routes/sync.js";

const DATABASES = [
  "lumbung_soil",
  "lumbung_market",
  "lumbung_farmers",
  "lumbung_subsidies",
] as const;

async function initCouchDBDatabases(): Promise<void> {
  const couchdbUrl = process.env["COUCHDB_URL"] ?? "http://localhost:5984";
  const user = process.env["COUCHDB_USER"] ?? "admin";
  const pass = process.env["COUCHDB_PASSWORD"] ?? "changeme";
  const authHeader =
    "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");

  for (const db of DATABASES) {
    try {
      const res = await fetch(`${couchdbUrl}/${db}`, {
        method: "PUT",
        headers: { Authorization: authHeader },
      });
      if (res.status === 201) {
        console.error(`[init] Created database: ${db}`);
      } else if (res.status === 412) {
        console.error(`[init] Database already exists: ${db}`);
      } else {
        console.error(
          `[init] Unexpected response for ${db}: ${String(res.status)}`
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      console.error(`[init] Failed to create database ${db}: ${message}`);
    }
  }
}

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.route("/health", health);
app.route("/sync", sync);

const port = Number(process.env["API_PORT"] ?? "4000");

void initCouchDBDatabases().then(() => {
  console.error(`[init] CouchDB database initialization complete`);
});

serve(
  { fetch: app.fetch, port },
  (info) => {
    console.error(`[api] Lumbung API server running on port ${String(info.port)}`);
  }
);

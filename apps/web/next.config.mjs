import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "esbuild-wasm",
    "@repo/db",
    "pouchdb-core",
    "pouchdb-adapter-indexeddb",
    "pouchdb-replication",
    "pouchdb-find",
  ],
};

export default withNextIntl(nextConfig);

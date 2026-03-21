# Contributing to LumbungData

We welcome contributions from developers, agricultural technologists, and communities who care about food sovereignty in Indonesia.

## Prerequisites

| Tool | Version | Install |
| :--- | :--- | :--- |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9.15.0+ | `npm i -g pnpm` |
| Docker | 24+ | [docker.com](https://www.docker.com) |
| Git | 2.40+ | system package manager |

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/LumbungData.git
cd LumbungData

# 2. Install all workspace dependencies
pnpm install

# 3. Start Docker services (CouchDB + Besu)
docker compose up -d couchdb besu

# 4. Start the development server
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
```

## Running Tests

```bash
# Unit tests (Vitest)
pnpm test

# Unit tests in watch mode
pnpm test:watch

# E2E tests (Playwright — requires running dev server)
pnpm dev &
pnpm test:e2e

# Smart contract tests (Hardhat)
pnpm --filter @lumbung/blockchain test

# TypeScript type check
pnpm --filter @lumbung/web exec tsc --noEmit
```

## Workspace Structure

This is a Turborepo monorepo with pnpm workspaces:

| Package | Name | Description |
| :--- | :--- | :--- |
| `apps/web` | `@lumbung/web` | Next.js 16 PWA frontend |
| `apps/api` | `@lumbung/api` | Express API server |
| `apps/blockchain` | `@lumbung/blockchain` | Hardhat smart contracts |
| `packages/db` | `@repo/db` | PouchDB schemas + SyncOrchestrator |
| `packages/p2p` | `@repo/p2p` | WebRTC + QR signaling |
| `packages/blockchain` | `@repo/blockchain` | ethers.js TX queue |
| `packages/ui` | `@repo/ui` | Shared React components |
| `packages/shared` | `@repo/shared` | Types and utilities |
| `packages/config` | `@repo/config` | Shared ESLint + TS configs |

Run a command in a specific package:
```bash
pnpm --filter @lumbung/web build
pnpm --filter @repo/db test
```

## Code Style

**TypeScript (strict)**
- No `as any` — use proper typing or type guards
- No `@ts-ignore` — fix the underlying issue
- No empty `catch` blocks — log or rethrow
- No `console.log` in production code — use structured logs in API

**Bundle Budget**
- All web routes must be < 200KB gzipped initial JS
- `ethers.js` MUST be lazy-loaded: `const { ethers } = await import('ethers')`
- `PouchDB` MUST be lazy-loaded inside `useEffect` or async functions
- Check bundle: `pnpm --filter @lumbung/web build`

**Offline-First Mindset**
- Every new feature must degrade gracefully with no network
- Use `useOnlineStatus()` hook for connectivity checks
- Never block UI on network calls — queue and sync later

**i18n**
- All user-facing strings must use `useTranslations()` (next-intl)
- Add keys to both `apps/web/messages/id.json` and `apps/web/messages/en.json`
- Indonesian (`id`) is the default locale

## Branch Naming

| Type | Pattern | Example |
| :--- | :--- | :--- |
| Feature | `feat/description` | `feat/offline-soil-map` |
| Bug fix | `fix/description` | `fix/sync-timeout` |
| Documentation | `docs/description` | `docs/besu-setup` |
| Maintenance | `chore/description` | `chore/update-deps` |

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(db): add soil health conflict resolution
fix(p2p): handle SDP compression for large session descriptions
docs: update deployment guide with production Besu setup
test(blockchain): add hardhat test for zero-quantity guard
chore: pin pnpm to 9.15.0
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `ci`, `perf`, `refactor`

## Pull Request Process

1. Create a branch from `main`
2. Make your changes with tests
3. Run the full test suite: `pnpm test && pnpm test:e2e`
4. Open a PR against `main` with:
   - Clear description of what and why
   - Screenshots for UI changes (mobile viewport)
   - Link to any related issues

## Architecture Decisions

Before making significant changes, read [docs/architecture.md](docs/architecture.md) to understand:
- Why PouchDB over RxDB (custom P2P adapter)
- Why QR-code SDP bootstrap (no signaling server)
- Why Hyperledger Besu over public chains (government use case)
- CouchDB `_rev` conflict resolution strategy

## Need Help?

Open an issue on GitHub. We respond within 48 hours.

# SPIKE: P2P Sync Approach Evaluation

**Date**: 2026-03-21  
**Author**: LumbungData Engineering Team  
**Status**: RESOLVED

## Problem Statement

Enable offline peer-to-peer data sync between farmer devices within a village (no internet, no always-on signaling server) by syncing browser-local PouchDB data over WebRTC DataChannel, bootstrapped by out-of-band exchange (QR).

## Current Codebase Context

- `packages/db/src/pouchdb.ts` lazily loads a custom PouchDB stack (`pouchdb-core`, `pouchdb-adapter-indexeddb`, `pouchdb-replication`, `pouchdb-find`).
- `packages/db/src/sync.ts` and `sync-manager.ts` currently assume PouchDB sync semantics and lifecycle events.
- Shared domain types (`packages/shared/src/types.ts`) are plain JSON-friendly records (`FarmerProfile`, `SoilReading`, `MarketPrice`, `SubsidyDistribution`) and are already aligned with PouchDB document-style storage.

This means P2P sync should preserve existing PouchDB architecture unless there is a strong reason to migrate.

## Options Evaluated

### Option A: RxDB WebRTC Replication Plugin

RxDB provides a WebRTC replication plugin (`replicateWebRTC`, `getConnectionHandlerSimplePeer`) that can sync data peer-to-peer.

#### Pros

- Mature replication surface and reactive event model.
- Documented WebRTC replication API.
- Built-in replication pool behavior.

#### Cons

- Requires RxDB adoption (migration from existing PouchDB or dual-DB layering).
- RxDB WebRTC docs still assume signaling infrastructure for peer discovery (even if minimal/ephemeral).
- Adds new data/replication abstraction on top of current working PouchDB code.
- Budget pressure: `rxdb` package main bundle is large enough to materially impact current initial-JS ceiling.

### Option B: Custom PouchDB Transport over RTCDataChannel

Keep current PouchDB data layer and implement a transport bridge that tunnels replication stream messages over `RTCDataChannel`.

#### Pros

- Preserves existing `packages/db` architecture and data model.
- WebRTC DataChannel is browser-native (transport runtime cost = 0KB).
- Can leverage `pouchdb-replication-stream` to adapt replication protocol to message transport.
- Minimizes migration and operational risk.

#### Cons

- Higher implementation complexity (message framing, chunking, retries, lifecycle).
- Team owns reliability and test matrix.
- Requires careful handling of channel state and backpressure.

## Bundle Size Analysis

Measured and contextualized for this repo's budget constraints:

- Current bundle budget target: **<200KB gzipped initial JS**.
- Known baseline from prior work: **~155KB gzipped**.
- Remaining headroom for P2P implementation: **~45KB**.

| Library / Component | Evidence | Size Signal | Initial Bundle Impact |
|---|---|---:|---|
| `rxdb` | `npm view rxdb --json` (`dist.unpackedSize`) | 8,491,055 bytes unpacked (~8.1MB) | High package footprint; likely budget risk |
| `rxdb` (main entry) | Bundlephobia API (`gzip`) | 47,068 bytes gz (~46KB) | Consumes essentially all remaining headroom alone |
| `pouchdb-replication-stream` | Bundlephobia API (`gzip`) | 15,965 bytes gz (~15.6KB) | Fits headroom better, can be lazy-loaded |
| WebRTC DataChannel | Browser-native | 0KB | No npm/runtime bundle addition |

Notes:
- `rxdb` usable setup for WebRTC replication also requires RxDB wiring choices (storage, schema, collection migration path, and integration changes), which increases practical integration cost beyond one number.
- Even using optimistic `~46KB` gz for core, there is effectively no safety margin left vs a `~45KB` budget envelope.

## SDP Compression Analysis

For QR-based out-of-band offer/answer exchange, SDP payload must fit QR encoding constraints.

Assumptions from WebRTC practice:
- Raw browser SDP offer/answer often lands around **2,000–4,000 bytes**.
- QR practical payload limits are sensitive to mode/error-correction; conservative target is to keep encoded payload far below ~2.9KB binary-equivalent ceiling.

Compression strategy evaluated:
1. **SDP munging**: drop redundant codecs/attributes/candidates not needed for target connection profile.
2. **gzip/deflate compression** using Web Compression API (`CompressionStream('gzip')`).
3. **Base64 wrapping** for QR transport.

| Method | Estimated Size | Fits QR? |
|---|---:|---|
| Raw SDP | ~2,000–3,000 bytes (sometimes more) | ⚠️ Borderline/fragile |
| Stripped SDP | ~800–1,200 bytes | ✅ Yes |
| Gzipped stripped SDP | ~400–700 bytes | ✅ Yes (comfortable) |
| CBOR-style field encoding | ~500–900 bytes | ✅ Yes |

**Conclusion**: Stripping + gzip is sufficient for reliable QR signaling payload size.

## PouchDB Replication Protocol Compatibility

PouchDB replication behavior mirrors Couch-style operations (e.g. `_changes`, `_revs_diff`, `_bulk_get`, `_bulk_docs`).

For WebRTC transport, we do not need HTTP itself; we need a transport that can carry equivalent request/response semantics.

`pouchdb-replication-stream` provides the key bridge:
- Converts replication flow into stream-compatible transport messages.
- Can be adapted to DataChannel by framing stream chunks into ordered RTC messages.
- Keeps existing PouchDB CRUD + sync manager model intact while changing only transport medium.

## Pros/Cons Matrix

| Criterion | RxDB WebRTC Plugin | Custom PouchDB Transport |
|---|---|---|
| Bundle Size | ❌ High pressure vs ~45KB headroom | ✅ WebRTC 0KB + small bridge lib |
| Architecture Fit | ❌ Requires migration or dual stack | ✅ Native fit with existing PouchDB code |
| Implementation Speed | ✅ Faster initial integration | ⚠️ More custom engineering |
| Long-term Maintainability | ⚠️ External abstraction shift | ⚠️ Custom transport ownership |
| Migration Risk | ❌ High (data access layer changes) | ✅ Low (transport-only extension) |
| Offline P2P Goal | ✅ Achievable | ✅ Achievable |

## DECISION: Custom PouchDB Transport via RTCDataChannel

**Rationale**:
1. **Architecture continuity wins**: the current codebase is PouchDB-first and already wired for Pouch replication lifecycle.
2. **Budget guardrail**: remaining bundle headroom is narrow; RxDB consumes too much of the available margin for this phase.
3. **Scope control**: transport-layer adaptation is smaller blast radius than replacing database stack.
4. **Feasible implementation path**: `pouchdb-replication-stream` gives a clear foundation for adapting replication over message-based DataChannel.
5. **SDP feasibility confirmed**: gzip-compressed SDP is small enough for QR exchange.

## Implementation Direction (follow-up work)

- Build QR-based offer/answer exchange with gzip-compressed SDP payloads.
- Establish RTCDataChannel with deterministic lifecycle hooks.
- Adapt `pouchdb-replication-stream` into channel message framing/chunking.
- Integrate with existing `SyncManager` states/events.
- Add resilience handling: reconnect, partial transfer, conflict/retry instrumentation.

## SDP Compression Snippet

```ts
// Compress SDP before QR encoding
async function gzipToBase64(input: string): Promise<string> {
  const compressed = await new Response(
    new Blob([input]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();

  return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}
```

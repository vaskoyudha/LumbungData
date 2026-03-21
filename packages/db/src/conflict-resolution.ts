interface ConflictDoc extends PouchDB.Core.IdMeta {
  _rev?: string;
  _conflicts?: string[];
  recordedAt?: string;
  reportedAt?: string;
}

function getTimestamp(doc: ConflictDoc): number {
  const raw = doc.recordedAt ?? doc.reportedAt;
  if (raw === undefined) return 0;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

function compareRevision(aRev: string | undefined, bRev: string | undefined): number {
  if (aRev === undefined && bRev === undefined) return 0;
  if (aRev === undefined) return -1;
  if (bRev === undefined) return 1;
  return aRev.localeCompare(bRev);
}

export async function resolveConflicts(dbName: string): Promise<void> {
  const { getDatabase } = await import('./databases');
  const db = await getDatabase(dbName as never);

  const result = await db.allDocs<ConflictDoc>({ include_docs: true, conflicts: true });

  for (const row of result.rows) {
    if (row.doc == null) continue;
    const baseDoc = row.doc as unknown as ConflictDoc;
    const conflictRevs = baseDoc._conflicts;
    if (conflictRevs === undefined || conflictRevs.length === 0) continue;

    const revisions: ConflictDoc[] = [baseDoc];
    for (const rev of conflictRevs) {
      const revDoc = await db.get<ConflictDoc>(baseDoc._id, { rev });
      revisions.push(revDoc as unknown as ConflictDoc);
    }

    let winner = revisions[0];
    if (winner === undefined) continue;

    for (const candidate of revisions) {
      const winnerTs = getTimestamp(winner);
      const candidateTs = getTimestamp(candidate);
      if (candidateTs > winnerTs) {
        winner = candidate;
        continue;
      }
      if (candidateTs === winnerTs && compareRevision(candidate._rev, winner._rev) > 0) {
        winner = candidate;
      }
    }

    for (const doc of revisions) {
      if (doc._rev === winner._rev) continue;
      const rev = doc._rev;
      if (rev === undefined) continue;
      await db.remove(doc._id, rev);
    }
  }
}

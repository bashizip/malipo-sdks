// Acceptance receiver only (Node 24); application wallets remain merchant-owned.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chmodSync } from 'node:fs';
const statuses = new Set(['pending', 'processing', 'needs_review', 'succeeded', 'failed', 'cancelled']);
const terminal = status => ['succeeded', 'failed', 'cancelled'].includes(status);
export function createReceiver({ database, secret, apiKeyId, verifyEvent, reconcile }) {
  if (!secret || !apiKeyId || !verifyEvent || !reconcile) throw Error('Receiver configuration required');
  const db = new DatabaseSync(database);
  chmodSync(database, 0o600);
  db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, hash TEXT NOT NULL, type TEXT NOT NULL, payout_id TEXT NOT NULL, raw TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS states(payout_id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS effects(payout_id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts(sequence INTEGER PRIMARY KEY, event_id TEXT NOT NULL, duplicate INTEGER NOT NULL, ignored_old INTEGER NOT NULL);
  `);
  const scoped = value => value?.environment === 'sandbox' && value.payout_kind === 'b2c' && value.api_key_id === apiKeyId && typeof value.id === 'string' && statuses.has(value.status);
  async function consume(raw, headers) {
    if (Buffer.byteLength(raw) > 65_536) return { status: 413 };
    const signature = headers['x-webhook-signature'], timestamp = headers['x-webhook-timestamp'];
    if (typeof signature !== 'string' || typeof timestamp !== 'string' || !timestamp) return { status: 400 };
    let event;
    try { event = verifyEvent(raw, signature, secret, timestamp); } catch { return { status: 401 }; }
    const payout = event?.data?.object;
    if (typeof event?.id !== 'string' || !/^evt_[a-zA-Z0-9_-]+$/.test(event.id) || event.environment !== 'sandbox' || !scoped(payout) || event.type !== 'payout.' + payout.status) return { status: 403 };
    const hash = createHash('sha256').update(raw).digest('hex');
    const old = db.prepare('SELECT hash FROM events WHERE id=?').get(event.id);
    if (old && old.hash !== hash) return { status: 409 };
    let current;
    // Duplicate envelopes need no API request. New events reconcile canonical status.
    if (!old) {
      try { current = await reconcile(payout.id); } catch { return { status: 503 }; }
      if (!scoped(current) || current.id !== payout.id || current.reference !== payout.reference || current.amount !== payout.amount || current.currency !== 'USD') return { status: 403 };
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = db.prepare('SELECT hash FROM events WHERE id=?').get(event.id);
      if (existing) {
        if (existing.hash !== hash) { db.exec('ROLLBACK'); return { status: 409 }; }
        db.prepare('INSERT INTO attempts(event_id,duplicate,ignored_old) VALUES(?,1,0)').run(event.id);
        db.exec('COMMIT'); return { status: 200, duplicate: true };
      }
      const state = db.prepare('SELECT status FROM states WHERE payout_id=?').get(payout.id);
      if (state && terminal(state.status) && terminal(current.status) && state.status !== current.status) {
        db.exec('ROLLBACK'); return { status: 409 };
      }
      const ignoredOld = terminal(current.status) && !terminal(payout.status) || Boolean(state && terminal(state.status) && !terminal(current.status));
      const next = state && terminal(state.status) ? state.status : current.status;
      db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(event.id, hash, event.type, payout.id, raw);
      db.prepare('INSERT INTO states VALUES(?,?) ON CONFLICT(payout_id) DO UPDATE SET status=excluded.status').run(payout.id, next);
      if (terminal(next)) db.prepare('INSERT INTO effects VALUES(?,?) ON CONFLICT(payout_id) DO NOTHING').run(payout.id, next);
      db.prepare('INSERT INTO attempts(event_id,duplicate,ignored_old) VALUES(?,0,?)').run(event.id, ignoredOld ? 1 : 0);
      db.exec('COMMIT'); return { status: 200, duplicate: false };
    } catch { db.exec('ROLLBACK'); return { status: 503 }; }
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/health' && req.method === 'GET') { res.writeHead(200).end('{}'); return; }
    if (req.url !== '/webhook' || req.method !== 'POST') { res.writeHead(404).end('{}'); return; }
    let size = 0; const chunks = [];
    try {
      for await (const chunk of req) { size += chunk.length; if (size > 65_536) { res.writeHead(413).end('{}'); return; } chunks.push(chunk); }
      const result = await consume(Buffer.concat(chunks).toString('utf8'), req.headers);
      res.writeHead(result.status).end(JSON.stringify({ received: result.status === 200 }));
    } catch { if (!res.headersSent) res.writeHead(503).end('{}'); }
  });
  return {
    consume, server,
    stats: () => ({
      events: db.prepare('SELECT id,type,payout_id,raw FROM events').all(),
      attempts: db.prepare('SELECT * FROM attempts ORDER BY sequence').all(),
      states: db.prepare('SELECT * FROM states').all(), effects: db.prepare('SELECT * FROM effects').all(),
    }),
    close: async () => { if (server.listening) await new Promise(resolve => server.close(resolve)); db.close(); },
  };
}

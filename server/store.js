/**
 * LogStore — in-memory log storage with time-range querying.
 * Drop-in replaceable with SQLite or Redis (see bottom of file).
 *
 * Each entry shape:
 * {
 *   id:        string   (nanoid)
 *   ts:        string   (ISO 8601)
 *   tsMs:      number   (ms since epoch, for range queries)
 *   level:     'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
 *   category:  'APP' | 'RESOURCE'
 *   scenario:  string
 *   message:   string
 *   meta:      object
 * }
 */

const { v4: uuidv4 } = require('uuid');

const MAX_ENTRIES = 10_000; // circular buffer ceiling

class LogStore {
  constructor() {
    this.entries = [];
  }

  // ── Write ────────────────────────────────────────────────────────────────

  push({ level, category, scenario, message, meta = {} }) {
    const now = new Date();
    const entry = {
      id:       uuidv4(),
      ts:       now.toISOString(),
      tsMs:     now.getTime(),
      level:    level.toUpperCase(),
      category: category.toUpperCase(),
      scenario,
      message,
      meta,
    };
    this.entries.push(entry);

    // Evict oldest when over ceiling
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
    return entry;
  }

  // ── Query ────────────────────────────────────────────────────────────────

  /**
   * query({
   *   from:      ISO string or ms  — start of range (inclusive)
   *   to:        ISO string or ms  — end of range   (inclusive, default: now)
   *   level:     'ERROR' | ...     — filter by level
   *   category:  'APP' | 'RESOURCE'
   *   scenario:  string            — exact match
   *   search:    string            — substring match on message/meta
   *   limit:     number            — max results (default 200)
   *   offset:    number            — pagination offset
   *   order:     'asc' | 'desc'   — default 'desc'
   * })
   */
  query({
    from,
    to,
    level,
    category,
    scenario,
    search,
    limit  = 200,
    offset = 0,
    order  = 'desc',
  } = {}) {
    const fromMs = from ? new Date(from).getTime() : 0;
    const toMs   = to   ? new Date(to).getTime()   : Date.now();

    if (isNaN(fromMs)) throw new Error(`Invalid 'from' value: ${from}`);
    if (isNaN(toMs))   throw new Error(`Invalid 'to' value: ${to}`);
    if (fromMs > toMs) throw new Error(`'from' must be before 'to'`);

    const searchLower = search ? search.toLowerCase() : null;

    let results = this.entries.filter(e => {
      if (e.tsMs < fromMs || e.tsMs > toMs) return false;
      if (level    && e.level    !== level.toUpperCase())    return false;
      if (category && e.category !== category.toUpperCase()) return false;
      if (scenario && e.scenario !== scenario)               return false;
      if (searchLower) {
        const hay = (e.message + JSON.stringify(e.meta)).toLowerCase();
        if (!hay.includes(searchLower)) return false;
      }
      return true;
    });

    if (order === 'asc') {
      results.sort((a, b) => a.tsMs - b.tsMs);
    } else {
      results.sort((a, b) => b.tsMs - a.tsMs);
    }

    const total    = results.length;
    const paginated = results.slice(offset, offset + limit);

    return {
      total,
      offset,
      limit,
      count:   paginated.length,
      entries: paginated,
    };
  }

  // ── Aggregates ───────────────────────────────────────────────────────────

  stats({ from, to } = {}) {
    const fromMs = from ? new Date(from).getTime() : 0;
    const toMs   = to   ? new Date(to).getTime()   : Date.now();

    const slice = this.entries.filter(e => e.tsMs >= fromMs && e.tsMs <= toMs);

    const byLevel    = {};
    const byCategory = {};
    const byScenario = {};

    for (const e of slice) {
      byLevel[e.level]       = (byLevel[e.level]       || 0) + 1;
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      byScenario[e.scenario] = (byScenario[e.scenario] || 0) + 1;
    }

    return {
      total:      slice.length,
      byLevel,
      byCategory,
      byScenario,
      from:       fromMs ? new Date(fromMs).toISOString() : null,
      to:         new Date(toMs).toISOString(),
    };
  }

  // Bucket counts for a time-series chart (e.g. per-minute or per-hour)
  timeSeries({ from, to, bucketMs = 60_000 } = {}) {
    const fromMs = from ? new Date(from).getTime() : Date.now() - 60 * 60 * 1000;
    const toMs   = to   ? new Date(to).getTime()   : Date.now();

    const slice = this.entries.filter(e => e.tsMs >= fromMs && e.tsMs <= toMs);

    const buckets = {};
    for (const e of slice) {
      const bucket = Math.floor((e.tsMs - fromMs) / bucketMs) * bucketMs + fromMs;
      const key = new Date(bucket).toISOString();
      if (!buckets[key]) buckets[key] = { ts: key, total: 0, INFO:0, WARN:0, ERROR:0, CRITICAL:0 };
      buckets[key].total++;
      buckets[key][e.level] = (buckets[key][e.level] || 0) + 1;
    }

    return Object.values(buckets).sort((a, b) => new Date(a.ts) - new Date(b.ts));
  }

  clear() {
    const count = this.entries.length;
    this.entries = [];
    return count;
  }

  size() {
    return this.entries.length;
  }
}

// Singleton — shared across the whole process
module.exports = new LogStore();

/*
 * ── Swapping to SQLite (better-sqlite3) ─────────────────────────────────────
 *
 * npm install better-sqlite3
 *
 * Replace the class above with:
 *
 *   const Database = require('better-sqlite3');
 *   const db = new Database('logs.db');
 *   db.exec(`CREATE TABLE IF NOT EXISTS logs (
 *     id TEXT PRIMARY KEY, ts TEXT, ts_ms INTEGER,
 *     level TEXT, category TEXT, scenario TEXT, message TEXT, meta TEXT
 *   )`);
 *   db.exec(`CREATE INDEX IF NOT EXISTS idx_ts_ms ON logs(ts_ms)`);
 *
 *   push(entry)  → db.prepare('INSERT INTO logs VALUES (...)').run(...)
 *   query(opts)  → db.prepare('SELECT ... WHERE ts_ms BETWEEN ? AND ?').all(...)
 *
 * ── Swapping to Redis ────────────────────────────────────────────────────────
 *
 * npm install ioredis
 *
 * Use a Redis Sorted Set keyed by ts_ms score:
 *   ZADD logs <tsMs> <JSON.stringify(entry)>
 *   ZRANGEBYSCORE logs <fromMs> <toMs>
 */

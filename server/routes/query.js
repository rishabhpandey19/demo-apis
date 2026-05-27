const express = require('express');
const router  = express.Router();
const store   = require('../store');

/**
 * GET /api/query
 *
 * Query params:
 *   from       ISO 8601 or ms timestamp  (default: 1 hour ago)
 *   to         ISO 8601 or ms timestamp  (default: now)
 *   level      INFO | WARN | ERROR | CRITICAL
 *   category   APP | RESOURCE
 *   scenario   exact scenario id
 *   search     substring search on message + meta
 *   limit      max results (default 200, max 1000)
 *   offset     pagination offset (default 0)
 *   order      asc | desc (default desc)
 *
 * Examples:
 *   GET /api/query?from=2024-01-01T00:00:00Z&to=2024-01-01T01:00:00Z
 *   GET /api/query?level=ERROR&limit=50
 *   GET /api/query?from=2024-01-01T00:00:00Z&level=WARN&category=RESOURCE
 *   GET /api/query?search=db_down&order=asc
 */
router.get('/', (req, res) => {
  try {
    const {
      from, to, level, category, scenario, search, order,
    } = req.query;

    const limit  = Math.min(parseInt(req.query.limit  || 200), 1000);
    const offset = Math.max(parseInt(req.query.offset || 0),   0);

    const result = store.query({ from, to, level, category, scenario, search, limit, offset, order });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/query/stats
 *
 * Query params: from, to  (same as above)
 * Returns counts grouped by level, category, scenario.
 */
router.get('/stats', (req, res) => {
  try {
    const { from, to } = req.query;
    res.json({ ok: true, ...store.stats({ from, to }) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/query/timeseries
 *
 * Query params:
 *   from       start (default: 1 hour ago)
 *   to         end   (default: now)
 *   bucket     bucket size in seconds (default 60)
 *
 * Returns an array of time buckets with counts per level — ready for charting.
 */
router.get('/timeseries', (req, res) => {
  try {
    const { from, to } = req.query;
    const bucketMs = Math.max(parseInt(req.query.bucket || 60), 1) * 1000;
    const series = store.timeSeries({ from, to, bucketMs });
    res.json({ ok: true, bucketSec: bucketMs / 1000, count: series.length, series });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/query/store
 * Returns store metadata (size, oldest/newest entry).
 */
router.get('/store', (_req, res) => {
  const size = store.size();
  const entries = store.entries;
  res.json({
    ok: true,
    size,
    maxEntries: 10_000,
    oldest: size ? entries[0].ts : null,
    newest: size ? entries[entries.length - 1].ts : null,
  });
});

/**
 * DELETE /api/query/store
 * Clears the in-memory store.
 */
router.delete('/store', (_req, res) => {
  const cleared = store.clear();
  res.json({ ok: true, cleared });
});

module.exports = router;

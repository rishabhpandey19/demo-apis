const express = require('express');
const router  = express.Router();
const logger  = require('../logger');
const store   = require('../store');
const appSc   = require('../scenarios/app');
const resSc   = require('../scenarios/resource');

const ALL = { ...appSc, ...resSc };

// Level lookup per scenario (for store tagging)
const LEVEL_MAP = {
  server_error:'ERROR', db_down:'ERROR', auth_error:'ERROR', payment_fail:'ERROR',
  third_party_down:'ERROR', disk_full:'ERROR',
  user_blocked:'WARN', rate_limit:'WARN', cache_miss:'WARN', slow_query:'WARN',
  service_start:'INFO', user_login:'INFO',
  high_cpu:'WARN', cpu_critical:'ERROR', low_memory:'WARN', oom_kill:'ERROR',
  disk_io_saturation:'WARN', network_saturation:'ERROR', thread_leak:'ERROR',
  gc_pause:'WARN', memory_leak:'ERROR',
};

function storeEntry(scenario, result) {
  const category = appSc[scenario] ? 'APP' : 'RESOURCE';
  const level    = LEVEL_MAP[scenario] || 'INFO';
  return store.push({
    level,
    category,
    scenario,
    message: result.error || result.reason || result.action || scenario,
    meta: result,
  });
}

router.get('/scenarios', (_req, res) => {
  res.json({
    app:      Object.keys(appSc),
    resource: Object.keys(resSc).filter(k => k !== 'snapshot'),
  });
});

router.get('/snapshot', (_req, res) => {
  const data = resSc.snapshot(logger);
  store.push({ level:'INFO', category:'RESOURCE', scenario:'snapshot', message:'Live snapshot', meta: data });
  res.json({ ok: true, data });
});

router.post('/generate', (req, res) => {
  const { scenario } = req.body;
  if (!scenario || !ALL[scenario]) {
    return res.status(400).json({
      error: 'Unknown scenario',
      available: { app: Object.keys(appSc), resource: Object.keys(resSc) },
    });
  }
  const result   = ALL[scenario](logger);
  const category = appSc[scenario] ? 'app' : 'resource';
  const stored   = storeEntry(scenario, result);
  res.json({ ok: true, scenario, category, generated: result, stored: { id: stored.id, ts: stored.ts } });
});

router.post('/burst', (req, res) => {
  const { count = 5, category } = req.body;
  const pool  = category === 'app'      ? appSc
              : category === 'resource' ? resSc
              : ALL;
  const keys  = Object.keys(pool).filter(k => k !== 'snapshot');
  const picks = keys.sort(() => Math.random() - 0.5).slice(0, Math.min(count, keys.length));
  const results = picks.map(key => {
    const result  = pool[key](logger);
    const stored  = storeEntry(key, result);
    return { scenario: key, category: appSc[key] ? 'app' : 'resource', generated: result, stored: { id: stored.id, ts: stored.ts } };
  });
  res.json({ ok: true, count: results.length, results });
});

module.exports = router;

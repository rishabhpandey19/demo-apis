const express = require('express');
const router  = express.Router();
const logger  = require('../logger');
const appSc   = require('../scenarios/app');
const resSc   = require('../scenarios/resource');

const ALL = { ...appSc, ...resSc };

router.get('/scenarios', (_req, res) => {
  res.json({
    app:      Object.keys(appSc),
    resource: Object.keys(resSc).filter(k => k !== 'snapshot'),
  });
});

router.get('/snapshot', (_req, res) => {
  res.json({ ok: true, data: resSc.snapshot(logger) });
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
  res.json({ ok: true, scenario, category, generated: result });
});

router.post('/burst', (req, res) => {
  const { count = 5, category } = req.body;
  const pool = category === 'app'      ? appSc
             : category === 'resource' ? resSc
             : ALL;
  const keys   = Object.keys(pool).filter(k => k !== 'snapshot');
  const picks  = keys.sort(() => Math.random() - 0.5).slice(0, Math.min(count, keys.length));
  const results = picks.map(key => ({
    scenario: key,
    category: appSc[key] ? 'app' : 'resource',
    ...pool[key](logger),
  }));
  res.json({ ok: true, count: results.length, results });
});

module.exports = router;

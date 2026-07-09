#!/usr/bin/env node
// @ai-native-solutions/fallforce-api
// HTTP wrapper around @ai-native-solutions/fallforce-sdk.
// Stateless: every endpoint takes deals/contacts/activities in the request body
// and returns computed KPIs. No persistence, no analytics, no auth.

import express from 'express';
import {
  createStore, createDeal, weightedForecast, wonRevenue, winRate,
  avgDealValue, pipelineByStage, pipelineHealth, dealRisk,
  buildContext, runAutopilot, SWARM_ROLES, DEFAULT_STAGES, VERSION,
} from '@ai-native-solutions/fallforce-sdk';

const app = express();
app.use(express.json({ limit: '5mb' }));

// CORS — permissive; sovereign local usage. Override with a reverse proxy if you need to lock down.
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

// ---------- Meta ----------

app.get('/', (_req, res) => {
  res.json({
    name: 'fallforce-api',
    version: VERSION,
    endpoints: [
      'GET  /health',
      'GET  /stages',
      'GET  /roles',
      'GET  /roles/:id',
      'POST /forecast',
      'POST /pipeline/by-stage',
      'POST /risks',
      'POST /context',
      'POST /autopilot/plan',
    ],
    docs: 'https://github.com/sjgant80-hub/fallforce-api',
  });
});

app.get('/health', (_req, res) => res.json({ ok: true, version: VERSION }));
app.get('/stages', (_req, res) => res.json(DEFAULT_STAGES));
app.get('/roles',  (_req, res) => res.json(SWARM_ROLES));
app.get('/roles/:id', (req, res) => {
  const r = SWARM_ROLES.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'unknown role' });
  res.json(r);
});

// ---------- Compute ----------

app.post('/forecast', (req, res) => {
  const deals = (req.body.deals || []).map(createDeal);
  res.json({
    forecast: weightedForecast(deals),
    won: wonRevenue(deals),
    winRate: winRate(deals),
    avgDeal: avgDealValue(deals),
    health: pipelineHealth(deals, { activities: req.body.activities || [] }),
  });
});

app.post('/pipeline/by-stage', (req, res) => {
  const deals = (req.body.deals || []).map(createDeal);
  res.json(pipelineByStage(deals, req.body.stages || DEFAULT_STAGES));
});

app.post('/risks', (req, res) => {
  const deals = (req.body.deals || []).map(createDeal);
  const acts = req.body.activities || [];
  const stale = req.body.staleDays ?? 14;
  const out = deals.map(d => dealRisk(d, { activities: acts, staleDays: stale }))
                   .sort((a, b) => b.score - a.score);
  res.json(out);
});

function makeStore(body) {
  return createStore({
    deals: body.deals || [],
    contacts: body.contacts || [],
    companies: body.companies || [],
    activities: body.activities || [],
    settings: { currency: body.currency || '£' },
  });
}

app.post('/context', (req, res) => {
  res.json(buildContext(makeStore(req.body)));
});

app.post('/autopilot/plan', async (req, res) => {
  const store = makeStore(req.body);
  const plan = await runAutopilot(store,
    async (role, spec) => `[queued for ${role}] ${spec.desc}`,
    req.body.sequence);
  res.json({
    sequence: plan.results.map(r => r.role),
    ctxKpis: plan.ctx.kpis,
    plannedAt: plan.completedAt,
  });
});

// ---------- Error ----------

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});

// ---------- Boot ----------

const PORT = process.env.PORT || 8787;
if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => console.log(`fallforce-api v${VERSION} listening on :${PORT}`));
}

export default app;

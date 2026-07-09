# @ai-native-solutions/fallforce-api

HTTP API for [FallForce](https://sjgant80-hub.github.io/fallforce/) — sovereign CRM
as REST endpoints. Wraps
[`@ai-native-solutions/fallforce-sdk`](https://github.com/sjgant80-hub/fallforce-sdk).

Stateless. Every endpoint takes the CRM data in the request body and returns
computed KPIs. No database, no analytics, no auth. Bring your own persistence.

## Install & run

```bash
npm install
npm start                              # listens on :8787
# or
PORT=9000 npx @ai-native-solutions/fallforce-api
```

## Docker

```bash
docker compose up -d
curl http://localhost:8787/health
```

## Endpoints

| Method | Path                   | Purpose |
|--------|------------------------|---------|
| GET    | `/`                    | Endpoint index |
| GET    | `/health`              | `{ ok, version }` |
| GET    | `/stages`              | Default stage list |
| GET    | `/roles`               | The 9 swarm role specs |
| GET    | `/roles/:id`           | One role spec |
| POST   | `/forecast`            | Weighted forecast + won + winRate + avgDeal + health |
| POST   | `/pipeline/by-stage`   | `{ stage: { count, value, weighted } }` |
| POST   | `/risks`               | Deals ranked by risk with reason codes |
| POST   | `/context`             | Grounded CRM snapshot for LLM system prompts |
| POST   | `/autopilot/plan`      | Sequenced role plan (no LLM call) |

## Curl

```bash
# Health
curl http://localhost:8787/health

# Forecast
curl -sX POST http://localhost:8787/forecast \
  -H 'content-type: application/json' \
  -d '{ "deals": [
    { "name": "Acme",   "value": 12000, "stage": "Proposal",    "probability": 60 },
    { "name": "Bright", "value":  8000, "stage": "Negotiation", "probability": 80 }
  ] }'
# → { "forecast": 13600, "won": 0, "winRate": 0, "avgDeal": 10000, "health": {...} }

# Risks
curl -sX POST http://localhost:8787/risks \
  -H 'content-type: application/json' \
  -d '{ "deals": [{ "name": "Echo", "value": 20000, "stage": "Qualified", "probability": 20, "closeDate": "2026-06-01" }] }'
```

## Companions

- [`fallforce-sdk`](https://github.com/sjgant80-hub/fallforce-sdk) — the engine
- [`fallforce-mcp`](https://github.com/sjgant80-hub/fallforce-mcp) — MCP server

## License

MIT.

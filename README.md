# LogForge

On-demand log and resource scenario generator. Fire realistic log events — server errors, DB failures, auth issues, CPU spikes, OOM kills — via a REST API or the built-in UI.

---

## Deploy on Dokploy

### Option A — Git repo (recommended)

1. Push this project to a GitHub/GitLab repo.
2. In Dokploy: **New Application → Application → Git**.
3. Connect your repo.
4. Set build pack: **Dockerfile**.
5. Set port: **3000**.
6. Add environment variables (see below).
7. Click **Deploy**.

### Option B — Docker Compose

1. In Dokploy: **New Application → Docker Compose**.
2. Paste the contents of `docker-compose.yml`.
3. Click **Deploy**.

### Environment variables

| Variable   | Default       | Description                  |
|------------|---------------|------------------------------|
| `PORT`     | `3000`        | HTTP port                    |
| `NODE_ENV` | `production`  | Environment name             |
| `LOG_LEVEL`| `info`        | Winston log level            |

### Domain / HTTPS

In Dokploy, go to **Domains** → add your domain → enable **Let's Encrypt**.  
No extra config needed — the app serves the UI at `/` and the API at `/api/logs/*`.

---

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## API reference

| Method | Endpoint                | Body                        | Description                        |
|--------|-------------------------|-----------------------------|------------------------------------|
| GET    | `/health`               | —                           | Health check                       |
| GET    | `/api/logs/scenarios`   | —                           | List all scenario keys by category |
| GET    | `/api/logs/snapshot`    | —                           | Real live CPU / memory metrics     |
| POST   | `/api/logs/generate`    | `{ "scenario": "db_down" }` | Fire a specific scenario           |
| POST   | `/api/logs/burst`       | `{ "count": 5, "category": "app" }` | Fire N random scenarios  |

### App scenarios
`server_error` · `db_down` · `auth_error` · `user_blocked` · `rate_limit` · `payment_fail` · `cache_miss` · `slow_query` · `third_party_down` · `disk_full` · `service_start` · `user_login`

### Resource scenarios
`high_cpu` · `cpu_critical` · `low_memory` · `oom_kill` · `disk_io_saturation` · `network_saturation` · `thread_leak` · `gc_pause` · `memory_leak`

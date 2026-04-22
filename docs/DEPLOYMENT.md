# Deploy

Single SvelteKit + Node process, SQLite for persistence. Two supported modes:

| Mode              | When to use                                |
|-------------------|--------------------------------------------|
| Docker + Traefik  | You already run Traefik with auto-TLS      |
| Bare-metal systemd| Any Linux box with Node ≥20                |

## Docker + Traefik

Edit `docker-compose.yml`: set your `Host(...)` rule, Traefik network name, and cert resolver. Then:

```bash
docker compose build
docker compose up -d
```

## Systemd

```bash
useradd --system --home /opt/ot-revisited --shell /usr/sbin/nologin otrev
git clone https://github.com/<your-org>/ot-revisited.git /opt/ot-revisited
cd /opt/ot-revisited
sudo -u otrev npm ci && sudo -u otrev npm run build
mkdir -p /var/lib/ot-revisited && chown otrev:otrev /var/lib/ot-revisited
```

`/etc/systemd/system/ot-revisited.service`:

```ini
[Service]
Type=simple
User=otrev
WorkingDirectory=/opt/ot-revisited
Environment=DATABASE_URL=file:/var/lib/ot-revisited/game.db
Environment=DRIZZLE_MIGRATIONS_DIR=/opt/ot-revisited/drizzle
ExecStart=/usr/bin/node /opt/ot-revisited/build/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Env vars

| Var                      | Default              |
|--------------------------|----------------------|
| `HOST`                   | `0.0.0.0`            |
| `PORT`                   | `3000`               |
| `DATABASE_URL`           | `file:./dev.db`      |
| `DRIZZLE_MIGRATIONS_DIR` | resolved next to build |

## Backup

SQLite runs in WAL mode — use the online backup API, not a file copy:

```bash
docker exec ot-revisited sqlite3 /data/game.db ".backup /data/backup.db"
```

## Update

`git pull && docker compose up -d --build` (or `systemctl restart ot-revisited`). Migrations auto-run.

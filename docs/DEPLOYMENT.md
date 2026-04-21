# Deploying Hoosier Trail

The game is a single SvelteKit + Node.js process backed by a local SQLite file.
Deploy it anywhere you can run Node ≥20.

## Prerequisites

- Node.js 20 or higher
- ~100 MB disk for dependencies + SQLite
- A domain + reverse proxy if exposing to the internet (optional)

## Build

```bash
npm ci
npm run db:generate   # only if schema changed
npm run build         # produces build/
```

The `build/` directory is self-contained and can be copied to a server.

## Run

```bash
# Default port 3000
node build/index.js

# Custom port + DB location
PORT=4000 DATABASE_URL=file:/var/lib/hoosiertrail/game.db node build/index.js
```

Environment variables:

- `PORT` — listen port (default 3000)
- `HOST` — listen host (default 0.0.0.0)
- `DATABASE_URL` — SQLite file path (default `./dev.db`). Use `file:/absolute/path`.
- `DRIZZLE_MIGRATIONS_DIR` — absolute path to `drizzle/` migrations folder if not next to the build

## systemd example

`/etc/systemd/system/hoosiertrail.service`:

```ini
[Unit]
Description=Hoosier Trail
After=network.target

[Service]
Type=simple
User=hoosiertrail
WorkingDirectory=/opt/hoosiertrail
Environment=PORT=3000
Environment=DATABASE_URL=file:/var/lib/hoosiertrail/game.db
Environment=DRIZZLE_MIGRATIONS_DIR=/opt/hoosiertrail/drizzle
ExecStart=/usr/bin/node /opt/hoosiertrail/build/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hoosiertrail
sudo journalctl -u hoosiertrail -f
```

## Reverse proxy (nginx)

```nginx
server {
    server_name hoosiertrail.example.com;
    listen 443 ssl http2;
    # ... TLS config ...

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backups

The SQLite database is the only persistent state. Back it up with any cron-scheduled copy:

```bash
sqlite3 /var/lib/hoosiertrail/game.db ".backup /var/backups/hoosiertrail-$(date +%F).db"
```

## Upgrading

1. `git pull`
2. `npm ci`
3. `npm run db:generate && npm run build`
4. `sudo systemctl restart hoosiertrail`

SQLite schema migrations are applied automatically at startup; no manual
migration step is needed.

## Free-tier hosting options

- **Fly.io** (free tier): `fly launch` + `fly volumes create ht_data --size 1` for the SQLite file
- **Cloudflare Pages + Durable Objects**: not suitable for the SQLite-on-disk model without rework
- **Hetzner / DigitalOcean**: cheapest VPS that runs Node + disk
- **Home server** (recommended for a personal journey): any Raspberry Pi or old laptop

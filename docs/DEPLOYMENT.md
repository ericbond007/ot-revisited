# Deploying The OT: Oregon Trail Revisited

The game is a single SvelteKit + Node process backed by a local SQLite file. Two recommended deploy modes:

- **Docker + Traefik** (preferred for self-hosting behind a reverse proxy)
- **Bare-metal systemd** (any Linux box with Node ≥20)

Player data lives in a single SQLite file. Saves survive upgrades as long as you preserve that file (or the named volume that contains it).

## Docker + Traefik

This is the cleanest mode when you already run Traefik with an auto-TLS resolver. The container exposes port 3000 only inside a shared Docker network; Traefik reaches it via labels — you never publish a host port.

### Prerequisites

- Docker + Compose v2
- A running Traefik instance with a cert resolver (the compose file below assumes one named `letsencrypt` — change it to match yours)
- A Docker network attached to Traefik (this guide assumes it's called `traefik` — change if yours differs)
- DNS: your chosen hostname (`<your-domain>`) pointed at the Traefik host

### Install

```bash
git clone https://github.com/<your-org>/ot-revisited.git
cd ot-revisited

# Update docker-compose.yml:
#   - Replace <your-domain> with your actual hostname
#   - Match `traefik.docker.network` + the top-level `networks:` to your Traefik network name
#   - Match `tls.certresolver` to your Traefik resolver name

docker compose build
docker compose up -d
docker compose logs -f
```

On first start the container creates `/data/game.db` inside the `ot-data` volume and runs migrations automatically. Traefik picks up the labels and serves the game over HTTPS within a few seconds.

### Updates

```bash
cd /path/to/ot-revisited
git pull
docker compose build
docker compose up -d
```

Migrations run automatically at startup. Saves in the `ot-data` volume are preserved.

### Backups

SQLite is the only persistent state. Use SQLite's online backup API (a raw file copy of a WAL-mode DB can be corrupt):

```bash
#!/bin/sh
set -e
BACKUP_DIR=/var/backups/ot-revisited
STAMP=$(date +%F)
mkdir -p "$BACKUP_DIR"
docker exec ot-revisited sqlite3 /data/game.db ".backup /data/backup-$STAMP.db"
docker cp ot-revisited:/data/backup-$STAMP.db "$BACKUP_DIR/game-$STAMP.db"
docker exec ot-revisited rm -f /data/backup-$STAMP.db
find "$BACKUP_DIR" -name 'game-*.db' -mtime +14 -delete
```

Schedule via cron or a systemd timer.

### Uninstall

```bash
docker compose down
docker volume rm ot-revisited_ot-data   # WARNING: destroys all save games
```

## Bare-metal (systemd)

If you don't want Docker, run as a dedicated system user behind whatever reverse proxy you like.

```bash
# As root
useradd --system --home /opt/ot-revisited --shell /usr/sbin/nologin otrev
git clone https://github.com/<your-org>/ot-revisited.git /opt/ot-revisited
cd /opt/ot-revisited
sudo -u otrev npm ci
sudo -u otrev npm run build
mkdir -p /var/lib/ot-revisited
chown otrev:otrev /var/lib/ot-revisited
```

`/etc/systemd/system/ot-revisited.service`:

```ini
[Unit]
Description=The OT: Oregon Trail Revisited
After=network.target

[Service]
Type=simple
User=otrev
Group=otrev
WorkingDirectory=/opt/ot-revisited
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=DATABASE_URL=file:/var/lib/ot-revisited/game.db
Environment=DRIZZLE_MIGRATIONS_DIR=/opt/ot-revisited/drizzle
ExecStart=/usr/bin/node /opt/ot-revisited/build/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now ot-revisited
journalctl -u ot-revisited -f
```

Point your reverse proxy at `http://127.0.0.1:3000`.

## Environment variables

| Var                      | Default                     | Notes                                    |
|--------------------------|-----------------------------|------------------------------------------|
| `HOST`                   | `0.0.0.0`                   | Listen address                           |
| `PORT`                   | `3000`                      | Listen port                              |
| `DATABASE_URL`           | `file:./dev.db`             | Use `file:/absolute/path` in production  |
| `DRIZZLE_MIGRATIONS_DIR` | resolved next to the build  | Override if running from a non-standard layout |
| `NODE_ENV`               | unset                       | Set to `production` in production        |

## Free-tier hosting options

- **Fly.io** free tier — `fly launch` and add a 1 GB volume for the SQLite file
- **Hetzner / DigitalOcean** — cheapest VPS that runs Node + a disk
- **Home server** — any Raspberry Pi or old laptop running Docker

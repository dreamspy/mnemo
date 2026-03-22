# Deployment

## Overview

HuXa runs on an AWS EC2 instance (Ubuntu 22.04). Code is deployed to `/opt/huxa/`, data lives in `/var/lib/huxa/`, and the FastAPI application is managed by systemd behind an Nginx reverse proxy with Cloudflare in front.

## Server Layout

```
/opt/huxa/              → Application code (git clone target)
/var/lib/huxa/
    events.jsonl         → Raw event stream
    diary.jsonl          → Structured diary entries
    derived/             → Computed/aggregated data
/var/log/huxa/          → Application logs
/etc/huxa/
    config.json          → Runtime configuration
```

## Code Deployment

Deployment is automated with [Fabric](https://www.fabfile.org/) via `fabfile.py` in the project root. Requires `fabric` installed locally (`pipx install fabric`).

### Quick Deploy

```bash
fab deploy
```

This pushes to `origin/main`, pulls on the server, and restarts the service.

### Available Commands

| Command | Description |
|---|---|
| `fab deploy` | Push, pull on server, restart huxa |
| `fab status` | Show huxa service status |
| `fab logs` | Tail last 50 log lines (`--lines=N` for more) |
| `fab restart` | Restart the service |

### Manual Deploy

If needed, SSH in and run:

```bash
cd /opt/huxa
git pull origin main
pip install -r 02_backend/requirements.txt
sudo systemctl restart huxa
```

The repository contains application code only. Data, logs, and configuration are external to the repo.

## systemd Service

The `huxa.service` unit file (in `04_infrastructure/systemd/`) runs Uvicorn:

```ini
[Unit]
Description=HuXa Event Engine
After=network.target

[Service]
Type=simple
User=huxa
Group=huxa
WorkingDirectory=/opt/huxa/02_backend
ExecStart=/opt/huxa/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
Environment=HUXA_CONFIG=/etc/huxa/config.json

[Install]
WantedBy=multi-user.target
```

Key behaviors:
- Uvicorn binds to `127.0.0.1:8000` (localhost only — Nginx handles external traffic)
- Automatic restart on crash with 5-second delay
- Runs as dedicated `huxa` user for isolation
- Config path passed via environment variable
- Logs go to journald (`journalctl -u huxa`)

### Service Management

```bash
sudo systemctl start huxa
sudo systemctl stop huxa
sudo systemctl restart huxa
sudo systemctl status huxa
journalctl -u huxa -f          # tail logs
```

## Nginx Configuration

Nginx proxies external HTTPS traffic to Uvicorn:

```nginx
server {
    listen 80;
    server_name mnemo.axex.is;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

TLS is terminated at Cloudflare (Full mode) or locally with certbot depending on configuration.

## Cloudflare Integration

Cloudflare provides:
- **DNS:** `mnemo.axex.is` points to the EC2 instance (proxied through Cloudflare)
- **DDoS protection:** Automatic
- **TLS:** Full (strict) mode — Cloudflare terminates client TLS, connects to origin over TLS
- **Caching:** Static assets cached at edge

### Future: Zero Trust

Cloudflare Zero Trust will be added in a future phase to:
- Restrict access to authenticated users
- Add device-based policies
- Enable SSO integration

## Initial Server Setup

```bash
# Create huxa user
sudo useradd -r -s /bin/false huxa

# Create directories
sudo mkdir -p /opt/huxa
sudo mkdir -p /var/lib/huxa/derived
sudo mkdir -p /var/log/huxa
sudo mkdir -p /etc/huxa

# Set ownership
sudo chown huxa:huxa /var/lib/huxa
sudo chown huxa:huxa /var/lib/huxa/derived
sudo chown huxa:huxa /var/log/huxa

# Clone repo
sudo git clone <repo-url> /opt/huxa

# Set up Python venv
sudo python3 -m venv /opt/huxa/venv
sudo /opt/huxa/venv/bin/pip install -r /opt/huxa/02_backend/requirements.txt

# Copy config
sudo cp /opt/huxa/06_config/config.example.json /etc/huxa/config.json
# Edit config with real values

# Install and enable service
sudo cp /opt/huxa/04_infrastructure/systemd/huxa.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable huxa
sudo systemctl start huxa

# Install Nginx config
sudo cp /opt/huxa/04_infrastructure/nginx/huxa.conf /etc/nginx/sites-available/huxa
sudo ln -s /etc/nginx/sites-available/huxa /etc/nginx/sites-enabled/huxa
sudo nginx -t
sudo systemctl reload nginx
```

## Syncthing Sync

Syncthing runs on both the EC2 server and the target Mac. The shared folder is `/var/lib/huxa/`. The Mac receives a continuously updated copy of the full event stream and derived data.

This enables local analysis with Claude CLI, Gemini CLI, and custom scripts.

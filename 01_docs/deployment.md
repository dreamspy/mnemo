# Deployment

## Overview

Mnemo runs on an AWS EC2 instance (Ubuntu 22.04). Code is deployed to `/opt/mnemo/`, data lives in `/var/lib/mnemo/`, and the FastAPI application is managed by systemd behind an Nginx reverse proxy with Cloudflare in front.

## Server Layout

```
/opt/mnemo/              → Application code (git clone target)
/var/lib/mnemo/
    events.jsonl         → Raw event stream
    diary.jsonl          → Structured diary entries
    derived/             → Computed/aggregated data
/var/log/mnemo/          → Application logs
/etc/mnemo/
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
| `fab deploy` | Push, pull on server, restart mnemo |
| `fab status` | Show mnemo service status |
| `fab logs` | Tail last 50 log lines (`--lines=N` for more) |
| `fab restart` | Restart the service |

### Manual Deploy

If needed, SSH in and run:

```bash
cd /opt/mnemo
git pull origin main
pip install -r 02_backend/requirements.txt
sudo systemctl restart mnemo
```

The repository contains application code only. Data, logs, and configuration are external to the repo.

## systemd Service

The `mnemo.service` unit file (in `04_infrastructure/systemd/`) runs Uvicorn:

```ini
[Unit]
Description=Mnemo Event Engine
After=network.target

[Service]
Type=simple
User=mnemo
Group=mnemo
WorkingDirectory=/opt/mnemo/02_backend
ExecStart=/opt/mnemo/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
Environment=MNEMO_CONFIG=/etc/mnemo/config.json

[Install]
WantedBy=multi-user.target
```

Key behaviors:
- Uvicorn binds to `127.0.0.1:8000` (localhost only — Nginx handles external traffic)
- Automatic restart on crash with 5-second delay
- Runs as dedicated `mnemo` user for isolation
- Config path passed via environment variable
- Logs go to journald (`journalctl -u mnemo`)

### Service Management

```bash
sudo systemctl start mnemo
sudo systemctl stop mnemo
sudo systemctl restart mnemo
sudo systemctl status mnemo
journalctl -u mnemo -f          # tail logs
```

## Nginx Configuration

Nginx proxies external HTTPS traffic to Uvicorn:

```nginx
server {
    listen 80;
    server_name mnemo.is;

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
- **DNS:** `mnemo.is` points to the EC2 instance (proxied through Cloudflare)
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
# Create mnemo user
sudo useradd -r -s /bin/false mnemo

# Create directories
sudo mkdir -p /opt/mnemo
sudo mkdir -p /var/lib/mnemo/derived
sudo mkdir -p /var/log/mnemo
sudo mkdir -p /etc/mnemo

# Set ownership
sudo chown mnemo:mnemo /var/lib/mnemo
sudo chown mnemo:mnemo /var/lib/mnemo/derived
sudo chown mnemo:mnemo /var/log/mnemo

# Clone repo
sudo git clone <repo-url> /opt/mnemo

# Set up Python venv
sudo python3 -m venv /opt/mnemo/venv
sudo /opt/mnemo/venv/bin/pip install -r /opt/mnemo/02_backend/requirements.txt

# Copy config
sudo cp /opt/mnemo/06_config/config.example.json /etc/mnemo/config.json
# Edit config with real values

# Install and enable service
sudo cp /opt/mnemo/04_infrastructure/systemd/mnemo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mnemo
sudo systemctl start mnemo

# Install Nginx config
sudo cp /opt/mnemo/04_infrastructure/nginx/mnemo.conf /etc/nginx/sites-available/mnemo
sudo ln -s /etc/nginx/sites-available/mnemo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Syncthing Sync

Syncthing runs on both the EC2 server and the target Mac. The shared folder is `/var/lib/mnemo/`. The Mac receives a continuously updated copy of the full event stream and derived data.

This enables local analysis with Claude CLI, Gemini CLI, and custom scripts.

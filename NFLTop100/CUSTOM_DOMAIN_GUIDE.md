# Custom Domain Guide — NFL Top 100 (Proper Production Setup)

**Last Updated:** May 21, 2026  
**Prerequisite:** Site already running on EC2 per [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)  
**Goal:** `https://yourdomain.com` (no `:8000` in the URL), Gunicorn + Nginx + HTTPS, `DEBUG=False`

This guide does **not** cover Elastic IP. DNS points at your EC2 **current public IP**. If you stop/start the instance and the IP changes, update your DNS A record and `ALLOWED_HOSTS` (or add an Elastic IP later).

---

## Table of Contents

1. [What You Already Have](#what-you-already-have)
2. [What This Guide Adds](#what-this-guide-adds)
3. [Overview & Time Estimate](#overview--time-estimate)
4. [Step 1 — Buy the Domain](#step-1--buy-the-domain)
5. [Step 2 — Point DNS to EC2](#step-2--point-dns-to-ec2)
6. [Step 3 — EC2 Security Group](#step-3--ec2-security-group)
7. [Step 4 — Django `.env`](#step-4--django-env)
8. [Step 5 — Gunicorn (systemd)](#step-5--gunicorn-systemd)
9. [Step 6 — Nginx (ports 80 / 443)](#step-6--nginx-ports-80--443)
10. [Step 7 — HTTPS (Let's Encrypt)](#step-7--https-lets-encrypt)
11. [Step 8 — `DEBUG=False` and Static Files](#step-8--debugfalse-and-static-files)
12. [Deploying Updates After Go-Live](#deploying-updates-after-go-live)
13. [Checklist](#checklist)
14. [Troubleshooting](#troubleshooting)

---

## What You Already Have

| Item | Status |
|------|--------|
| EC2 instance running Django | Yes |
| SQLite (`db.sqlite3`) on EC2 | Yes |
| `.env` with `ALLOWED_HOSTS`, secrets | Yes |
| `gunicorn` in `requirements.txt` | Yes |
| `screen` + `runserver` or similar on port 8000 | Typical today |

You are **not** rebuilding the app — this is infrastructure and production hardening.

---

## What This Guide Adds

| Layer | Role |
|-------|------|
| **DNS** | `yourdomain.com` → EC2 public IP |
| **Nginx** | Listens on 80/443; proxies to Gunicorn |
| **Gunicorn** | Runs Django on an internal port (e.g. `127.0.0.1:8000`) |
| **Certbot** | Free TLS certificate → `https://` |
| **WhiteNoise** (recommended) | Serves CSS/JS/images when `DEBUG=False` |

**End state:** Visitors open `https://nfltop100.com/` (example) with no port number.

---

## Overview & Time Estimate

| Step | Time (first time) |
|------|-------------------|
| Buy domain | ~15 min |
| DNS A record | ~15–30 min (+ propagation up to 48h, often minutes) |
| Security group + `.env` | ~15 min |
| Gunicorn systemd | ~30 min |
| Nginx | ~1–2 hours |
| HTTPS (Certbot) | ~1 hour |
| WhiteNoise + `DEBUG=False` | ~30–60 min |
| **Total** | **~half day** |

---

## Step 1 — Buy the Domain

1. Register a domain (e.g. `nfltop100.com`) at **Route 53**, **Namecheap**, **Cloudflare**, **Google Domains**, etc. (~$12–15/year).
2. No code changes required.
3. Use the registrar’s DNS (or transfer DNS to Route 53 / Cloudflare if you prefer).

---

## Step 2 — Point DNS to EC2

1. In the AWS EC2 console, copy your instance **Public IPv4 address** (e.g. `3.12.34.56`).
2. In your domain DNS panel, create:

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| **A** | `@` (root) | `YOUR_EC2_PUBLIC_IP` | 300 (or default) |
| **A** | `www` | `YOUR_EC2_PUBLIC_IP` | 300 |

Optional: later configure `www` → redirect to root in Nginx.

3. Wait for DNS to propagate. Test from your PC:

```powershell
nslookup yourdomain.com
```

When the A record shows your EC2 IP, continue.

**Note:** If the instance is stopped/started and the public IP changes, update this A record (unless you add an Elastic IP later).

---

## Step 3 — EC2 Security Group

In the EC2 security group attached to your instance, add **inbound** rules:

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| HTTP | 80 | `0.0.0.0/0` | Nginx (and Certbot challenge) |
| HTTPS | 443 | `0.0.0.0/0` | Nginx TLS |

Keep **SSH (22)** restricted to your IP if possible.

**Optional hardening after Nginx works:** remove public access to port **8000** (Gunicorn should only listen on `127.0.0.1` anyway).

---

## Step 4 — Django `.env`

On EC2, edit `~/NFLTop100/NFLTop100/.env`:

```env
DJANGO_SECRET_KEY=your-long-random-secret
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,YOUR_EC2_PUBLIC_IP

DATABASE_ENGINE=sqlite
DATABASE_PATH=db.sqlite3
```

Replace `yourdomain.com` with your real domain. Keeping the EC2 IP in `ALLOWED_HOSTS` lets you still test via IP during migration.

Apply later (after WhiteNoise in Step 8):

```bash
cd ~/NFLTop100/NFLTop100
source venv/bin/activate
python manage.py check
```

---

## Step 5 — Gunicorn (systemd)

Stop using `runserver` for production. Gunicorn is already in `requirements.txt`.

### 5.1 Stop screen / runserver (if used)

```bash
sudo fuser -k 8000/tcp
screen -X -S nfl quit 2>/dev/null
```

### 5.2 Create systemd service

```bash
sudo nano /etc/systemd/system/nfl-top100.service
```

```ini
[Unit]
Description=NFL Top 100 Gunicorn
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/NFLTop100/NFLTop100
Environment="PATH=/home/ubuntu/NFLTop100/NFLTop100/venv/bin"
ExecStart=/home/ubuntu/NFLTop100/NFLTop100/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    NFLTop100.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

Bind to **`127.0.0.1:8000`** so only Nginx (on the same machine) reaches the app.

### 5.3 Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable nfl-top100
sudo systemctl start nfl-top100
sudo systemctl status nfl-top100
```

Logs:

```bash
journalctl -u nfl-top100 -f
```

Test locally on EC2:

```bash
curl -I http://127.0.0.1:8000/
```

---

## Step 6 — Nginx (ports 80 / 443)

### 6.1 Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### 6.2 Site configuration

```bash
sudo nano /etc/nginx/sites-available/nfl-top100
```

Replace `yourdomain.com` with your domain:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and disable the default if it conflicts:

```bash
sudo ln -sf /etc/nginx/sites-available/nfl-top100 /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 Test HTTP

From your PC browser: `http://yourdomain.com/`  
You should see the site **without** `:8000`.

If you get **502 Bad Gateway**, check Gunicorn: `sudo systemctl status nfl-top100`.

If you get **400 Bad Request / DisallowedHost**, fix `ALLOWED_HOSTS` in `.env` and restart Gunicorn.

---

## Step 7 — HTTPS (Let's Encrypt)

Install Certbot with the Nginx plugin:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts (email, agree to terms). Certbot updates Nginx for TLS and sets up auto-renewal.

Test renewal:

```bash
sudo certbot renew --dry-run
```

Verify: `https://yourdomain.com/`

---

## Step 8 — `DEBUG=False` and Static Files

With `DEBUG=False`, Django does not serve static files the same way as development. Use **WhiteNoise** (simplest for this project).

### 8.1 Install WhiteNoise (on EC2)

Add to `requirements.txt` on your PC, commit, push, then on EC2 `git pull` and:

```bash
pip install whitenoise>=6.0.0
```

Or add directly on EC2 and commit later:

```text
whitenoise>=6.0.0
```

### 8.2 Update `settings.py` (on your PC, then deploy)

In `INSTALLED_APPS`, ensure `django.contrib.staticfiles` is present (already is).

In `MIDDLEWARE`, add WhiteNoise **immediately after** `SecurityMiddleware`:

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # add this line
    # ... rest unchanged
]
```

Optional production settings (when behind Nginx + HTTPS):

```python
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
```

### 8.3 Collect static on EC2

```bash
cd ~/NFLTop100/NFLTop100
source venv/bin/activate
python manage.py collectstatic --noinput
```

Confirm `staticfiles/` contains `css/`, `js/`, `images/`, etc.

### 8.4 Set `DEBUG=False` and restart

In `.env`:

```env
DEBUG=False
```

```bash
sudo systemctl restart nfl-top100
```

Hard refresh the browser (**Ctrl+F5**). Confirm CSS, JS, and player images load over HTTPS.

### Alternative: Nginx serves `/static/` directly

Skip WhiteNoise and add a `location /static/` block pointing to `/home/ubuntu/NFLTop100/NFLTop100/staticfiles/`. You must run `collectstatic` after every deploy. WhiteNoise is fewer moving parts for this repo size.

---

## Deploying Updates After Go-Live

Same flow as [AWS_DEPLOYMENT_GUIDE.md — Updating the Site Later](./AWS_DEPLOYMENT_GUIDE.md#updating-the-site-later), but restart Gunicorn instead of screen:

```bash
cd ~/NFLTop100 && git pull origin main
cd NFLTop100
source venv/bin/activate
pip install -r requirements.txt
python manage.py collectstatic --noinput
sudo systemctl restart nfl-top100
```

Bump cache busters in `static/index.html` when you change `app.js` or `style.css`.

---

## Checklist

**Domain & DNS**
- [ ] Domain purchased
- [ ] A record `@` → EC2 public IP
- [ ] A record `www` → EC2 public IP (or CNAME)
- [ ] `nslookup yourdomain.com` returns correct IP

**EC2 & Django**
- [ ] Security group allows 80, 443 (and 22 for SSH)
- [ ] `.env` has `ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,...`
- [ ] `DEBUG=False` in `.env` (after static files work)

**Processes**
- [ ] Gunicorn systemd service running (`127.0.0.1:8000`)
- [ ] Nginx installed and site enabled
- [ ] `http://yourdomain.com` works (no port)
- [ ] Certbot HTTPS works
- [ ] `https://yourdomain.com` loads CSS, JS, images

**Optional hardening**
- [ ] Close public port 8000 in security group
- [ ] Plan Elastic IP if you need a stable IP without DNS updates

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| DNS not resolving | Propagation / wrong A record | Wait; verify IP in registrar DNS |
| Connection refused on 80 | Security group or Nginx stopped | Open port 80; `sudo systemctl start nginx` |
| 502 Bad Gateway | Gunicorn down | `sudo systemctl status nfl-top100`; check logs |
| 400 DisallowedHost | Missing host in `ALLOWED_HOSTS` | Update `.env`; restart Gunicorn |
| Site loads but no CSS/images | `DEBUG=False` without WhiteNoise | Add WhiteNoise; `collectstatic`; restart |
| Mixed content warnings | Hard-coded `http://` links | Use relative URLs or `https://` |
| Certbot fails | DNS not pointing to server yet | Fix A record; retry `certbot` |
| IP changed after stop/start | No Elastic IP | Update DNS A record and `ALLOWED_HOSTS` |

---

## Related docs

- [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) — EC2 + SQLite initial deploy
- [.env.production.example](./.env.production.example) — production env template

---

**You’re live on a proper domain** when `https://yourdomain.com` serves the app with TLS, static assets, and Gunicorn behind Nginx — no `:8000` required.

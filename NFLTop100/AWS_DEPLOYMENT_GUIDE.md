# AWS Deployment Guide - NFL Top 100 (SQLite on EC2)

**Last Updated:** May 21, 2026  
**Status:** Beginner guide — 24/7 hosting with SQLite on AWS EC2 (no RDS, no remote MSSQL)

---

## Table of Contents

1. [Overview](#overview)
2. [How This Architecture Works](#how-this-architecture-works)
3. [Part A — Code Changes (Do This First, on Your PC)](#part-a--code-changes-do-this-first-on-your-pc)
4. [Part B — Build the SQLite Database (On Your PC)](#part-b--build-the-sqlite-database-on-your-pc)
5. [Part C — AWS Setup (EC2)](#part-c--aws-setup-ec2)
6. [Part D — Deploy to EC2](#part-d--deploy-to-ec2)
7. [Keeping the Site Running 24/7](#keeping-the-site-running-247)
8. [Updating the Site Later](#updating-the-site-later)
9. [Backing Up SQLite](#backing-up-sqlite)
10. [Cost Breakdown](#cost-breakdown)
11. [Troubleshooting](#troubleshooting)
12. [Next Steps](#next-steps)
13. [Quick Reference](#quick-reference)

---

## Overview

**Goal:** Run the NFL Top 100 site on **AWS EC2** 24/7 so visitors can use it without your PC running.

**Approach:**
- **EC2** runs Django (API + frontend + static player images).
- **SQLite** (`db.sqlite3`) lives on the same EC2 instance — one file holds all player data.
- **No** AWS RDS, **no** SQL Server on the server, **no** connecting AWS to your home MSSQL.

**What stays on your PC (optional):**
- Visual Studio / local development
- MSSQL can remain your **source** when you refresh data, until you fully switch dev to SQLite

**GitHub repo:** `https://github.com/t-manuel2095/NFLTop100.git`

**Repo layout:**

```
NFLTop100/                    ← repo root (GitHub clone → ~/NFLTop100)
├── NFLTop100/                ← Django project root (manage.py here)
│   ├── manage.py
│   ├── requirements.txt      ← same folder as manage.py
│   ├── requirements-local.txt
│   ├── db.sqlite3            ← created locally, copied to EC2 (not committed to git)
│   ├── NFLTop100/settings.py
│   ├── static/
│   └── players/
├── Pipfile
└── README.md
```

On EC2, most commands run from `~/NFLTop100/NFLTop100` (the folder that contains `manage.py`).

---

## How This Architecture Works

| Component | Where it runs | 24/7? |
|-----------|---------------|-------|
| Django (site + API) | EC2 | Yes, if EC2 + process stay up |
| Player data | `db.sqlite3` on EC2 disk | Yes, same as EC2 |
| Player images | `static/images/` in repo on EC2 | Yes (deployed with git) |

**Why SQLite fits this project:**
- Read-only player listings; low write traffic
- No monthly RDS / SQL Server license cost
- Simple deploy: app + one database file on one machine

**Tradeoffs to accept:**
- You **migrate data once** from MSSQL → SQLite (Part B)
- You must **back up** `db.sqlite3` (instance termination without backup loses data)
- Refreshing data from MSSQL later means re-export / replace the file (see [Updating the Site Later](#updating-the-site-later))

---

## Part A — Code Changes (Do This First, on Your PC)

Complete these **before** deploying to AWS. The guide describes *what* to change, not full implementations — edit the files yourself in Visual Studio.

### A1. `NFLTop100/NFLTop100/settings.py` — Database

**Current state:** `DATABASES` points at MSSQL (`ENGINE: mssql`, host, user, password in settings).

**What to change:**
- Support **SQLite for production** (EC2) while you can keep MSSQL for local dev if you want.
- Recommended pattern: read a setting from environment (e.g. `DATABASE_ENGINE` = `sqlite` or `mssql`) and set `DATABASES['default']` accordingly.
- For **SQLite**, use Django’s built-in engine (`django.db.backends.sqlite3`) and set `NAME` to the full path of `db.sqlite3` under the Django project folder (same folder as `manage.py`).
- For **MSSQL** (local dev only), keep your existing connection fields behind the `mssql` branch.
- Load secrets from a **`.env`** file (via `python-dotenv`) so production never hardcodes passwords. Add `.env` to gitignore (already ignored for `*.sqlite3` and `.env` in many setups — confirm `.env` is not committed).

**Production `.env` on EC2:** Use the committed template `NFLTop100/.env.production.example` (copy to `.env` on the server and edit):

| Variable | Value |
|----------|--------|
| `DATABASE_ENGINE` | `sqlite` |
| `DATABASE_PATH` | `db.sqlite3` |
| `DJANGO_SECRET_KEY` | Long random string (not your dev key) |
| `DEBUG` | `False` (`True` only while testing; see static files note in Part D) |
| `ALLOWED_HOSTS` | Your EC2 public IP (add your domain later if you use one) |

Generate a secret key on your PC (PowerShell): `[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()`

**Local `.env` (optional):**
- `DATABASE_ENGINE=mssql` plus your existing MSSQL variables, **or** use SQLite locally too for parity.

**Remove from production path:** Hardcoded `SECRET_KEY`, `DEBUG = True`, and MSSQL password in `settings.py` once `.env` is wired up.

---

### A2. `players/models.py` — Player model

**Current state (SQLite blockers):**
- `db_collation='SQL_Latin1_General_CP1_CI_AS'` on CharFields — **SQL Server only**; remove for SQLite.
- `class Meta: managed = False` — Django will **not** create the table; that was correct for an existing MSSQL `User` table, but SQLite needs Django to manage the schema (or you create tables manually).

**What to change for SQLite:**
1. Remove all `db_collation=...` arguments from CharFields.
2. Set `managed = True` in `Meta` (or remove `managed` so it defaults to True).
3. Keep `db_table = 'User'` if you want the same table name as MSSQL, **or** rename to Django’s default — if you rename, update any raw SQL references (there should be none in this app).
4. Run `makemigrations` / `migrate` after this change (Part B).

**Optional:** Keep two model configs only if you insist on one codebase hitting both DBs with different `managed` flags — usually unnecessary; use MSSQL only until export, then SQLite everywhere on the server.

---

### A3. `requirements.txt`

Two files in the repo:

| File | Where to use |
|------|----------------|
| `requirements.txt` | **EC2** and local SQLite — Django, DRF, filters, CORS, dotenv, gunicorn |
| `requirements-local.txt` | **Your PC only** — includes `requirements.txt` plus `mssql-django` and `pyodbc` for MSSQL dev and Part B export |

**On your PC (MSSQL / before Part B is done):**
```powershell
cd NFLTop100
pip install -r requirements-local.txt
```

**On EC2** (from `~/NFLTop100/NFLTop100`, same folder as `manage.py`):
```bash
pip install -r requirements.txt
```
(Do not install `requirements-local.txt` on the server.)

---

### A4. Env templates (commit these; do not commit `.env`)

| File | Use |
|------|-----|
| `.env.example` | Local dev — copy to `.env`, set `DATABASE_ENGINE=mssql` |
| `.env.production.example` | EC2 — copy to `.env` on the server, set `DATABASE_ENGINE=sqlite` |

| Variable | Local (`.env.example`) | EC2 (`.env.production.example`) |
|----------|----------------------|----------------------------------|
| `DATABASE_ENGINE` | `mssql` | `sqlite` |
| `DJANGO_SECRET_KEY` | any dev key | strong random key |
| `DEBUG` | `True` | `False` when stable |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,*` | EC2 public IP |
| `DATABASE_NAME`, `HOST`, `USER`, `PASSWORD` | MSSQL values | not used |
| `DATABASE_PATH` | `db.sqlite3` | `db.sqlite3` |

**First-time setup on your PC:**

```powershell
cd c:\Users\Manuel\source\repos\NFLTop100\NFLTop100
copy .env.example .env
```

Edit `.env` and set `DATABASE_PASSWORD` (and other MSSQL values if yours differ from the example).

**On EC2 (Part D):** `cp .env.production.example .env`, then set `ALLOWED_HOSTS` and `DJANGO_SECRET_KEY`.

**Status:** Both template files are in the repo. Your real `.env` stays local only (gitignored).

---

### A5. `.gitignore`

These must be ignored at the **repo root** (`.gitignore` in the project root, not inside `NFLTop100/`):

| Pattern | Why |
|---------|-----|
| `db.sqlite3` / `*.sqlite3` | Production DB file — copy to EC2 with **SCP**, not git |
| `.env` | Secrets (passwords, `DJANGO_SECRET_KEY`) |
| `venv/`, `env/` | Local virtual environments |
| `__pycache__/`, `*.pyc` | Python cache |
| `staticfiles/` | Output of `collectstatic` on server/PC |

**Verify on your PC (PowerShell, from repo root):**

```powershell
cd c:\Users\Manuel\source\repos\NFLTop100
git check-ignore -v NFLTop100\.env NFLTop100\db.sqlite3
```

Each path should print a matching `.gitignore` rule. If not, fix `.gitignore` before committing.

**Commit:** `players/migrations/*.py` should **not** be ignored (only `**/migrations/__pycache__/`). Migrations are needed on EC2 for SQLite.

**Status:** Root `.gitignore` includes all patterns above.

---

### A6. Checklist before Part B

- [x] Settings can switch to SQLite via env (`DATABASE_ENGINE=sqlite` in `.env` or shell; `python manage.py check` passes)
- [x] `Player` model has no MSSQL collations; `managed = True`
- [x] `.env.example` and `.env.production.example` in repo
- [x] Local `.env` created from `.env.example` (not committed)
- [x] Root `.gitignore` covers `.env`, `*.sqlite3`, `venv/`, `__pycache__/`, `staticfiles/`
- [x] Secrets not committed — `git status` does not list `.env` or `db.sqlite3`; `git ls-files` does not track them

**Verify secrets (PowerShell, repo root):**

```powershell
cd c:\Users\Manuel\source\repos\NFLTop100
git status
git ls-files "*env*" "*sqlite*"
```

Only `NFLTop100/.env.example` and `NFLTop100/.env.production.example` should appear in `ls-files`, not `.env` or `db.sqlite3`.

**Part A complete.** Commit pending changes, then start [Part B](#part-b--build-the-sqlite-database-on-your-pc).

---

## Part B — Build the SQLite Database (On Your PC)

Do this **after** Part A model/settings work.

### B1. Create schema in SQLite

1. Set your local `.env` to use SQLite (or temporarily point settings at SQLite).
2. From `NFLTop100/NFLTop100` (folder with `manage.py`), with venv active:
   - Run migrations for the `players` app so the `User` table exists in a new `db.sqlite3`.

### B2. Copy player data from MSSQL

**Option 1 — Django dumpdata / loaddata (recommended):**
1. Switch `.env` back to MSSQL (if needed).
2. Export player records to a JSON fixture (players app / Player model).
3. Switch `.env` to SQLite again.
4. Run migrations if not already done.
5. Load the fixture into SQLite.

**Option 2 — External tool:** Export from SSMS to CSV and import with a script you write — more work; only if dumpdata fails.

### B3. Verify locally

1. `python manage.py check`
2. `python manage.py runserver`
3. Open `http://localhost:8000/` — players load, filters work.
4. Test API in Insomnia: `GET http://localhost:8000/api/players/`

### B4. Note file location

`db.sqlite3` should sit next to `manage.py` (unless your settings put it elsewhere). You will upload **this exact file** to EC2 in Part D.

---

## Part C — AWS Setup (EC2)

### C1. Log into AWS Console

1. Go to `https://aws.amazon.com` → **Sign In to the Console**

### C2. Launch an EC2 instance

1. Search **EC2** → **Launch Instance**
2. **Name:** `nfl-top100`
3. **OS:** Ubuntu LTS (free tier eligible)
4. **Instance type:** `t3.micro` or `t2.micro`
5. **Key pair:** Create `nfl-top100-key` (`.pem` for OpenSSH / PowerShell SSH)
6. **Security group** `nfl-top100-sg`:

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | My IP (preferred) | Your PC → server |
| Custom TCP | 8000 | 0.0.0.0/0 | HTTP to Django (later use 80/443 + Nginx) |

7. **Storage:** 8 GiB minimum; use **20–30 GiB** if the repo + images + SQLite are tight on space
8. **Launch** → wait for **running** → copy **Public IPv4 address**

---

## Part D — Deploy to EC2

### D1. Connect from Windows (PowerShell)

```powershell
cd C:\path\to\your\key
icacls nfl-top100-key.pem /inheritance:r
icacls nfl-top100-key.pem /grant:r "$($env:USERNAME):(R)"
ssh -i nfl-top100-key.pem ubuntu@YOUR_PUBLIC_IP_ADDRESS
```

### D2. Install packages on Ubuntu (no SQL Server drivers)

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git
```

### D3. Clone the repository

```bash
cd ~
git clone https://github.com/t-manuel2095/NFLTop100.git
cd NFLTop100/NFLTop100
```

### D4. Python virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

(`gunicorn` is already listed in `requirements.txt`. Do not install `requirements-local.txt` on the server.)

### D5. Copy `db.sqlite3` from your PC to EC2

**From a new PowerShell window on your PC** (not inside SSH):

```powershell
scp -i C:\path\to\nfl-top100-key.pem C:\Users\Manuel\source\repos\NFLTop100\NFLTop100\db.sqlite3 ubuntu@YOUR_PUBLIC_IP_ADDRESS:~/NFLTop100/NFLTop100/db.sqlite3
```

Adjust the local path if your `db.sqlite3` lives elsewhere.

On EC2, confirm the file exists:

```bash
ls -la ~/NFLTop100/NFLTop100/db.sqlite3
```

### D6. Create `.env` on EC2

The repo includes `.env.production.example` with the correct production variables.

```bash
cd ~/NFLTop100/NFLTop100
cp .env.production.example .env
nano .env
```

Replace:
- `YOUR_EC2_PUBLIC_IP` → your instance’s public IPv4 (same IP you use in the browser)
- `replace-with-a-long-random-string` → a new `DJANGO_SECRET_KEY` (do not reuse your dev key)

For first deploy testing only, you may set `DEBUG=True` in `.env`, then switch to `DEBUG=False` after the site works.

Save: `Ctrl+X`, `Y`, `Enter`.

### D7. Django checks and static files

```bash
source venv/bin/activate
python manage.py check
python manage.py collectstatic --noinput
```

**Static files note:** With `DEBUG=False`, Django may not serve `/static/` the same way as dev. For first deploy, `DEBUG=True` in `.env` is easiest. For production hardening, add WhiteNoise or Nginx ([Next Steps](#next-steps)).

### D8. Smoke test

```bash
python manage.py runserver 0.0.0.0:8000
```

From your browser:
- `http://YOUR_PUBLIC_IP:8000/`
- `http://YOUR_PUBLIC_IP:8000/api/players/`

Stop with `Ctrl+C`, then set up 24/7 below.

---

## Keeping the Site Running 24/7

### Option 1 — screen (simple)

```bash
sudo apt install -y screen
cd ~/NFLTop100/NFLTop100
source venv/bin/activate
screen -S nfl
python manage.py runserver 0.0.0.0:8000
```

Detach: `Ctrl+A`, then `D`  
Reattach: `screen -r nfl`

### Option 2 — systemd + Gunicorn (recommended)

1. Create `/etc/systemd/system/nfl-top100.service` with:
   - `User=ubuntu`
   - `WorkingDirectory=/home/ubuntu/NFLTop100/NFLTop100`
   - `ExecStart=` path to `venv/bin/gunicorn` binding `0.0.0.0:8000` to `NFLTop100.wsgi:application`

2. Run:
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable nfl-top100`
   - `sudo systemctl start nfl-top100`
   - `sudo systemctl status nfl-top100`

3. Logs: `journalctl -u nfl-top100 -f`

---

## Updating the Site Later

Two paths: **code/static** (git) or **player data** (`db.sqlite3` via SCP). `git pull` does **not** update the database.

---

### Code or images (git)

Use when you change Python, `app.js`, `style.css`, or files under `static/images/`.

1. **On PC:** commit and `git push`
2. **On EC2:**
   - `cd ~/NFLTop100 && git pull origin main`
   - `cd NFLTop100 && source venv/bin/activate`
   - `pip install -r requirements.txt` (if dependencies changed)
   - `python manage.py collectstatic --noinput`
   - Restart (see below)

**Restart — if using screen:**

```bash
sudo fuser -k 8000/tcp
screen -X -S nfl quit 2>/dev/null
screen -dmS nfl bash -c 'cd ~/NFLTop100/NFLTop100 && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000'
```

**Restart — if using systemd + Gunicorn:**

```bash
sudo systemctl restart nfl-top100
```

**After deploy:** hard refresh in the browser (**Ctrl+F5**) so cached `app.js` updates.

**Do not commit:** `.env`, `db.sqlite3`, `players_fixture.json`.

**If you added Django migrations:** run `python manage.py migrate` on EC2 after pull.

---

### Player data (still maintained in MSSQL locally)

Use when player rows change in MSSQL and production needs the new data.

1. **On PC:** Re-run [Part B](#part-b--build-the-sqlite-database-on-your-pc) (export from MSSQL → load into `db.sqlite3`)
2. **Copy to EC2** (PowerShell — quote paths with spaces):

```powershell
scp -i "C:\Users\Manuel\AWS Keys\NFLTop100.pem" `
  "C:\Users\Manuel\source\repos\NFLTop100\NFLTop100\db.sqlite3" `
  ubuntu@YOUR_PUBLIC_IP:~/NFLTop100/NFLTop100/db.sqlite3
```

3. **On EC2:** Confirm file exists (`ls -la ~/NFLTop100/NFLTop100/db.sqlite3`), then restart screen or Gunicorn (same commands as above). No `collectstatic` needed.

Do **not** rely on git for `db.sqlite3` (it is gitignored).

---

## Backing Up SQLite

**Why:** If the EC2 instance is terminated or the volume fails, you lose `db.sqlite3` unless you have a copy.

**Options:**
1. **Manual:** Periodically `scp` from EC2 to your PC:
   - `scp -i key.pem ubuntu@PUBLIC_IP:~/NFLTop100/NFLTop100/db.sqlite3 C:\Backups\nfl-db.sqlite3`
2. **EBS snapshot:** AWS console → EC2 → Volumes → snapshot the root/data volume
3. **After local MSSQL updates:** Keep the canonical export on your PC and re-upload when data changes

---

## Cost Breakdown

**Free tier (first 12 months, typical):**
- t2/t3.micro EC2 ~750 hrs/month (enough for 24/7)
- EBS storage within free allowance

**After free tier:** often **~$8–10/month** for EC2 only — **no RDS bill**

Optional: Route 53 domain ~$12/year

---

## Troubleshooting

### Site loads but no players / API errors

- Confirm `db.sqlite3` exists on EC2 in the same path your settings expect
- `python manage.py check` on EC2
- `python manage.py dbshell` → try `SELECT COUNT(*) FROM User;` (or your table name)
- `.env` has `DATABASE_ENGINE=sqlite`

### `db.sqlite3` missing after deploy

- Re-run `scp` from Part D5
- Check file permissions: readable by `ubuntu`

### Static files or images 404

- `git pull` includes `static/images/`
- Run `collectstatic`
- If `DEBUG=False`, configure WhiteNoise or Nginx

### Cannot SSH

- Security group allows port 22 from your IP
- Correct `.pem` and public IP
- Instance is **running**

### EC2 disk full

- Large `static/images/` tree; increase EBS volume size in AWS console

### Still using MSSQL settings on EC2 by mistake

- EC2 `.env` must use SQLite, not MSSQL host/password
- Do not install ODBC / SQL Server drivers unless you intentionally switch back

---

## Next Steps

| Phase | Items |
|-------|--------|
| **Now** | Part A code changes → Part B SQLite file → Part C/D AWS deploy |
| **Hardening** | `DEBUG=False`, WhiteNoise, Nginx on port 80, HTTPS (Let’s Encrypt) |
| **Optional** | Custom domain (Route 53), S3/CloudFront for images if repo size hurts deploys |
| **Not needed for 24/7** | RDS SQL Server (only if you return to cloud MSSQL as source of truth) |

---

## Quick Reference

| Task | Command / location |
|------|-------------------|
| SSH | `ssh -i nfl-top100-key.pem ubuntu@PUBLIC_IP` |
| Project dir | `~/NFLTop100/NFLTop100` |
| Database file | `~/NFLTop100/NFLTop100/db.sqlite3` |
| Activate venv | `source venv/bin/activate` |
| Check app | `python manage.py check` |
| Collect static | `python manage.py collectstatic --noinput` |
| Copy DB to EC2 | `scp` from PC (Part D5) |
| Restart service | `sudo systemctl restart nfl-top100` |

**URLs:**
- Home: `http://PUBLIC_IP:8000/`
- API: `http://PUBLIC_IP:8000/api/players/`

---

## Deployment checklist (end-to-end)

**On your PC**
- [ ] Part A: settings, models, `.env.example`, gitignore
- [ ] Part B: `db.sqlite3` built and tested locally
- [ ] Code pushed to GitHub (excluding `.env` and `db.sqlite3`)

**AWS**
- [ ] EC2 launched, ports 22 + 8000, public IP saved
- [ ] Repo cloned, venv + requirements installed
- [ ] `db.sqlite3` copied via `scp`
- [ ] `.env` on EC2 with SQLite + `ALLOWED_HOSTS`
- [ ] `check` + `collectstatic` pass
- [ ] Site works in browser
- [ ] screen or systemd keeps app running 24/7
- [ ] Backup plan for `db.sqlite3`

---

**You're deployed!** EC2 serves the app 24/7; SQLite on the same machine holds player data with no home PC or RDS required.

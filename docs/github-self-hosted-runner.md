# GitHub self-hosted runner on AWS EC2

Deploy runs **on your EC2 machine** via a GitHub Actions self-hosted runner. On every push to `main`, the workflow checks out code on the server, builds Docker, runs migrations, and restarts the app — no SSH or rsync from GitHub-hosted runners.

## Architecture

```mermaid
flowchart LR
  push[Push to main] --> gh[GitHub Actions]
  gh --> runner[Self-hosted runner on EC2]
  runner --> docker[Docker build + migrate]
  docker --> app[arteria-landing :3000]
```

## Admin uploads (413 errors)

If media upload fails with **413**, Nginx in front of the app is likely limiting body size. See [nginx-upload-limit.md](./nginx-upload-limit.md) (`client_max_body_size 50M;`).

## 1) EC2 prerequisites

- Ubuntu 22.04 or 24.04
- Security group: inbound `22` (SSH), `80`/`443` if using Nginx, `3000` only if you expose the app directly
- A PostgreSQL database reachable from the instance (e.g. RDS or Neon)

SSH into the server:

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

## 2) Install the runner (one time)

Follow GitHub’s UI — no repo script required.

1. Open [Actions → Runners](https://github.com/farkhad99/arteria-landing/settings/actions/runners)
2. **New self-hosted runner** → **Linux** → **x64**
3. On EC2, run the commands GitHub shows (download, `./config.sh`, `./svc.sh install`)

Typical flow:

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# curl + tar from GitHub’s runner page (version in UI)
./config.sh --url https://github.com/farkhad99/arteria-landing --token <TOKEN>
sudo ./svc.sh install ubuntu
sudo ./svc.sh start
```

Install Docker on the same machine (see [Install Docker manually](#install-docker-manually-on-ec2)), then restart the runner.

Verify in GitHub: runner status **Idle**, label **self-hosted**.

## 3) GitHub secrets

Add each credential as its own repository secret (not a single env file). Full list: **[deploy.md](./deploy.md#secrets)**.

Minimum required: `WEBSITE_URL`, `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`; for admin uploads `BLOB_READ_WRITE_TOKEN`, for Telegram notifications `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. See [deploy.md](./deploy.md#secrets).

## 4) Trigger deploy

- **Manual:** Actions → **Deploy to EC2** → **Run workflow**
- **Automatic (optional):** add `push: branches: [main]` to `.github/workflows/deploy-ec2.yml`

Deploy job uses:

```yaml
runs-on: self-hosted
```

If deploy stays on **“Waiting for a runner”**, check **Settings → Actions → Runners**: status must be **Idle** (not Offline), and the runner must be registered on **this repository** (not only another org/repo).

## 5) Verify

On EC2:

```bash
docker ps
curl -I http://127.0.0.1:3000
```

In the browser: `http://<EC2_IP>:3000` or your domain behind Nginx.

Admin: `/admin` (password from `ADMIN_PASSWORD`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Job queued, never starts | Runner **Offline** or **wrong labels** — use `runs-on: self-hosted` in workflow; `sudo ./svc.sh restart` on EC2 |
| Waiting for a runner… | Runner offline, wrong repo, or missing label `arteria-landing` — simplify to `runs-on: self-hosted` or add labels on the runner in GitHub |
| `docker: command not found` (exit 127) | Install Docker on EC2 and restart the runner (see below) |

### Install Docker manually on EC2

SSH in, then run **all** of this:

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable --now docker

# Allow the runner user to use Docker (default: ubuntu)
sudo usermod -aG docker ubuntu

# Restart GitHub runner so group membership applies
cd /home/ubuntu/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start

# Must succeed before re-running Actions:
sudo -u ubuntu docker ps
sudo -u ubuntu docker run --rm hello-world
```

If `docker ps` works as `ubuntu` but Actions still fails, reboot EC2 once: `sudo reboot` (then wait and re-run the workflow).

Then in GitHub: **Actions → Deploy to EC2 → Re-run failed jobs**.

### Verify Docker step fails (exit 1)

| Symptom in log | Fix |
|----------------|-----|
| `docker not found` | Run `apt install docker.io` above |
| `cannot use it` / permission | `usermod -aG docker ubuntu` + **restart runner service** (or reboot) |
| `permission denied` on Docker | `sudo usermod -aG docker ubuntu`, re-login, restart runner service |
| `Missing required secret/env` | Add the named secret in GitHub repo settings (see deploy.md) |
| Build fails on DB | Ensure `DATABASE_URL` is reachable from EC2 (RDS security group allows EC2 SG on port 5432) |
| `no space left on device` during Docker build | EC2 root volume full — see [Disk space](#disk-space-docker-build-fails) below |
| `prisma_schema_build_bg.wasm` / `prisma: not found` on migrate | Migrations run in the **builder** image (`arteria-landing-builder`), not the slim runtime image — redeploy with latest workflow |
| Re-register runner | New token from GitHub → `./config.sh` again with `--replace` on EC2 |

### Disk space (Docker build fails)

Each deploy builds images on the server. Small EC2 volumes (8–20 GB) fill up with old layers and build cache.

**One-time cleanup on EC2 (SSH):**

```bash
df -h /
docker system prune -af
docker builder prune -af
df -h /
```

If still tight, remove unused images only: `docker images` then `docker rmi <old-image-id>`.

**Longer term:** use a **30 GB+** root volume, or attach a larger EBS volume. The repo now uses a **standalone** Docker image (smaller than copying full `node_modules`) and the workflow prunes Docker before each build.

**Do not** add `docker build --no-cache` unless debugging — it doubles disk use every deploy.

## Optional: Nginx + HTTPS

Terminate TLS on Nginx and proxy to `127.0.0.1:3000`. Do not expose port 3000 publicly if Nginx handles `443`.

## Pull requests

PRs run only the **ci** job (lint + build). **deploy** is skipped until merge to `main`.

# Deploying chumkosoft on an Ubuntu server

The whole stack runs in Docker Compose. Beyond Docker itself you mainly need to
supply real secrets, expose the app over HTTPS (a Cloudflare Tunnel), and create
the first admin. This runbook covers a clean server end to end.

## 1. Install Docker (Engine + Compose plugin)

Use Docker Engine, not Docker Desktop, on a server:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in so the group applies
docker compose version            # confirm the compose plugin is present
sudo systemctl enable --now docker
```

## 2. Get the code + generate secrets

```bash
git clone <your-repo-url> chumkosoft && cd chumkosoft
./scripts/gen-prod-env.sh          # writes .env.production (chmod 600) with fresh secrets
```

Then edit `.env.production` and fill the deployment-specific blanks:

- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` — from the LINE console.
- `CLOUDFLARE_TUNNEL_TOKEN` — see step 3.
- `APP_ALLOWED_ORIGINS` — your public hostname, e.g. `school.example.com` (no scheme).
- `MINIO_PUBLIC_ENDPOINT` — the host browsers use to load face images (step 3).

Finally: `cp .env.production .env` (Compose and Prisma read `.env`).

> Secrets already generated for you: `SESSION_SECRET` (JWT signing) and strong
> passwords for Postgres / Redis / MinIO. Never commit `.env*`.

## 3. Public HTTPS with a Cloudflare Tunnel

HTTPS is **required** — the face-scan kiosk needs it for camera access, and the
tunnel means **no inbound port is ever opened** (it dials out to Cloudflare).

1. Cloudflare Zero Trust → **Networks → Tunnels → Create a tunnel** (Cloudflared).
2. **Public Hostname** → your domain/subdomain → Service `HTTP` → URL `app:3000`.
3. (For face images) add a **second Public Hostname** `files.<domain>` →
   Service `HTTP` → URL `minio:9000`, then in `.env` set
   `MINIO_PUBLIC_ENDPOINT=files.<domain>`, `MINIO_PUBLIC_PORT=443`,
   `MINIO_PUBLIC_USE_SSL=true`.
4. Copy the tunnel **token** into `.env` (`CLOUDFLARE_TUNNEL_TOKEN`).

A domain on Cloudflare is required for a stable URL. To try it first without a
domain, run a throwaway tunnel (random URL, changes each run):
`docker compose run --rm --no-deps cloudflared tunnel --url http://app:3000`
and set `APP_ALLOWED_ORIGINS="*.trycloudflare.com"` before building.

## 4. Bring the stack up (production overlay)

The prod overlay closes the DB/Redis/MinIO host ports, binds the app to
loopback, adds log rotation, and applies migrations **without** seeding dev
accounts:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile tunnel up -d --build
```

## 5. Create the first admin (prod has no seeded accounts)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm --no-deps \
  -e ADMIN_EMAIL=you@school.ac.th -e ADMIN_PASSWORD='a-strong-password' \
  migrate sh -c "npx tsx scripts/create-admin.ts"
```

Log in at `https://<your-hostname>/login`, then create teacher/kiosk accounts
from the UI. Register the LINE webhook at `https://<your-hostname>/api/line/webhook`.

## 6. Automatic checks and deploys

`.github/workflows/ci.yml` runs lint and TypeScript checks on pull requests and
pushes to `main`, using a GitHub-hosted runner. After checks pass, pushes to
`main` deploy automatically through Cloudflare Access SSH. The deployment
workflow does not run on pull requests. It uses a restricted SSH key that can
only invoke the server-side deploy script.

One-time setup:

1. **Publish SSH through the existing Cloudflare Tunnel.** In Cloudflare Zero
   Trust → Networks → Tunnels, open the current tunnel and add a Published
   application route with hostname `ssh.chumkosoft.com` and service
   `ssh://192.168.1.183:22`. Do not open port 22 on the router or firewall.
2. **Protect that hostname with Access.** Create a self-hosted Access
   application for `ssh.chumkosoft.com`. Create a service token, then add a
   `Service Auth` policy that allows only that token.
3. **Create a dedicated deploy key on the Mac.** Run
   `ssh-keygen -t ed25519 -C github-actions-chumkosoft -f ~/.ssh/chumkosoft-deploy`
   and leave the passphrase empty. Keep the private key on the Mac; only add it
   to the GitHub Action secret in step 6.
4. **Install the restricted deploy command on Ubuntu.** After this change is
   pulled to the server, run:
   ```bash
   cd ~/chumkosoft
   sudo install -o root -g root -m 0755 scripts/deploy-production.sh /usr/local/sbin/chumkosoft-deploy
   printf '%s\n' 'chumkosoft ALL=(root) NOPASSWD: /usr/local/sbin/chumkosoft-deploy' | sudo tee /etc/sudoers.d/chumkosoft-deploy
   sudo chmod 0440 /etc/sudoers.d/chumkosoft-deploy
   sudo visudo -cf /etc/sudoers.d/chumkosoft-deploy
   mkdir -p ~/.ssh && chmod 0700 ~/.ssh
   ```
   Append the public key from `~/.ssh/chumkosoft-deploy.pub` to
   `/home/chumkosoft/.ssh/authorized_keys` with this prefix, keeping the key on
   the same line:
   `command="sudo -n /usr/local/sbin/chumkosoft-deploy",restrict `
   Then run `chmod 0600 ~/.ssh/authorized_keys`. This key cannot open an
   interactive shell or forward ports; it can only run the deploy script.
5. **Add four GitHub Actions secrets.** In the repository, open **Settings →
   Secrets and variables → Actions → New repository secret**:
   - `CF_ACCESS_CLIENT_ID` — the Cloudflare service token Client ID.
   - `CF_ACCESS_CLIENT_SECRET` — the matching Client Secret.
   - `DEPLOY_SSH_PRIVATE_KEY` — the contents of `~/.ssh/chumkosoft-deploy` on
     the Mac (never paste it into chat or commit it).
   - `DEPLOY_SSH_KNOWN_HOSTS` — one line in the form
     `ssh.chumkosoft.com ssh-ed25519 <server-host-public-key>`. On Ubuntu, read
     the public host key with
     `sudo cat /etc/ssh/ssh_host_ed25519_key.pub`.
6. After the route, key, server script, and four secrets are ready, set the
   repository variable `ENABLE_PRODUCTION_DEPLOY` to `true` under **Settings →
   Secrets and variables → Actions → Variables**. Until this variable is set,
   pushes run validation but cannot start a deployment.
7. In **Actions → CI**, run the workflow manually on `main` once to deploy the
   current version. After that, every push to `main` deploys automatically once
   validation passes. Pull requests run validation only.

The workflow keeps `.env` on Ubuntu and does not copy database or application
secrets to GitHub. If deployment fails its local `/login` health check, the
workflow stops and reports failure; inspect `sudo docker compose -f
docker-compose.yml -f docker-compose.prod.yml -f docker-compose.rustfs.yml
--profile tunnel logs --tail=80 app` on the server.

## 7. Operate

- **Update**: `git pull` then re-run the step-4 command (rebuilds, re-migrates, no downtime for infra).
- **Backups**: dump Postgres and the MinIO volume on a schedule, e.g.
  ```bash
  docker compose exec -T postgres pg_dump -U chumko chumkosoft | gzip > backup-$(date +%F).sql.gz
  ```
  and back up the `minio_data` volume (`/var/lib/docker/volumes/chumkosoft_minio_data`).
- **Firewall**: with the tunnel you only need SSH open — `sudo ufw allow OpenSSH && sudo ufw enable`.
- **Resources**: ~2 GB RAM is comfortable; on a small box add swap or build the
  image elsewhere and `docker compose pull` instead of `--build`.
- **Logs**: `docker compose logs -f app` (rotated at 10 MB × 3 by the overlay).

## Notes / gotchas

- The session cookie is `Secure` in production, so log in over the HTTPS
  hostname — not `http://<server-ip>:3000`.
- `APP_ALLOWED_ORIGINS` is read at **build** time; rebuild the app image after
  changing it (`... up -d --build`).
- Never run the dev seed in production (`prisma db seed` creates the well-known
  `admin@chumko.ac.th / password123` account). The prod overlay already skips it.

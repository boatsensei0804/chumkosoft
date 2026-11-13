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
  `LINE_CHANNEL_ACCESS_TOKEN` must contain the issued token from the Messaging
  API channel, not its numeric Channel ID. After changing `.env`, recreate the
  app container so it loads the new value. Never paste the token in chat or Git.
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

### Daily LINE summary for homeroom advisors

The admin saves the LINE OA add-friend link under **System settings**. The
admin opens **LINE / แจ้งเตือน → ดูสถานะ LINE ครู**, generates a six-digit
code for each teacher, and gives that code to the teacher. Each teacher opens
**LINE ของฉัน**, adds the school's LINE OA, and sends the code in the private
chat with that OA. The teacher page
updates its status automatically; the admin can see all staff statuses under
**LINE / แจ้งเตือน → ดูสถานะ LINE ครู**. Adding the OA as a friend alone does not
identify the teacher: the code must be sent and processed by the webhook.
Their staff account must be assigned as a classroom advisor to receive a daily
room summary.

### Parent leave requests and conduct points

After linking LINE to a student, a parent sends a private message such as
`ลา 68-0421 ป่วย 14/11/2569 ถึง 15/11/2569 มีไข้` to the OA. For one day,
omit `ถึง <last date>`. The active term must contain every requested day.
For a no-typing flow, add a **แจ้งลา** button in the OA rich menu using
LINE Official Account Manager. Set the button action to **Message** and its
text to exactly `แจ้งลา`. Tapping it opens quick replies for the linked student,
leave type, start/end dates, preset reason, and final confirmation. Rich menus
are displayed in LINE's mobile app; the parent must have linked their LINE
account to a student first. If the OA's rich menu was created with the Messaging
API, edit it through that API instead of LINE Official Account Manager.
The website shows pending requests under **คำขอลา**; classroom advisors or
admins review them. Approval records sick or personal leave in daily attendance
and sends the result to the requesting LINE account. A teacher's LINE message
is sent only when that teacher has linked LINE and is assigned to the classroom.
The admin can retry an unsent advisor notification on the requests page. The
app reports if a parent result message fails to send.

Under **คะแนนความประพฤติ**, each active-term student starts at 100 points.
New school gate late check-ins deduct 10 points per student per day, while
teachers and admins can add or deduct points with a reason. The ledger is
separate for each term. Existing historical late check-ins are not backfilled.

An admin sets the delivery time in **System settings → LINE advisor summary**
in half-hour increments (Bangkok time). The GitHub workflow
`advisor-line-digest.yml` checks every 30 minutes using the production
self-hosted runner; the app sends once per advisor on weekdays at or after the
configured time. Generate one random secret (for example with
`openssl rand -hex 32`), put the same value in `ADVISOR_LINE_DIGEST_SECRET`
in the server's `.env` and in the repository's GitHub Actions secret of the
same name. Recreate the app container so it reads the new environment value.
Keep the secret out of Git and chat. The endpoint returns 401 until configured;
Redis records which teachers have already received that day's summary.

### School-wide LINE announcements

An admin can open **Send LINE announcement** in the dashboard to send news or
emergency notices. The recipient list is a snapshot of unique LINE user IDs
linked to non-deleted students (through guardian or student LINE records) and
non-deleted staff. It does not include every friend of the LINE Official Account.
The page shows the recipient count and requires a final review before sending.
LINE's monthly message quota still applies. A history entry records how many
recipients LINE accepted; acceptance is not proof that a person read the message.
If a batch fails, the admin can retry it from the history without changing the
recipients or message. LINE retry keys prevent duplicates after uncertain errors.
If history says `LINE รับแล้ว 0/N` and `HTTP_401` or `HTTP_403`, the Messaging
API rejected the server's `LINE_CHANNEL_ACCESS_TOKEN`. Generate a fresh Channel
access token from the **same** LINE Messaging API channel as the OA, update the
server's private `.env` without pasting the token in chat or Git, recreate the
app container, then use **ลองส่งต่อ** on the existing announcement. The server
user can verify the token without displaying it by requesting LINE's bot info
endpoint and reading only the HTTP status. A 200 response means the token is
accepted; it does not prove delivery to each individual recipient.

## 6. Automatic checks and deploys

`.github/workflows/ci.yml` runs lint and TypeScript checks on pull requests and
pushes to `main` using GitHub-hosted runners. After checks pass, pushes to
`main` deploy on a dedicated self-hosted runner installed on the Ubuntu server.
Pull requests never run on the self-hosted runner.

One-time setup:

1. **Create a dedicated runner account on Ubuntu.** This runner should only be
   registered to this private repository and should not belong to the `docker`
   group. It will be allowed to run exactly one root-owned deploy command using
   `sudo`; do not run the GitHub runner as root. Create it with:
   ```bash
   sudo adduser --disabled-password --gecos "" ghrunner
   ```
2. **Install the restricted deploy command.** After this change is pulled to
   the server, run:
   ```bash
   cd ~/chumkosoft
   sudo install -o root -g root -m 0755 scripts/deploy-production.sh /usr/local/sbin/chumkosoft-deploy
   printf '%s\n' 'ghrunner ALL=(root) NOPASSWD: /usr/local/sbin/chumkosoft-deploy' | sudo tee /etc/sudoers.d/chumkosoft-deploy
   sudo chmod 0440 /etc/sudoers.d/chumkosoft-deploy
   sudo visudo -cf /etc/sudoers.d/chumkosoft-deploy
   ```
   Replace `ghrunner` with the actual dedicated runner account if you chose a
   different name.
3. **Install the GitHub Actions runner as a service.** In GitHub, open
   **Settings → Actions → Runners → New self-hosted runner**, select Linux and
   the server architecture, then follow GitHub's commands on Ubuntu. Use the
   labels `self-hosted`, `linux`, `x64`, and `chumkosoft-prod`. Configure it
   under the dedicated runner account, install it as a service, and start it.
   Do not put the one-time registration token in a file or share it. Keep this
   runner restricted to this repository, and do not enable it for pull requests.
4. Confirm the runner appears **Idle** under repository **Settings → Actions →
   Runners**. Ensure its service restarts after a reboot.
5. Once the runner and server command are ready, set repository variable
   `ENABLE_PRODUCTION_DEPLOY` to `true` under **Settings → Secrets and
   variables → Actions → Variables**. Until this variable is set, pushes run
   validation but cannot start a deployment.
6. In **Actions → CI**, run the workflow manually on `main` once to deploy the
   current version. After that, every push to `main` deploys automatically once
   validation passes. Pull requests run validation only.

### Publish the LINE leave rich menu through GitHub Actions

The `Publish LINE rich menu` job runs on a GitHub-hosted runner, so the Mac does
not need access to the Ubuntu server. In repository **Settings → Secrets and
variables → Actions → Repository secrets**, create the secret
`LINE_CHANNEL_ACCESS_TOKEN` with the long-lived token from the Chumkosoft School
Messaging API channel. Keep the token out of Git, screenshots, and chat.

Then open **Actions → CI → Run workflow** on `main`. The job validates the OA's
basic ID, validates the menu, uploads the image, and sets it as the default.
It is safe to rerun: an existing menu is reused. If the secret is absent, the
job prints that publication was skipped. Once configured, future pushes to
`main` keep the rich menu published. The menu appears in the LINE mobile chat
after reopening it; LINE may take up to a minute to apply a default-menu change.

Staff can use **LINE → สร้างชุดเอกสาร A4 → ดาวน์โหลด PDF ทุกห้อง** to prepare
missing link codes and download one PDF. The PDF starts a fresh page for each
classroom and includes the LINE OA QR code and pending link codes.

The runner works on the production server, so only trusted maintainers should
be able to change or run workflows on `main`. The runner account must not have
general Docker access; only the root-owned deploy script gets elevated
privileges. The workflow keeps `.env` on Ubuntu and does not copy database or
application secrets to GitHub. If deployment fails its local `/login` health
check, the workflow stops and reports failure; inspect `sudo docker compose -f
docker-compose.yml -f docker-compose.prod.yml -f docker-compose.rustfs.yml
--profile tunnel logs --tail=80 app` on the server.

Do not register this runner if the repository is public. GitHub warns that
pull requests against public repositories can be modified to run malicious code
on self-hosted runners. Confirm the repository is private before proceeding.

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

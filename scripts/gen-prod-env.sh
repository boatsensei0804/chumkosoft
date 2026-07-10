#!/usr/bin/env bash
# Generates a production .env with strong, freshly-random secrets.
#
#   ./scripts/gen-prod-env.sh                 # writes .env.production
#   ./scripts/gen-prod-env.sh --force         # overwrite if it already exists
#   ./scripts/gen-prod-env.sh /path/to/.env   # custom output path
#
# It fills every generated secret (DB / Redis / MinIO passwords, SESSION_SECRET)
# and leaves the deployment-specific blanks (LINE, Cloudflare, your domain, the
# MinIO public endpoint) for you to complete. Never commit the result.
set -euo pipefail

OUT="${1:-.env.production}"
[ "${1:-}" = "--force" ] && { OUT=".env.production"; FORCE=1; }
[ "${2:-}" = "--force" ] && FORCE=1
FORCE="${FORCE:-0}"

if [ -e "$OUT" ] && [ "$FORCE" != "1" ]; then
  echo "refusing to overwrite existing $OUT (pass --force to replace)" >&2
  exit 1
fi

# hex secrets are URL-safe (embed cleanly in DATABASE_URL / REDIS_URL).
PG_PASS="$(openssl rand -hex 24)"
REDIS_PASS="$(openssl rand -hex 24)"
MINIO_PASS="$(openssl rand -hex 24)"
SESSION_SECRET="$(openssl rand -base64 32)"

PG_USER="chumko"
PG_DB="chumkosoft"
MINIO_USER="chumko"
MINIO_BUCKET="chumkosoft"

cat > "$OUT" <<EOF
# chumkosoft — production environment. Generated $(date -u +%Y-%m-%dT%H:%M:%SZ).
# SECRETS INSIDE — never commit. Keep file perms tight (chmod 600).

# ── PostgreSQL ─────────────────────────────────────────────
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=${PG_DB}
# Host-side Prisma only; the app/migrate containers build their own URL from the
# vars above and reach postgres over the compose network.
DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@localhost:5432/${PG_DB}?schema=public"

# ── Redis ──────────────────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASS}
REDIS_URL="redis://:${REDIS_PASS}@localhost:6379"

# ── MinIO ──────────────────────────────────────────────────
MINIO_ROOT_USER=${MINIO_USER}
MINIO_ROOT_PASSWORD=${MINIO_PASS}
MINIO_BUCKET=${MINIO_BUCKET}
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
# Public endpoint the BROWSER uses to load face images. Point this at a MinIO
# public hostname (e.g. a second Cloudflare hostname files.<domain> → minio:9000).
# If left as-is, remote users cannot load stored face images.
MINIO_PUBLIC_ENDPOINT=
MINIO_PUBLIC_PORT=443
MINIO_PUBLIC_USE_SSL=true

# ── Auth (custom JWT session) ──────────────────────────────
SESSION_SECRET="${SESSION_SECRET}"

# ── LINE Official Account ──────────────────────────────────
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_CHANNEL_SECRET=""

# ── Cloudflare Tunnel (public HTTPS) ───────────────────────
CLOUDFLARE_TUNNEL_TOKEN=""
# Your public hostname(s), comma-separated, no scheme. Rebuild app after change.
APP_ALLOWED_ORIGINS=""
EOF

chmod 600 "$OUT"
echo "wrote $OUT (chmod 600)"
echo "next: fill LINE_*, CLOUDFLARE_TUNNEL_TOKEN, APP_ALLOWED_ORIGINS, MINIO_PUBLIC_ENDPOINT,"
echo "then: cp $OUT .env  &&  docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile tunnel up -d --build"

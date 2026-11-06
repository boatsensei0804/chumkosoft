#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_DIR="/home/chumkosoft/chumkosoft"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.rustfs.yml --profile tunnel)

if [[ "$(runuser -u chumkosoft -- env HOME=/home/chumkosoft git -C "$DEPLOY_DIR" branch --show-current)" != "main" ]]; then
  echo "Deployment checkout must be on main." >&2
  exit 1
fi

if [[ -n "$(runuser -u chumkosoft -- env HOME=/home/chumkosoft git -C "$DEPLOY_DIR" status --porcelain)" ]]; then
  echo "Deployment checkout has local changes; refusing to overwrite them." >&2
  exit 1
fi

runuser -u chumkosoft -- env HOME=/home/chumkosoft git -C "$DEPLOY_DIR" pull --ff-only origin main
cd "$DEPLOY_DIR"

"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d --build

for attempt in {1..30}; do
  if "${COMPOSE[@]}" exec -T app node -e 'fetch("http://127.0.0.1:3000/login").then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))'; then
    deployed_commit="$(runuser -u chumkosoft -- env HOME=/home/chumkosoft git -C "$DEPLOY_DIR" rev-parse --short HEAD)"
    echo "Production app responded successfully. Deployed ${deployed_commit}."
    exit 0
  fi
  sleep 2
done

echo "Production health check failed. Check the app container logs on the server." >&2
exit 1

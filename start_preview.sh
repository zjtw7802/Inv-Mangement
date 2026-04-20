#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8080}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"

if pgrep -f "python -m http.server --bind 0.0.0.0 ${PORT}" >/dev/null 2>&1; then
  echo "[info] Preview server already running on port ${PORT}."
else
  nohup python -m http.server --bind 0.0.0.0 "${PORT}" > /tmp/inv_preview.log 2>&1 &
  echo "$!" > /tmp/inv_preview.pid
  sleep 1
  echo "[ok] Preview server started on 0.0.0.0:${PORT}. PID=$(cat /tmp/inv_preview.pid)"
fi

echo ""
echo "=== Preview URLs ==="
echo "Local in container: http://127.0.0.1:${PORT}/index.html"

if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  echo "Codespaces URL: https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/index.html"
fi

if [[ -n "${GITPOD_WORKSPACE_URL:-}" ]]; then
  GP_URL="${GITPOD_WORKSPACE_URL/https:\/\//https://${PORT}-}"
  echo "Gitpod URL: ${GP_URL}/index.html"
fi

echo ""
echo "If your platform has a Ports panel, open/forward port ${PORT} and use that generated URL + /index.html"

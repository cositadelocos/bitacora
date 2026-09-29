#!/bin/sh
# Bring the preview server back after hibernation. Idempotent.
set -eu
cd /workspace
if curl -fsS -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/dev-server.log 2>&1 &

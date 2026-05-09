#!/bin/bash
# Blue-green deploy for SeeWhy LIVE
set -euo pipefail

SERVICE="${1:-api}"
IMAGE="${2:-seewhy/${SERVICE}:latest}"
ACTIVE=$(docker ps --filter "name=${SERVICE}_blue" --format '{{.Names}}' | head -1)

if [ -n "$ACTIVE" ]; then
  TARGET="green"
  RETIRE="blue"
else
  TARGET="blue"
  RETIRE="green"
fi

echo "Deploying $IMAGE as $TARGET..."
docker run -d --name "${SERVICE}_${TARGET}" --network seewhy-net --env-file .env "$IMAGE"

# Health check (30s timeout)
for i in $(seq 1 15); do
  if curl -sf "http://localhost:4000/health" > /dev/null 2>&1; then
    echo "Health check passed"
    break
  fi
  sleep 2
done

# Switch traffic (nginx reload)
docker exec nginx nginx -s reload

# Retire old container
if docker ps --filter "name=${SERVICE}_${RETIRE}" --format '{{.Names}}' | grep -q "${RETIRE}"; then
  echo "Retiring $RETIRE..."
  docker stop "${SERVICE}_${RETIRE}" && docker rm "${SERVICE}_${RETIRE}"
fi

echo "Deploy complete: $SERVICE -> $TARGET ($IMAGE)"

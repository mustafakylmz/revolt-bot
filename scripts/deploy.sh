#!/bin/bash

# Deployment script for Revolt Bot
# Usage: ./deploy.sh <docker_image> <git_sha>

set -e  # Exit on any error

DOCKER_IMAGE="$1"
GIT_SHA="$2"
CONTAINER_NAME="revolt-bot"
NETWORK_NAME="revolt-bot-network"

echo "🚀 Starting deployment..."
echo "📦 Docker Image: $DOCKER_IMAGE"
echo "🔖 Git SHA: $GIT_SHA"
echo "📅 Timestamp: $(date)"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup on error
cleanup() {
    log "❌ Deployment failed, cleaning up..."
    docker rm -f "$CONTAINER_NAME-new" 2>/dev/null || true
    exit 1
}

# Set trap for cleanup
trap cleanup ERR

log "🔍 Checking Docker availability..."
if ! command -v docker &> /dev/null; then
    log "❌ Docker is not installed or not in PATH"
    exit 1
fi

log "📥 Pulling latest Docker image..."
docker pull "$DOCKER_IMAGE"

log "🔗 Creating Docker network if not exists..."
docker network create "$NETWORK_NAME" 2>/dev/null || true

log "🛑 Stopping old container if exists..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

log "🚀 Starting new container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --network "$NETWORK_NAME" \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env \
    --label "git.sha=$GIT_SHA" \
    --label "deployment.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --label "service=revolt-bot" \
    --health-cmd="curl -f http://localhost:3000/api/health || exit 1" \
    --health-interval=30s \
    --health-timeout=3s \
    --health-start-period=40s \
    --health-retries=3 \
    "$DOCKER_IMAGE"

log "⏳ Waiting for container to be healthy..."
timeout=120  # 2 minutes timeout
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null | grep -q "healthy"; then
        log "✅ Container is healthy!"
        break
    fi
    
    if [ $elapsed -eq 0 ]; then
        log "🔄 Waiting for health check..."
    fi
    
    sleep 5
    elapsed=$((elapsed + 5))
    
    # Check if container is still running
    if ! docker ps --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        log "❌ Container stopped unexpectedly"
        docker logs "$CONTAINER_NAME" --tail 20
        exit 1
    fi
done

# Final health check
if ! docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null | grep -q "healthy"; then
    log "❌ Container failed to become healthy within timeout"
    log "📋 Container logs:"
    docker logs "$CONTAINER_NAME" --tail 20
    exit 1
fi

log "🧹 Cleaning up old images..."
docker image prune -f --filter "label=service=revolt-bot" --filter "until=24h" 2>/dev/null || true

log "📊 Deployment Summary:"
log "   Container: $CONTAINER_NAME"
log "   Image: $DOCKER_IMAGE"
log "   SHA: $GIT_SHA"
log "   Status: $(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME")"
log "   Health: $(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME")"
log "   Started: $(docker inspect --format='{{.State.StartedAt}}' "$CONTAINER_NAME")"

log "✅ Deployment completed successfully!"

# Optional: Run Discord commands registration
if [ -f "./scripts/register-commands.js" ] && [ -n "$BOT_TOKEN" ]; then
    log "🔧 Registering Discord commands..."
    docker exec "$CONTAINER_NAME" node scripts/register-commands.js || log "⚠️  Command registration failed (non-critical)"
fi

log "🎉 Revolt Bot is now running on the latest version!"
log "🌐 Health check: http://localhost:3000/api/health"

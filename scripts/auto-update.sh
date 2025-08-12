#!/bin/bash

# Auto-update script for Revolt Bot
# This script can be run as a cron job to check for updates

set -e

REPO_URL="https://api.github.com/repos/OWNER/revolt-bot"  # Update with your repo
CURRENT_SHA_FILE="/tmp/revolt-bot-current-sha"
LOG_FILE="/var/log/revolt-bot-auto-update.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to get current running container SHA
get_current_sha() {
    docker inspect --format='{{index .Config.Labels "git.sha"}}' revolt-bot 2>/dev/null || echo "unknown"
}

# Function to get latest commit SHA from GitHub
get_latest_sha() {
    curl -s "$REPO_URL/commits/main" | jq -r '.sha' 2>/dev/null || echo "unknown"
}

# Function to trigger deployment
trigger_deployment() {
    local sha=$1
    local image="ghcr.io/OWNER/revolt-bot:latest"  # Update with your image
    
    log "🚀 Triggering deployment for SHA: $sha"
    
    # Call local deployment webhook
    curl -X POST "http://localhost:3000/api/deploy" \
        -H "Authorization: Bearer ${DEPLOY_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"ref\": \"refs/heads/main\",
            \"sha\": \"$sha\",
            \"repository\": \"OWNER/revolt-bot\",
            \"image\": \"$image\"
        }" || log "❌ Failed to trigger deployment"
}

main() {
    log "🔍 Checking for updates..."
    
    # Get current and latest SHA
    current_sha=$(get_current_sha)
    latest_sha=$(get_latest_sha)
    
    log "📋 Current SHA: $current_sha"
    log "📋 Latest SHA: $latest_sha"
    
    # Check if we have valid SHAs
    if [[ "$latest_sha" == "unknown" ]]; then
        log "❌ Failed to get latest SHA from GitHub"
        exit 1
    fi
    
    # Check if update is needed
    if [[ "$current_sha" != "$latest_sha" ]]; then
        log "🆕 New version available!"
        log "📥 Current: $current_sha"
        log "📤 Latest: $latest_sha"
        
        # Store the SHA we're updating to
        echo "$latest_sha" > "$CURRENT_SHA_FILE"
        
        # Trigger deployment
        trigger_deployment "$latest_sha"
        
        log "✅ Auto-update initiated"
    else
        log "✅ Already up to date"
    fi
}

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Run main function
main "$@"

#!/bin/bash

# GitHub Cleanup Script
# This script cleans up old deployments, workflow runs, and packages
# Usage: ./cleanup-github.sh [GITHUB_TOKEN] [REPO_OWNER] [REPO_NAME]

set -e

GITHUB_TOKEN="${1:-$GITHUB_TOKEN}"
REPO_OWNER="${2:-mustafakylmz}"
REPO_NAME="${3:-revolt-bot}"
REPO_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check if GitHub token is provided
if [[ -z "$GITHUB_TOKEN" ]]; then
    error "GitHub token is required. Set GITHUB_TOKEN environment variable or pass as first argument."
    exit 1
fi

# Function to make GitHub API requests
github_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    
    if [[ -n "$data" ]]; then
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -d "$data" \
            "$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "$endpoint"
    fi
}

# Clean up workflow runs
cleanup_workflow_runs() {
    log "🧹 Cleaning up old workflow runs..."
    
    # Get all workflows
    local workflows=$(github_api "$REPO_URL/actions/workflows" | jq -r '.workflows[].id')
    
    for workflow_id in $workflows; do
        log "Processing workflow ID: $workflow_id"
        
        # Get workflow runs older than 30 days
        local runs=$(github_api "$REPO_URL/actions/workflows/$workflow_id/runs?per_page=100" | \
            jq -r --arg date "$(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.workflow_runs[] | select(.created_at < $date) | .id')
        
        for run_id in $runs; do
            log "Deleting workflow run: $run_id"
            github_api "$REPO_URL/actions/runs/$run_id" "DELETE"
            sleep 0.1  # Rate limiting
        done
    done
}

# Clean up deployments
cleanup_deployments() {
    log "🚀 Cleaning up old deployments..."
    
    # Get deployments older than 30 days
    local deployments=$(github_api "$REPO_URL/deployments?per_page=100" | \
        jq -r --arg date "$(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.[] | select(.created_at < $date) | .id')
    
    for deployment_id in $deployments; do
        log "Processing deployment: $deployment_id"
        
        # First, set deployment status to inactive
        github_api "$REPO_URL/deployments/$deployment_id/statuses" "POST" \
            '{"state":"inactive","description":"Cleaned up by automation"}'
        
        # Then delete the deployment
        log "Deleting deployment: $deployment_id"
        github_api "$REPO_URL/deployments/$deployment_id" "DELETE"
        sleep 0.1  # Rate limiting
    done
}

# Clean up packages (GitHub Container Registry)
cleanup_packages() {
    log "📦 Cleaning up old packages..."
    
    # Get package versions
    local package_name="revolt-bot"
    local versions=$(github_api "https://api.github.com/users/$REPO_OWNER/packages/container/$package_name/versions?per_page=100" | \
        jq -r --arg date "$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.[] | select(.created_at < $date and .metadata.container.tags | length == 0) | .id')
    
    for version_id in $versions; do
        log "Deleting package version: $version_id"
        github_api "https://api.github.com/users/$REPO_OWNER/packages/container/$package_name/versions/$version_id" "DELETE"
        sleep 0.1  # Rate limiting
    done
}

# Clean up old releases (keep last 5)
cleanup_releases() {
    log "🏷️  Cleaning up old releases..."
    
    # Get releases (skip first 5)
    local releases=$(github_api "$REPO_URL/releases?per_page=100" | \
        jq -r '.[5:] | .[] | .id')
    
    for release_id in $releases; do
        log "Deleting release: $release_id"
        github_api "$REPO_URL/releases/$release_id" "DELETE"
        sleep 0.1  # Rate limiting
    done
}

# Clean up old artifacts
cleanup_artifacts() {
    log "📁 Cleaning up old artifacts..."
    
    # Get artifacts older than 7 days
    local artifacts=$(github_api "$REPO_URL/actions/artifacts?per_page=100" | \
        jq -r --arg date "$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.artifacts[] | select(.created_at < $date) | .id')
    
    for artifact_id in $artifacts; do
        log "Deleting artifact: $artifact_id"
        github_api "$REPO_URL/actions/artifacts/$artifact_id" "DELETE"
        sleep 0.1  # Rate limiting
    done
}

# Main cleanup function
main() {
    log "🧽 Starting GitHub cleanup for $REPO_OWNER/$REPO_NAME"
    
    # Check if repository exists and token has access
    if ! github_api "$REPO_URL" >/dev/null; then
        error "Cannot access repository $REPO_OWNER/$REPO_NAME. Check token permissions."
        exit 1
    fi
    
    log "✅ Repository access confirmed"
    
    # Run cleanup functions
    cleanup_workflow_runs
    cleanup_deployments
    cleanup_packages
    cleanup_releases
    cleanup_artifacts
    
    log "✅ GitHub cleanup completed successfully!"
    
    # Show summary
    log "📊 Summary:"
    log "   - Old workflow runs cleaned up"
    log "   - Old deployments removed"
    log "   - Unused package versions deleted"
    log "   - Old releases removed (kept last 5)"
    log "   - Old artifacts cleaned up"
}

# Check dependencies
if ! command -v jq &> /dev/null; then
    error "jq is required but not installed. Please install jq first."
    error "  Ubuntu/Debian: sudo apt install jq"
    error "  macOS: brew install jq"
    error "  Windows: Download from https://github.com/stedolan/jq/releases"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    error "curl is required but not installed."
    exit 1
fi

# Run main function
main "$@"

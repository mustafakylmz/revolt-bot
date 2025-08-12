#!/bin/bash

# Setup cron job for auto-updates
# Usage: ./setup-cron.sh [interval_minutes]

INTERVAL=${1:-15}  # Default: check every 15 minutes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/auto-update.sh"

echo "🕒 Setting up cron job for auto-updates..."
echo "📅 Interval: Every $INTERVAL minutes"
echo "📜 Script: $UPDATE_SCRIPT"

# Make scripts executable
chmod +x "$UPDATE_SCRIPT"
chmod +x "$SCRIPT_DIR/deploy.sh"

# Create cron job entry
CRON_ENTRY="*/$INTERVAL * * * * $UPDATE_SCRIPT >> /var/log/revolt-bot-cron.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null | grep -v "$UPDATE_SCRIPT"; echo "$CRON_ENTRY") | crontab -

echo "✅ Cron job setup complete!"
echo "📋 Current crontab:"
crontab -l | grep -E "(revolt-bot|auto-update)"

echo ""
echo "📝 To view logs:"
echo "   Auto-update log: tail -f /var/log/revolt-bot-auto-update.log"
echo "   Cron log: tail -f /var/log/revolt-bot-cron.log"

echo ""
echo "🛠️  To remove cron job:"
echo "   crontab -l | grep -v '$UPDATE_SCRIPT' | crontab -"

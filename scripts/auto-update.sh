#!/bin/bash

# Revolt Bot Otomatik Güncelleme Script'i
# Bu script cron ile çalıştırılarak otomatik güncelleme yapar

set -e

# Log dosyası
LOG_FILE="/home/musteriler/domains/bot.revolt.tr/public_html/update.log"
LOCK_FILE="/home/musteriler/domains/bot.revolt.tr/public_html/update.lock"

# Log fonksiyonu
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Lock file kontrolü
if [ -f "$LOCK_FILE" ]; then
    log "⚠️ Güncelleme zaten çalışıyor, çıkılıyor..."
    exit 0
fi

# Lock file oluştur
echo "$$" > "$LOCK_FILE"

# Cleanup fonksiyonu
cleanup() {
    rm -f "$LOCK_FILE"
    log "🧹 Cleanup tamamlandı"
}

# Exit trap
trap cleanup EXIT

log "🚀 Otomatik güncelleme başlatılıyor..."

# Dizine geç
cd /home/musteriler/domains/bot.revolt.tr/public_html

# Git durumunu kontrol et
if ! git status > /dev/null 2>&1; then
    log "❌ Git repository bulunamadı"
    exit 1
fi

# Uzak branch ile karşılaştır
git fetch origin > /dev/null 2>&1
CURRENT_BRANCH=$(git branch --show-current)
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH)

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
    log "✅ Güncelleme yok, zaten güncel"
    exit 0
fi

log "🔄 Güncelleme bulundu: $LOCAL_COMMIT -> $REMOTE_COMMIT"

# Deployment script'ini çalıştır
if [ -f "./scripts/deploy.sh" ]; then
    log "🚀 Deployment script çalıştırılıyor..."
    ./scripts/deploy.sh
    log "✅ Güncelleme tamamlandı"
else
    log "❌ Deployment script bulunamadı"
    exit 1
fi

log "🎉 Otomatik güncelleme başarıyla tamamlandı!"

#!/bin/bash

# Revolt Bot Server Deploy Script
# Bu script sunucuda Docker Compose ile deployment yapar
# GitHub Actions tarafından çağrılır

set -e

echo "🚀 Revolt Bot Server Deploy başlatılıyor..."

APP_ROOT="/home/revoltbot/htdocs/bot.revolt.tr"
LOG_FILE="$APP_ROOT/deploy.log"
LOCK_FILE="$APP_ROOT/deploy.lock"

# Log fonksiyonu
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Lock file kontrolü
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        log "⚠️ Deploy zaten çalışıyor (PID: $PID), çıkılıyor..."
        exit 0
    else
        log "⚠️ Eski lock file temizleniyor..."
        rm -f "$LOCK_FILE"
    fi
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

log "📋 Deployment başlatılıyor..."

# Dizine geç
cd "$APP_ROOT"

# Docker'ın çalışıp çalışmadığını kontrol et
if ! docker info > /dev/null 2>&1; then
    log "❌ Docker çalışmıyor. Lütfen Docker'ı başlatın."
    exit 1
fi

# Compose komutunu belirle
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

# Git durumunu kontrol et
log "📋 Git durumu kontrol ediliyor..."
git fetch origin

CURRENT_BRANCH=$(git branch --show-current)
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH)

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
    log "✅ Güncelleme yok, zaten güncel"
    exit 0
fi

log "🔄 Güncelleme bulundu: $LOCAL_COMMIT -> $REMOTE_COMMIT"

# Mevcut containerları durdur
log "⏹️ Mevcut containerlar durduruluyor..."
$COMPOSE -f "$APP_ROOT/docker-compose.yml" down || true

# Git pull ile güncellemeleri çek
log "🔄 Git güncellemeleri çekiliyor..."
git fetch origin
git pull origin $CURRENT_BRANCH

# npm bağımlılıklarını güncelle
log "📦 Bağımlılıklar güncelleniyor..."
npm ci --only=production

# Uygulamayı build et
log "🔨 Uygulama build ediliyor..."
npm run build

# Docker imagelarını build et
log "🐳 Docker image build ediliyor..."
$COMPOSE -f "$APP_ROOT/docker-compose.yml" build --no-cache

# Docker Compose ile sistemi başlat
log "🚀 Docker Compose ile sistem başlatılıyor..."
$COMPOSE -f "$APP_ROOT/docker-compose.yml" up -d

# Başlatma için bekle
log "⏳ Başlatma bekleniyor..."
sleep 10

# Health check
log "🏥 Health check yapılıyor..."
MAX_RETRIES=12
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log "✅ Uygulama başarıyla başlatıldı!"
        log "🌐 URL: http://localhost:3000"
        log "📋 Container durumu:"
        docker ps --filter "name=revolt-bot" --filter "name=revolt-bot-mongodb" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        log "🎉 Deployment tamamlandı!"
        exit 0
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "⏳ Health check denemesi $RETRY_COUNT/$MAX_RETRIES..."
    sleep 5
done

log "❌ Uygulama başlatılamadı!"
log "📋 Son docker-compose logları:"
$COMPOSE -f "$APP_ROOT/docker-compose.yml" logs --tail=20
exit 1
#!/bin/bash

# Revolt Bot Docker Startup Script
# Bu script Docker Compose ile sistemi başlatır ve eski imageları temizler

set -e

echo "🚀 Revolt Bot Docker startup başlatılıyor..."

# Dizine geç
cd "$(dirname "$0")/.."
APP_ROOT="$(pwd)"

LOG_FILE="$APP_ROOT/docker-startup.log"
LOCK_FILE="$APP_ROOT/docker-startup.lock"

# Log fonksiyonu
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Lock file kontrolü
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        log "⚠️ Startup zaten çalışıyor (PID: $PID), çıkılıyor..."
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

log "📋 Docker ve Compose kontrol ediliyor..."

# Docker'ın çalışıp çalışmadığını kontrol et
if ! docker info > /dev/null 2>&1; then
    log "❌ Docker çalışmıyor. Lütfen Docker'ı başlatın."
    exit 1
fi

# Docker Compose versiyonunu kontrol et
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log "❌ Docker Compose kurulu değil."
    exit 1
fi

# Compose komutunu belirle
if docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    COMPOSE="docker-compose"
fi

log "🔄 Eski Docker containerları ve imageları temizleniyor..."

# Çalışan containerları durdur
$COMPOSE -f "$APP_ROOT/docker-compose.yml" down --remove-orphans 2>/dev/null || true

# Eski image versiyonlarını temizle (sadece revolt-bot ve mongo imagelarını)
for img in revolt-bot revolt-bot-unified mongo:7; do
    if docker images -q "$img" &> /dev/null; then
        log "🗑️ $img imagei siliniyor..."
        docker rmi "$img" 2>/dev/null || true
    fi
done

# Kullanılmayan dangling imageları temizle
docker image prune -f &> /dev/null || true

log "🗑️ Temizlik tamamlandı"

# Uygulama build edilmiş mi kontrol et
log "🔨 Uygulama build ediliyor..."
npm run build >> "$LOG_FILE" 2>&1

# Docker imagelarını build et
log "🐳 Docker image build ediliyor..."
$COMPOSE -f "$APP_ROOT/docker-compose.yml" build --no-cache >> "$LOG_FILE" 2>&1

# Docker Compose ile sistemi başlat
log "🚀 Docker Compose ile sistem başlatılıyor..."
$COMPOSE -f "$APP_ROOT/docker-compose.yml" up -d >> "$LOG_FILE" 2>&1

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
        log "🎉 Startup tamamlandı!"
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
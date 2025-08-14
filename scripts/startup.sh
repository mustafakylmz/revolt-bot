#!/bin/bash

# Revolt Bot Startup Script
# Bu script uygulamayı başlatır ve gerekli kontrolleri yapar

set -e

echo "🚀 Revolt Bot başlatılıyor..."

# Dizine geç
cd "$(dirname "$0")/.."

# Uygulama zaten çalışıyor mu kontrol et
if pgrep -f "npm start" > /dev/null; then
    echo "⚠️ Uygulama zaten çalışıyor"
    exit 0
fi

# Port 3000 kullanımda mı kontrol et
if ss -tlnp | grep -q ":3000"; then
    echo "⚠️ Port 3000 zaten kullanımda"
    exit 1
fi

# Uygulama build edilmiş mi kontrol et
if [ ! -d ".next" ]; then
    echo "🔨 Uygulama build ediliyor..."
    npm run build
fi

# Uygulamayı başlat
echo "🚀 Uygulama başlatılıyor..."
nohup npm start > app.log 2>&1 &

# Başlatma için bekle
sleep 5

# Health check
echo "🏥 Health check yapılıyor..."
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Uygulama başarıyla başlatıldı!"
    echo "🌐 URL: http://localhost:3000"
    echo "📋 Log dosyası: app.log"
else
    echo "❌ Uygulama başlatılamadı!"
    echo "📋 Log dosyasını kontrol edin: tail -f app.log"
    exit 1
fi

echo "🎉 Startup tamamlandı!"

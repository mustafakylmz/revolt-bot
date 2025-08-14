#!/bin/bash

# Revolt Bot Restart Script
# Bu script uygulamayı yeniden başlatır

echo "🔄 Revolt Bot yeniden başlatılıyor..."

# Dizine geç
cd "$(dirname "$0")/.."

# Stop script'ini çalıştır
echo "⏹️ Uygulama durduruluyor..."
./scripts/stop.sh

# Kısa bir süre bekle
sleep 3

# Start script'ini çalıştır
echo "🚀 Uygulama başlatılıyor..."
./scripts/startup.sh

echo "🎉 Restart tamamlandı!"

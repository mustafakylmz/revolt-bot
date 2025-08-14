#!/bin/bash

# Revolt Bot Status Script
# Bu script uygulama durumunu kontrol eder

echo "📊 Revolt Bot Durum Raporu"
echo "================================"

# Dizine geç
cd "$(dirname "$0")/.."

# Git durumu
echo "🌿 Git Durumu:"
git status --porcelain | head -5
if [ $? -eq 0 ]; then
    echo "✅ Git repository erişilebilir"
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📍 Mevcut branch: $CURRENT_BRANCH"
    echo "📅 Son commit: $(git log -1 --format='%h - %s (%cr)')"
else
    echo "❌ Git repository erişilemiyor"
fi

echo ""

# Process durumu
echo "🔄 Process Durumu:"
if pgrep -f "npm start" > /dev/null; then
    echo "✅ Uygulama çalışıyor"
    PIDS=$(pgrep -f "npm start")
    echo "📋 Process ID'leri: $PIDS"
else
    echo "❌ Uygulama çalışmıyor"
fi

echo ""

# Port durumu
echo "🌐 Port Durumu:"
if ss -tlnp | grep -q ":3000"; then
    echo "✅ Port 3000 aktif"
    PORT_INFO=$(ss -tlnp | grep ":3000")
    echo "📋 Port bilgisi: $PORT_INFO"
else
    echo "❌ Port 3000 pasif"
fi

echo ""

# Disk kullanımı
echo "💾 Disk Kullanımı:"
DISK_USAGE=$(du -sh . | cut -f1)
echo "📁 Proje boyutu: $DISK_USAGE"

echo ""

# Log dosyaları
echo "📋 Log Dosyaları:"
if [ -f "app.log" ]; then
    LOG_SIZE=$(du -h app.log | cut -f1)
    echo "📄 app.log: $LOG_SIZE"
    echo "🕐 Son güncelleme: $(stat -c %y app.log)"
else
    echo "❌ app.log bulunamadı"
fi

if [ -f "update.log" ]; then
    UPDATE_LOG_SIZE=$(du -h update.log | cut -f1)
    echo "📄 update.log: $UPDATE_LOG_SIZE"
    echo "🕐 Son güncelleme: $(stat -c %y update.log)"
else
    echo "❌ update.log bulunamadı"
fi

echo ""

# Health check
echo "🏥 Health Check:"
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Web sayfası erişilebilir"
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000/)
    echo "⚡ Yanıt süresi: ${RESPONSE_TIME}s"
else
    echo "❌ Web sayfası erişilemiyor"
fi

echo ""
echo "================================"
echo "📊 Durum raporu tamamlandı!"

#!/bin/bash

# Revolt Bot Stop Script
# Bu script uygulamayı güvenli bir şekilde durdurur

echo "⏹️ Revolt Bot durduruluyor..."

# Dizine geç
cd "$(dirname "$0")/.."

# Uygulama çalışıyor mu kontrol et
if ! pgrep -f "npm start" > /dev/null; then
    echo "⚠️ Uygulama zaten çalışmıyor"
    exit 0
fi

# Process ID'leri al
PIDS=$(pgrep -f "npm start")
echo "📋 Bulunan process ID'leri: $PIDS"

# Process'leri durdur
for pid in $PIDS; do
    echo "🛑 Process $pid durduruluyor..."
    kill $pid
done

# Kısa bir süre bekle
sleep 2

# Hala çalışan process var mı kontrol et
if pgrep -f "npm start" > /dev/null; then
    echo "⚠️ Bazı process'ler hala çalışıyor, force kill yapılıyor..."
    pkill -9 -f "npm start"
fi

# Port 3000'de çalışan process var mı kontrol et
if ss -tlnp | grep -q ":3000"; then
    echo "⚠️ Port 3000 hala kullanımda, force kill yapılıyor..."
    pkill -9 -f "next-server"
fi

echo "✅ Uygulama başarıyla durduruldu!"

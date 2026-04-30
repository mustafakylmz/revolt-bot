#!/bin/bash
cd /home/revolt-bot/htdocs/bot.revolt.tr
git pull origin main
docker compose up -d --build

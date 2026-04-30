#!/bin/bash
cd /home/revoltbot/htdocs/bot.revolt.tr
git pull origin main
docker compose up -d --build

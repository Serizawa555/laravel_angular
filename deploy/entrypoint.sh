#!/bin/sh
# Prepare the app on container start (free tier can't run a pre-deploy command).
# Migrations + seeders are idempotent, so this is safe to run on every boot.
set -e
cd /app

php artisan migrate --force
php artisan db:seed --force
php artisan storage:link || true
php artisan config:cache || true

# Hand off to the web server (exec = proper signal handling / PID 1).
exec frankenphp run --config /etc/caddy/Caddyfile --adapter caddyfile

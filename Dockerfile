# Production image: one container that serves the Angular SPA + the Laravel API same-origin.
# Build context is the repo root (needs both backend/ and frontend/).

# 1. Build the Angular SPA -> frontend/dist/frontend/browser
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Install PHP (production) dependencies
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --no-progress
COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev --no-scripts

# 3. Runtime: FrankenPHP (single binary serving PHP + static files)
FROM dunglas/frankenphp:1-php8.3
RUN install-php-extensions pdo_pgsql gd intl zip bcmath exif opcache

WORKDIR /app
# Laravel app + vendor
COPY --from=vendor /app /app
# Angular build into Laravel's public/ (served same-origin alongside index.php)
COPY --from=frontend /app/dist/frontend/browser/ /app/public/
# Web-server config (routes /api + /sanctum to PHP, everything else to the SPA)
COPY deploy/Caddyfile /etc/caddy/Caddyfile

# Writable runtime dirs
RUN chmod -R ugo+rw storage bootstrap/cache

# Render provides $PORT; the Caddyfile listens on it.
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

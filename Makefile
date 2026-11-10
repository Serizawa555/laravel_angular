# PhoneShop — common monorepo commands. Backend runs in Sail (Docker); frontend on the host.
SAIL = ./vendor/bin/sail

.DEFAULT_GOAL := help
.PHONY: help setup up down be-install fe-install migrate fresh seed be-test fe-test \
        lint pint stan serve logs

help: ## List commands
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## First-time setup (install deps, boot stack, migrate)
	cd backend && composer install && (cp -n .env.example .env || true)
	cd frontend && npm install
	cd backend && $(SAIL) up -d && $(SAIL) artisan key:generate && $(SAIL) artisan migrate

up: ## Start the backend stack (Postgres, Redis, Mailpit, app)
	cd backend && $(SAIL) up -d

down: ## Stop the backend stack
	cd backend && $(SAIL) down

migrate: ## Run DB migrations
	cd backend && $(SAIL) artisan migrate

fresh: ## Drop + rebuild DB and seed
	cd backend && $(SAIL) artisan migrate:fresh --seed

seed: ## Seed structural config + demo data
	cd backend && $(SAIL) artisan db:seed

be-test: ## Backend tests (Pest)
	cd backend && $(SAIL) test

fe-test: ## Frontend tests (Vitest)
	cd frontend && npm test

pint: ## Format PHP (Laravel Pint)
	cd backend && $(SAIL) pint

stan: ## Static analysis (Larastan)
	cd backend && $(SAIL) php vendor/bin/phpstan analyse

lint: ## Lint frontend (angular-eslint)
	cd frontend && npm run lint

serve: ## Run the Angular dev server (proxies /api + /sanctum to :8000)
	cd frontend && npm start

logs: ## Tail backend container logs
	cd backend && $(SAIL) logs -f

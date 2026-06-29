SHELL := /bin/bash

BACKEND_DIR ?= ../amz-orders
COMPOSE ?= docker compose
API_URL ?= http://localhost:8080
FRONTEND_PORT ?= 5173
FRONTEND_PREVIEW_PORT ?= 3000

.PHONY: help install dev build preview prod lint type-check down logs status backend-dev backend-docker-dev backend-prod backend-down stack-dev stack-prod stack-down

help:
	@echo "Frontend commands:"
	@echo "  make install                         Build frontend dev container dependencies"
	@echo "  make dev                             Run frontend dev server in Docker"
	@echo "  make build                           Build frontend production image"
	@echo "  make preview                         Run frontend production container"
	@echo "  make prod                            Alias for preview"
	@echo "  make lint                            Run frontend linting in Docker"
	@echo "  make type-check                      Run TypeScript checks in Docker"
	@echo "  make logs                            Tail frontend container logs"
	@echo "  make status                          Show frontend container status"
	@echo "  make down                            Stop frontend containers"
	@echo ""
	@echo "Backend shortcuts:"
	@echo "  make backend-dev                     Run amz-orders in Docker dev mode"
	@echo "  make backend-docker-dev              Run amz-orders in Docker dev mode"
	@echo "  make backend-prod                    Run amz-orders in Docker prod mode"
	@echo "  make backend-down                    Stop backend Docker services"
	@echo ""
	@echo "Full stack one-click flows:"
	@echo "  make stack-dev                       Start backend in Docker dev mode, then frontend dev server"
	@echo "  make stack-prod                      Start backend in Docker prod mode, then frontend preview server"
	@echo "  make stack-down                      Stop backend Docker services"
	@echo ""
	@echo "Overrides:"
	@echo "  API_URL=http://host:8080"
	@echo "  FRONTEND_PORT=5173"
	@echo "  FRONTEND_PREVIEW_PORT=3000"

install:
	VITE_API_BASE_URL="$(API_URL)" $(COMPOSE) run --rm frontend-dev sh -lc "npm ci"

dev:
	VITE_API_BASE_URL="$(API_URL)" FRONTEND_PORT="$(FRONTEND_PORT)" $(COMPOSE) up frontend-dev

build:
	VITE_API_BASE_URL="$(API_URL)" $(COMPOSE) build frontend-prod

preview:
	VITE_API_BASE_URL="$(API_URL)" FRONTEND_PREVIEW_PORT="$(FRONTEND_PREVIEW_PORT)" $(COMPOSE) up -d --build frontend-prod

prod: preview

lint:
	VITE_API_BASE_URL="$(API_URL)" $(COMPOSE) run --rm frontend-dev sh -lc "npm ci && npm run lint"

type-check:
	VITE_API_BASE_URL="$(API_URL)" $(COMPOSE) run --rm frontend-dev sh -lc "npm ci && npm run type-check"

logs:
	$(COMPOSE) logs -f frontend-dev frontend-prod

status:
	$(COMPOSE) ps

down:
	$(COMPOSE) down

backend-dev:
	$(MAKE) -C "$(BACKEND_DIR)" docker-dev

backend-docker-dev:
	$(MAKE) -C "$(BACKEND_DIR)" docker-dev

backend-prod:
	$(MAKE) -C "$(BACKEND_DIR)" prod

backend-down:
	$(MAKE) -C "$(BACKEND_DIR)" down

stack-dev:
	$(MAKE) -C "$(BACKEND_DIR)" docker-dev
	$(MAKE) dev

stack-prod:
	$(MAKE) -C "$(BACKEND_DIR)" prod
	$(MAKE) prod

stack-down:
	$(MAKE) -C "$(BACKEND_DIR)" down

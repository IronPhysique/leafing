COMPOSE      := docker compose
COMPOSE_PROD := docker compose -f docker-compose.yml
VOLUME       := manhwa_pgdata

.DEFAULT_GOAL := help
.PHONY: help init dev prod down logs ps migrate restart clean

help:
	@echo Leafing targets:
	@echo "  make dev      Start DEV stack (hot reload)"
	@echo "  make prod     Start PROD stack (optimized, fast)"
	@echo "  make down     Stop services (data preserved)"
	@echo "  make logs     Tail web + worker logs"
	@echo "  make ps       Show running services"
	@echo "  make migrate  Create/apply a dev Prisma migration"
	@echo "  make restart  Restart the web service"
	@echo "  make init     Create the persistent DB volume (one-time)"
	@echo "  make clean    Stop + remove containers (DB volume preserved)"

init:
	-docker volume create $(VOLUME)

dev: init
	$(COMPOSE) up -d

prod: init
	$(COMPOSE_PROD) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f web worker

ps:
	$(COMPOSE) ps

migrate:
	$(COMPOSE) exec web npx prisma migrate dev

restart:
	$(COMPOSE) restart web

clean:
	$(COMPOSE) down --remove-orphans

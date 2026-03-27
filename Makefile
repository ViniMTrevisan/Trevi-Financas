.PHONY: up down test frontend-dev

up:
	docker-compose up --build

down:
	docker-compose down

test:
	cd backend && .venv/bin/pytest tests/ -v

frontend-dev:
	cd frontend && npm run dev

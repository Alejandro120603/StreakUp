PYTHON ?= python3
NPM ?= npm

BACKEND_DIR := backend
FRONTEND_DIR := frontend

VENV_DIR := $(BACKEND_DIR)/.venv
PIP := $(VENV_DIR)/bin/pip
PYTHON_BIN := $(VENV_DIR)/bin/python

DB_PATH := data/app.db
SCHEMA_PATH := data/db/schema.sql
SEED_PATH := data/db/seed.sql
DEV_USER_SEED_PATH := data/db/dev_users_seed.sql
DB_URI := sqlite:////$(abspath $(DB_PATH))

CAP := npx cap
CAP_CONFIG := $(FRONTEND_DIR)/capacitor.config.json
ANDROID_DIR := android
APK_DEBUG_PATH := $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk

GRADLE_USER_HOME ?= /tmp/streakup-gradle
OFFLINE_MODE ?= false

.PHONY: help venv install_requirements run_backend run_backend_prod run_frontend run_local dev \
	build_frontend sync_android open_android build_apk update-apk-auto \
	db-init db-init-demo db-bootstrap-catalog db-open db-clean db-reset db-dump db-backup db-psql

# ================================
# HELP
# ================================
help:
	@echo "Commands:"; grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/: ##/' | awk 'BEGIN {FS="##"}; {printf "  %-20s %s\n", $$1, $$2}'

# ================================
# ENV
# ================================
venv:
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "Creating virtual environment at $(VENV_DIR)"; \
		$(PYTHON) -m venv $(VENV_DIR); \
	else \
		echo "Virtual environment already exists"; \
	fi

install_requirements: venv
	@echo "Installing backend requirements"
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt
	@echo "Installing frontend dependencies"
	cd $(FRONTEND_DIR) && $(NPM) install

# ================================
# RUN
# ================================
run_backend:
	@test -x "$(PYTHON_BIN)" || (echo "Run: make venv" && exit 1)
	@echo "Starting backend..."
	$(PYTHON_BIN) $(BACKEND_DIR)/run.py

run_backend_prod:
	@test -x "$(BACKEND_DIR)/.venv/bin/gunicorn" || (echo "Run: make install_requirements" && exit 1)
	@echo "Starting backend with Gunicorn..."
	cd $(BACKEND_DIR) && PORT=$${PORT:-5000} ./.venv/bin/gunicorn --bind 0.0.0.0:$${PORT:-5000} run:app

run_frontend:
	@echo "Starting frontend..."
	cd $(FRONTEND_DIR) && NEXT_PUBLIC_OFFLINE_MODE="false" $(NPM) run dev

run_local:
	@echo "Frontend in OFFLINE mode"
	cd $(FRONTEND_DIR) && NEXT_PUBLIC_OFFLINE_MODE="true" $(NPM) run dev

dev:
	@echo "Running full stack..."
	@trap 'kill 0' EXIT INT TERM; \
	$(MAKE) run_backend & \
	$(MAKE) run_frontend & \
	wait

# ================================
# FRONT BUILD
# ================================
build_frontend:
	@echo "Building frontend..."
	cd $(FRONTEND_DIR) && NEXT_PUBLIC_OFFLINE_MODE="$(OFFLINE_MODE)" $(NPM) run build

# ================================
# ANDROID
# ================================
sync_android:
	cd $(FRONTEND_DIR) && $(CAP) sync android

open_android:
	cd $(FRONTEND_DIR) && $(CAP) open android

build_apk:
	cd $(ANDROID_DIR) && GRADLE_USER_HOME="$(GRADLE_USER_HOME)" ./gradlew assembleDebug
	@echo "APK ready at $(APK_DEBUG_PATH)"

update-apk-auto:
	@$(MAKE) build_frontend
	@$(MAKE) sync_android
	@$(MAKE) build_apk

# ================================
# DATABASE 🔥
# ================================

db-init: ## Crear DB local desde cero con schema + catálogo
	@echo "Initializing DB..."
	@mkdir -p data
	@test -x "$(PYTHON_BIN)" || (echo "Run: make venv" && exit 1)
	@test -f $(SCHEMA_PATH) || (echo "❌ schema.sql not found at $(SCHEMA_PATH)" && exit 1)
	@rm -f $(DB_PATH)
	sqlite3 $(DB_PATH) < $(SCHEMA_PATH)
	@$(MAKE) db-bootstrap-catalog
	@echo "✅ DB ready at $(DB_PATH)"

db-init-demo: ## Crear DB local con catálogo + usuarios demo
	@$(MAKE) db-init
	@test -f $(DEV_USER_SEED_PATH) || (echo "❌ dev_users_seed.sql not found at $(DEV_USER_SEED_PATH)" && exit 1)
	sqlite3 $(DB_PATH) < $(DEV_USER_SEED_PATH)
	@echo "✅ Demo users seeded at $(DB_PATH)"

db-bootstrap-catalog: ## Ejecutar bootstrap idempotente del catálogo
	@test -x "$(PYTHON_BIN)" || (echo "Run: make venv" && exit 1)
	cd $(BACKEND_DIR) && FLASK_ENV=development DATABASE_URL="$(DB_URI)" ./.venv/bin/flask --app run.py seed-catalog

db-reset: ## Reset DB (alias)
	$(MAKE) db-init

db-open:
	@test -f $(DB_PATH) || (echo "Run: make db-init" && exit 1)
	sqlite3 $(DB_PATH)

db-psql: ## Open psql using DATABASE_URL from backend/.env.local
	@command -v psql >/dev/null 2>&1 || { echo "psql is not installed. Install the PostgreSQL client and try again."; exit 1; }
	@test -f $(BACKEND_DIR)/.env.local || (echo "Missing $(BACKEND_DIR)/.env.local" && exit 1)
	@set -a; \
	. $(BACKEND_DIR)/.env.local; \
	set +a; \
	test -n "$$DATABASE_URL" || { echo "DATABASE_URL is not set in $(BACKEND_DIR)/.env.local"; exit 1; }; \
	echo "Opening psql session using DATABASE_URL from $(BACKEND_DIR)/.env.local..."; \
	exec psql "$$DATABASE_URL"

db-clean:
	@rm -f $(DB_PATH)
	@echo "🧹 DB removed"

db-dump:
	sqlite3 $(DB_PATH) ".dump"

db-backup:
	@mkdir -p data/backups
	@ts=$$(date +"%Y-%m-%d_%H%M%S"); \
	cp $(DB_PATH) data/backups/app_$$ts.sqlite && \
	echo "Backup saved"

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

CAP := npx cap
CAP_CONFIG := $(FRONTEND_DIR)/capacitor.config.json
ANDROID_DIR := android
APK_DEBUG_PATH := $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk

GRADLE_USER_HOME ?= /tmp/streakup-gradle
OFFLINE_MODE ?= false

.PHONY: help venv install_requirements run_backend run_frontend run_local dev \
	build_frontend sync_android open_android build_apk update-apk-auto \
	db-init db-open db-clean db-reset db-dump db-backup

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

db-init: ## Crear DB desde cero con schema + seed
	@echo "Initializing DB..."
	@mkdir -p data
	@test -f $(SCHEMA_PATH) || (echo "❌ schema.sql not found at $(SCHEMA_PATH)" && exit 1)
	@test -f $(SEED_PATH) || (echo "❌ seed.sql not found at $(SEED_PATH)" && exit 1)
	@rm -f $(DB_PATH)
	sqlite3 $(DB_PATH) < $(SCHEMA_PATH)
	sqlite3 $(DB_PATH) < $(SEED_PATH)
	@echo "✅ DB ready at $(DB_PATH)"

db-reset: ## Reset DB (alias)
	$(MAKE) db-init

db-open:
	@test -f $(DB_PATH) || (echo "Run: make db-init" && exit 1)
	sqlite3 $(DB_PATH)

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
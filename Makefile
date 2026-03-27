PYTHON ?= python3
NPM ?= npm
BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV_DIR := $(BACKEND_DIR)/.venv
PIP := $(VENV_DIR)/bin/pip
PYTHON_BIN := $(VENV_DIR)/bin/python
DB_PATH := data/app.db
CAP := npx cap
CAP_CONFIG := $(FRONTEND_DIR)/capacitor.config.json
ANDROID_DIR := android
APK_DEBUG_PATH := $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk
GRADLE_USER_HOME ?= /tmp/streakup-gradle
OFFLINE_MODE ?= false

.PHONY: help venv install_requirements run_backend run_frontend run_local dev build_frontend sync_android open_android build_apk update-apk-auto db-init db-open db-clean db-dump db-backup
DB_PATH := data/app.db

.PHONY: db-init db-open db-clean db-dump db-backup help

help: ## Show available commands
	@echo "Commands:"; grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/: ##/' | awk 'BEGIN {FS="##"}; {printf "  %-20s %s\n", $$1, $$2}'

venv: ## Create the backend virtual environment
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo "Creating virtual environment at $(VENV_DIR)"; \
		$(PYTHON) -m venv $(VENV_DIR); \
	else \
		echo "Virtual environment already exists at $(VENV_DIR)"; \
	fi

install_requirements: venv ## Install backend and frontend dependencies
	@echo "Installing backend dependencies from $(BACKEND_DIR)/requirements.txt"
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt
	@echo "Installing frontend dependencies in $(FRONTEND_DIR)"
	cd $(FRONTEND_DIR) && $(NPM) install

run_backend: ## Run the Flask backend
	@test -x "$(PYTHON_BIN)" || (echo "Backend virtual environment not found. Run: make venv" && exit 1)
	@echo "Starting backend with $(BACKEND_DIR)/run.py"
	$(PYTHON_BIN) $(BACKEND_DIR)/run.py

run_frontend: ## Run the Next.js frontend dev server
	@test -f "$(FRONTEND_DIR)/package.json" || (echo "Frontend package.json not found in $(FRONTEND_DIR)" && exit 1)
	@echo "Starting frontend dev server from $(FRONTEND_DIR)"
	cd $(FRONTEND_DIR) && NEXT_PUBLIC_OFFLINE_MODE="false" $(NPM) run dev

run_local: ## Run the frontend in forced offline mode
	@test -f "$(FRONTEND_DIR)/package.json" || (echo "Frontend package.json not found in $(FRONTEND_DIR)" && exit 1)
	@echo "Starting frontend in offline mode"
	cd $(FRONTEND_DIR) && NEXT_PUBLIC_OFFLINE_MODE="true" $(NPM) run dev

dev: ## Run backend and frontend together in online mode
	@echo "Starting backend + frontend in online mode"
	@trap 'kill 0' EXIT INT TERM; \
	$(MAKE) run_backend & \
	backend_pid=$$!; \
	$(MAKE) run_frontend & \
	frontend_pid=$$!; \
	wait $$backend_pid $$frontend_pid

build_frontend: ## Build the frontend for production/Capacitor
	@test -f "$(FRONTEND_DIR)/package.json" || (echo "Frontend package.json not found in $(FRONTEND_DIR)" && exit 1)
	@echo "Building frontend from $(FRONTEND_DIR)"
	@if [ -n "$(API_URL)" ]; then \
		echo "Using NEXT_PUBLIC_API_URL=$(API_URL)"; \
		echo "Using NEXT_PUBLIC_OFFLINE_MODE=$(OFFLINE_MODE)"; \
		cd $(FRONTEND_DIR) && NEXT_PUBLIC_API_URL="$(API_URL)" NEXT_PUBLIC_OFFLINE_MODE="$(OFFLINE_MODE)" $(NPM) run build; \
	else \
		echo "Using NEXT_PUBLIC_API_URL from frontend env files"; \
		echo "Using NEXT_PUBLIC_OFFLINE_MODE=$(OFFLINE_MODE)"; \
		cd $(FRONTEND_DIR) && NEXT_PUBLIC_OFFLINE_MODE="$(OFFLINE_MODE)" $(NPM) run build; \
	fi
	@test -d "$(FRONTEND_DIR)/out" || (echo "Frontend build did not produce $(FRONTEND_DIR)/out" && exit 1)

sync_android: ## Sync Capacitor web assets into Android
	@test -d "$(FRONTEND_DIR)/node_modules/@capacitor" || (echo "Capacitor dependencies not found in $(FRONTEND_DIR). Run: cd $(FRONTEND_DIR) && $(NPM) install" && exit 1)
	@test -f "$(CAP_CONFIG)" || (echo "Capacitor config not found at $(CAP_CONFIG)" && exit 1)
	@test -d "$(ANDROID_DIR)" || (echo "Android platform not found in $(ANDROID_DIR). Run: cd $(FRONTEND_DIR) && $(CAP) add android" && exit 1)
	@echo "Syncing Capacitor Android project"
	cd $(FRONTEND_DIR) && $(CAP) sync android

open_android: ## Open the Android project in Android Studio
	@test -d "$(FRONTEND_DIR)/node_modules/@capacitor" || (echo "Capacitor dependencies not found in $(FRONTEND_DIR). Run: cd $(FRONTEND_DIR) && $(NPM) install" && exit 1)
	@test -d "$(ANDROID_DIR)" || (echo "Android platform not found in $(ANDROID_DIR). Run: cd $(FRONTEND_DIR) && $(CAP) add android" && exit 1)
	@echo "Opening Android project"
	cd $(FRONTEND_DIR) && $(CAP) open android

build_apk: ## Build the Android debug APK
	@test -x "$(ANDROID_DIR)/gradlew" || (echo "Gradle wrapper not found in $(ANDROID_DIR). Run: cd $(FRONTEND_DIR) && $(CAP) add android" && exit 1)
	@echo "Building Android debug APK"
	@echo "Using GRADLE_USER_HOME=$(GRADLE_USER_HOME)"
	cd $(ANDROID_DIR) && GRADLE_USER_HOME="$(GRADLE_USER_HOME)" ./gradlew assembleDebug
	@test -f "$(APK_DEBUG_PATH)" || (echo "APK not found at $(APK_DEBUG_PATH)" && exit 1)
	@echo "APK ready at $(APK_DEBUG_PATH)"

update-apk-auto: ## Build frontend, sync Android, and generate the debug APK
	@echo "🚀 Building APK..."
	@$(MAKE) build_frontend
	@$(MAKE) sync_android
	@$(MAKE) build_apk
	@echo "Final APK: $(APK_DEBUG_PATH)"

db-init: ## Create/refresh the local SQLite DB from schema + seed
	@mkdir -p data
	@rm -f $(DB_PATH)
	sqlite3 $(DB_PATH) < db/schema.sql
	sqlite3 $(DB_PATH) < db/seed.sql
	@echo "✅ SQLite ready at $(DB_PATH)"

db-open: ## Open the DB REPL
	@test -f $(DB_PATH) || (echo "DB not found. Run: make db-init" && exit 1)
	sqlite3 $(DB_PATH)

db-clean: ## Remove the local DB
	@rm -f $(DB_PATH)
	@echo "🧹 Removed $(DB_PATH)"

db-dump: ## Print a full SQL dump to stdout
	@test -f $(DB_PATH) || (echo "DB not found. Run: make db-init" && exit 1)
	sqlite3 $(DB_PATH) ".dump"

db-backup: ## Save a timestamped backup in ./data/backups/
	@test -f $(DB_PATH) || (echo "DB not found. Run: make db-init" && exit 1)
	@mkdir -p data/backups
	@ts=$$(date +"%Y-%m-%d_%H%M%S"); \
	cp $(DB_PATH) data/backups/app_$$ts.sqlite && \
	echo "💾 Backup: data/backups/app_$$ts.sqlite"

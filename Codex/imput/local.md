You are working in a fullstack project (Next.js frontend + Flask backend + Capacitor mobile build).

Your goal is to implement a COMPLETE LOCAL-FIRST + APK BUILD SYSTEM so that the developer only needs to run:

    make update-apk-auto

and the app works both ONLINE and OFFLINE (no ngrok required for testing).

-----------------------
PHASE 1: OFFLINE-FIRST FRONTEND
-----------------------

1. Detect all API calls (fetch/axios).

2. Create a service layer:
   - apiGet / apiPost / apiPut / apiDelete
   - If online → call backend API
   - If offline OR request fails → fallback to local storage

3. Add global config:
   - IS_OFFLINE_MODE (true/false)

4. Implement local storage:
   - Use localStorage for now (simple implementation)
   - Store:
     - habits
     - sessions
     - progress

5. Replace ALL direct API calls with service layer.

6. Ensure app works fully offline:
   - Create habits
   - Edit habits
   - Track progress
   - View history

IMPORTANT:
Do NOT remove backend support. This must be hybrid (online + offline fallback).

-----------------------
PHASE 2: CAPACITOR + APK SETUP
-----------------------

1. Ensure Capacitor is installed:
   - @capacitor/core
   - @capacitor/cli

2. If not initialized:
   - npx cap init "StreakUP" "com.streakup.app"

3. Configure build output correctly (Next.js export or build folder).

4. Add Android platform:
   - npx cap add android

5. Ensure:
   - npx cap sync android works

-----------------------
PHASE 3: MAKEFILE AUTOMATION
-----------------------

Update/Create Makefile with:

--------------------------------
make build_frontend
--------------------------------
- Build frontend production

--------------------------------
make sync_android
--------------------------------
- Run: npx cap sync android

--------------------------------
make build_apk
--------------------------------
- cd android && ./gradlew assembleDebug

--------------------------------
make update-apk-auto
--------------------------------
This command MUST:

1. Print "🚀 Building APK..."
2. Build frontend
3. Sync capacitor
4. Build APK
5. Print final APK path:
   android/app/build/outputs/apk/debug/app-debug.apk

--------------------------------
make run_local
--------------------------------
- Runs frontend in offline mode

--------------------------------
make dev
--------------------------------
- Runs backend + frontend (online mode)

-----------------------
RULES
-----------------------

- Do NOT break existing project structure
- Keep code clean and modular
- Use bash-compatible Makefile
- Add helpful logs (echo)
- Fail safely if something is missing

-----------------------
OUTPUT
-----------------------

1. Summary of changes
2. Updated service layer code
3. Local storage implementation
4. Updated frontend API usage
5. Full Makefile
6. Instructions to test offline mode

-----------------------
GOAL
-----------------------

After this, the developer should:

- Run: make update-apk-auto
- Install APK
- App works WITHOUT internet (offline mode)
- App works WITH internet (API mode)

This is required for local testing without ngrok.
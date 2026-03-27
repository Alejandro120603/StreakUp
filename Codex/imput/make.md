You are working in a fullstack project repository.

Your task is to analyze the project and then implement a developer-friendly Makefile.

-----------------------
PHASE 1: RECON (ANALYSIS)
-----------------------

1. Detect backend:
   - Entry point (run.py, app.py, main.py, etc.)
   - Framework (Flask, FastAPI, etc.)
   - Dependency management (requirements.txt, pyproject.toml)

2. Detect frontend:
   - Framework (Next.js, React, Vite, etc.)
   - Extract scripts from package.json

3. Detect environment:
   - Check if .venv is used
   - Identify how backend and frontend are currently run

4. Determine:
   - Backend run command
   - Frontend run command
   - Dependency install commands

-----------------------
PHASE 2: IMPLEMENTATION
-----------------------

Create or update the following:

1. requirements.txt (if missing):
   - Infer dependencies from backend imports
   - Keep it clean and minimal

2. Makefile at project root with these commands:

- make help
  → List all available commands

- make venv
  → Create Python virtual environment (.venv)

- make install_requirements
  → Create .venv if not exists
  → Install backend dependencies (pip install -r requirements.txt)
  → Install frontend dependencies (npm install)

- make run_backend
  → Activate .venv
  → Run backend using detected entry point

- make run_frontend
  → Navigate to frontend folder
  → Run dev server using detected script

-----------------------
RULES
-----------------------

- Use bash-compatible syntax
- Do NOT break existing structure
- Keep commands simple and readable
- Add helpful echo messages
- Handle missing .venv safely
- Assume Linux/Mac environment

-----------------------
OUTPUT
-----------------------

1. Summary of detected commands
2. Generated requirements.txt (if created)
3. Full Makefile
You are generating the initial backend project structure for a production-ready Flask API called "StreakUP".

IMPORTANT:
- DO NOT implement business logic.
- DO NOT implement database models fully.
- DO NOT implement endpoints fully.
- ONLY generate the folder structure and placeholder files.
- Each file must contain clear comments explaining what will live there.
- Create README-style docstrings inside empty modules explaining their responsibility.
- Follow clean architecture principles.
- Use Flask + SQLAlchemy + Flask-JWT-Extended.
- Target Python 3.11.

Create the following structure:

streakup-backend/
│
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── extensions.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── habit.py
│   │   ├── user_habit.py
│   │   ├── checkin.py
│   │   └── xp_log.py
│   │
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── habit_routes.py
│   │   ├── checkin_routes.py
│   │   ├── user_routes.py
│   │   └── sync_routes.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── xp_service.py
│   │   ├── streak_service.py
│   │   ├── difficulty_service.py
│   │   └── sync_service.py
│   │
│   ├── schemas/
│   │   └── validations.py
│   │
│   ├── utils/
│   │   ├── helpers.py
│   │   └── error_handler.py
│   │
│   └── middleware/
│       └── permissions.py
│
├── migrations/
├── tests/
│
├── run.py
├── requirements.txt
└── .env.example

For each file:

- Add a top-level multiline docstring explaining:
  - What this file is responsible for
  - What kind of logic should live here
  - What should NOT live here

For __init__.py:
- Implement a minimal Flask app factory with placeholder blueprint registration comments.
- Do not register real routes yet.

For config.py:
- Add a basic Config class with placeholder environment variables.

For extensions.py:
- Initialize SQLAlchemy and JWTManager but do not configure advanced behavior.

For run.py:
- Create a minimal app runner using create_app().

For requirements.txt:
- Add:
  flask
  flask-sqlalchemy
  flask-jwt-extended
  flask-migrate
  python-dotenv

Do NOT implement:
- Business logic
- Real database fields
- Real endpoints
- Real services

Only architecture scaffolding and documentation comments.

The output should be ready to run as a project skeleton.
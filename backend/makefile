dev:
	uv run uvicorn app.main:app --reload --port 8000

test:
	uv run pytest

lint:
	uv run ruff check app/

lint_fix:
	uv run ruff check app/ --fix && uv run ruff format app/

bundle:
	uv run python -c "import app.main"
	
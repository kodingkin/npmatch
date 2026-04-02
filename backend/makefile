dev:
	uv run uvicorn app.main:app --reload --port 8000

test:
	uv run pytest

lint:
	uv run ruff check app/

bundle:
	uv run python -c "import app.main"
	
dev:
	docker compose -f 'docker-compose.yml' up -d --build
openclaude: 
	openclaude --provider-env-file .env

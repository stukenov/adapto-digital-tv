# ADAPTO Monorepo Makefile
.PHONY: help deploy-prod docker-setup

# Default target
help: ## Show this help message
	@echo "ADAPTO Monorepo Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# =============================================================================
# Production Commands
# =============================================================================

deploy-prod: ## Deploy to production (git pull + docker compose)
	@echo "🚀 Deploying to production..."
	@echo "📦 Updating system packages..."
	apt update && apt upgrade -y && apt autoremove -y
	@echo "📥 Pulling latest changes from git..."
	git pull
	@echo "🐳 Starting production with Caddy..."
	mkdir -p media/hls
	mkdir -p media/uploads
	mkdir -p uploads
	mkdir -p storage/seaweedfs/master
	mkdir -p storage/seaweedfs/volume
	mkdir -p storage/seaweedfs/filer
	docker compose -f docker-compose.yml up -d --build --remove-orphans
	@echo "🔄 Restarting Caddy..."
	docker restart caddy
	@echo "✅ Production deployment completed!"

# Deprecated target kept for backward compatibility with old scripts
docker-setup: ## Deprecated; use `make deploy-prod` instead
	@echo "🔧 'docker-setup' is deprecated. Use 'make deploy-prod'."
	@true
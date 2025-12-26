# Justfile für D4D Projekt

# Standard-Recipe (zeigt verfügbare Befehle)
default:
    @just --list

# Docker-Befehle
# ===============

# Generiert SSL-Zertifikate für lokale Entwicklung
generate-certs:
    ./nginx/generate-certs.sh

# Startet alle Services mit docker-compose
up:
    @if [ ! -d "./nginx/certs" ]; then \
        echo "🔐 SSL-Zertifikate werden generiert..."; \
        ./nginx/generate-certs.sh; \
    fi
    docker compose -f docker-compose.dev.yaml up --build

# Startet Services im Hintergrund
up-d:
    @if [ ! -d "./nginx/certs" ]; then \
        echo "🔐 SSL-Zertifikate werden generiert..."; \
        ./nginx/generate-certs.sh; \
    fi
    docker compose -f docker-compose.dev.yaml up -d --build

# Stoppt alle Services und entfernt Volumes
down:
    docker compose -f docker-compose.dev.yaml down -v

# Stoppt alle Services
down-no-v:
    docker compose -f docker-compose.dev.yaml down
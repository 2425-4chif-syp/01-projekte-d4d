# Justfile für D4D Projekt

# Standard-Recipe (zeigt verfügbare Befehle)
default:
    @just --list

# Docker-Befehle
# ===============

# Startet alle Services mit docker-compose
up:
    docker compose -f docker-compose.dev.yaml up --build

# Startet Services im Hintergrund
up-d:
    docker compose -f docker-compose.dev.yaml up -d --build

# Stoppt alle Services und entfernt Volumes
down:
    docker compose -f docker-compose.dev.yaml down -v

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
up-detached:
    docker compose -f docker-compose.dev.yaml up -d --build

# Stoppt alle Services und entfernt Volumes
down:
    docker compose -f docker-compose.dev.yaml down -v

# Stoppt Services ohne Volumes zu entfernen
stop:
    docker compose -f docker-compose.dev.yaml stop

# Zeigt laufende Container
ps:
    docker compose -f docker-compose.dev.yaml ps

# Zeigt Logs aller Services
logs:
    docker compose -f docker-compose.dev.yaml logs -f

# Zeigt Logs eines spezifischen Services
logs-service service:
    docker compose -f docker-compose.dev.yaml logs -f {{service}}

# Neustart aller Services
restart:
    docker compose -f docker-compose.dev.yaml restart

# Bereinigt Docker (Container, Images, Volumes)
clean: down
    docker system prune -af --volumes

#!/bin/sh
# Faz um dump do Postgres de produção usando o serviço db-backup do compose.
# Uso: backup-db.sh <tipo> [sufixo]
#   tipo: pre-deploy | daily | manual   (a retenção é separada por tipo)
# Variáveis opcionais:
#   COMPOSE_FILE  compose a usar (padrão do docker compose: docker-compose.yml)
#   KEEP          quantos backups manter por tipo (padrão 14)
#
# Restaurar (sobrescreve o banco!):
#   docker compose run --rm -T db-backup \
#     sh -c 'pg_restore --clean --if-exists -d "$PGDATABASE"' < backups/<arquivo>.dump
set -eu
cd "$(dirname "$0")"

KIND="${1:?informe o tipo: pre-deploy | daily | manual}"
SUFFIX="${2:-}"
KEEP="${KEEP:-14}"

mkdir -p backups
name="${KIND}_$(date -u +%Y%m%dT%H%M%SZ)${SUFFIX:+_$SUFFIX}.dump"
tmp="backups/.${name}.partial"

trap 'rm -f "$tmp"' EXIT
docker compose run --rm -T db-backup > "$tmp"

if [ ! -s "$tmp" ]; then
  echo "Backup vazio, abortando." >&2
  exit 1
fi
mv "$tmp" "backups/$name"
echo "Backup salvo em backups/$name ($(du -h "backups/$name" | cut -f1))"

# Retenção: mantém só os $KEEP mais recentes deste tipo.
# shellcheck disable=SC2012 # nomes gerados por este script, sem espaços
ls -1t backups/"${KIND}"_*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f --

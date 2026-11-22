#!/bin/sh
# Executado na VPS pelo cd.yml, dentro do diretório fincontrol/.
# Espera docker-compose.next.yml (enviado pelo workflow) ao lado deste script.
#
# Ordem pensada para não deixar a VPS num estado misto:
#   1. pull das imagens novas  -> se falhar, nada mudou
#   2. backup do banco          -> se falhar, nada mudou
#   3. troca o compose e sobe   -> o backend roda as migrações ao iniciar
#   4. health check             -> falha o deploy se a API não responder
set -eu
cd "$(dirname "$0")"

: "${IMAGE_TAG:?IMAGE_TAG não definido}"
export IMAGE_TAG
NEXT=docker-compose.next.yml
SHORT_TAG=$(printf '%.7s' "$IMAGE_TAG")

echo "==> Baixando imagens ($SHORT_TAG)"
docker compose -f "$NEXT" pull

echo "==> Backup do banco antes das migrações"
COMPOSE_FILE="$NEXT" sh ./backup-db.sh pre-deploy "$SHORT_TAG"

echo "==> Subindo containers"
mv "$NEXT" docker-compose.yml
docker compose up -d

# Login com credenciais inexistentes: 401 prova que nginx, backend e banco
# estão respondendo (502/000 enquanto o backend sobe ou se as migrações falharem).
echo "==> Health check"
url="${HEALTHCHECK_URL:-http://127.0.0.1/api/auth/login}"
payload='{"email":"healthcheck@deploy.invalid","password":"healthcheck"}'
code=000
attempt=1
while [ "$attempt" -le 36 ]; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 -X POST \
    -H 'Content-Type: application/json' --data "$payload" "$url" || true)
  if [ "$code" = 401 ]; then
    echo "API respondendo (HTTP 401 esperado)."
    break
  fi
  echo "  tentativa $attempt/36: HTTP $code"
  attempt=$((attempt + 1))
  sleep 5
done

if [ "$code" != 401 ]; then
  echo "Health check falhou. Estado dos containers e logs do backend:" >&2
  docker compose ps >&2
  docker compose logs --tail 100 backend >&2
  exit 1
fi

docker image prune -f
echo "==> Deploy de $SHORT_TAG concluído"

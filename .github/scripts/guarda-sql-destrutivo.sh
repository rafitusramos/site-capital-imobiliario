#!/usr/bin/env bash
# Guarda de SQL destrutivo nas migrations.
#
# Falha se uma migration ADICIONADA ou MODIFICADA neste PR/push contiver
# `drop table`, `truncate` ou `delete from` (sem diferenciar maiúsculas), a menos
# que o arquivo tenha a linha exata `-- destrutivo: aprovado`. Migrations antigas
# que não foram tocadas não são lidas.
#
# Entrada: variável BASE (SHA ou ref base do diff). Sem BASE, usa HEAD^.
# Roda ANTES de conectar ao banco, que é compartilhado com a produção.
set -euo pipefail

BASE="${BASE:-}"
if [ -z "$BASE" ] || [[ "$BASE" =~ ^0+$ ]] || ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  BASE="HEAD^"
fi

arquivos=$(git diff --name-only --diff-filter=AM "$BASE" HEAD -- 'supabase/migrations/*.sql' || true)
if [ -z "$arquivos" ]; then
  echo "Nenhuma migration adicionada ou modificada; nada a verificar."
  exit 0
fi

falhou=0
while IFS= read -r arquivo; do
  [ -f "$arquivo" ] || continue
  if grep -Eiq '(drop[[:space:]]+table|truncate|delete[[:space:]]+from)' "$arquivo"; then
    if grep -Eq '^-- destrutivo: aprovado[[:space:]]*$' "$arquivo"; then
      echo "::warning file=${arquivo}::SQL destrutivo aprovado pela marca '-- destrutivo: aprovado'."
    else
      echo "::error file=${arquivo}::Migration com drop table/truncate/delete from. Se for intencional, adicione a linha '-- destrutivo: aprovado' ao arquivo."
      falhou=1
    fi
  else
    echo "OK: ${arquivo}"
  fi
done <<< "$arquivos"

exit "$falhou"

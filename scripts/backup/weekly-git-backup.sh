#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCK_DIR="/tmp/corretor-one-weekly-backup.lock"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Backup semanal ja em execucao."
  exit 0
fi
trap 'rmdir "$LOCK_DIR" >/dev/null 2>&1 || true' EXIT

cd "$REPO_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Diretorio nao e um repositorio git: $REPO_DIR"
  exit 1
fi

if [[ -n "$(git diff --name-only --diff-filter=U)" ]]; then
  echo "Conflitos de merge detectados. Backup semanal ignorado."
  exit 0
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" == "HEAD" ]]; then
  echo "Repositorio em detached HEAD. Backup semanal ignorado."
  exit 0
fi

git update-index -q --refresh || true

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  echo "Sem alteracoes para backup."
  exit 0
fi

git add -A

if git diff --cached --quiet; then
  echo "Sem alteracoes apos git add."
  exit 0
fi

STAMP="$(date '+%Y-%m-%d %H:%M:%S %Z')"
git commit -m "backup: snapshot automatico semanal ${STAMP}"
git push origin "$BRANCH"

echo "Backup semanal concluido em ${STAMP} (branch: ${BRANCH})."

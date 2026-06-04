#!/usr/bin/env bash
# Sync .env + vercel/.env vers Vercel (production, preview, development).
# Preview : workaround CLI — ajouter "" en fin de commande.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

read_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$file" | grep -v '^#'
}

merge_env() {
  read_env_file .env
  read_env_file vercel/.env
}

get_val() {
  local key="$1"
  merge_env | grep -m1 "^${key}=" 2>/dev/null | cut -d= -f2- || true
}

ADMIN_KEY="$(vercel env run development -- node -pe 'process.env.ADMIN_PANEL_KEY' 2>/dev/null | tail -1 || true)"
if [[ -z "$ADMIN_KEY" || ${#ADMIN_KEY} -lt 16 ]]; then
  ADMIN_KEY="$(get_val ADMIN_PANEL_KEY)"
fi
if [[ -z "$ADMIN_KEY" ]]; then
  ADMIN_KEY="$(get_val VITE_ADMIN_PANEL_KEY)"
fi
if [[ -z "$ADMIN_KEY" ]]; then
  echo "ERREUR: définis ADMIN_PANEL_KEY sur Vercel development ou dans vercel/.env" >&2
  exit 1
fi

VARS=(
  GEMINI_API_KEY MISTRAL_API_KEY
  FIREBASE_API_KEY FIREBASE_PROJECT_ID
  ADMIN_PANEL_KEY VITE_ADMIN_PANEL_KEY
  VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_STORAGE_BUCKET VITE_FIREBASE_MESSAGING_SENDER_ID
  VITE_FIREBASE_APP_ID VITE_FIREBASE_MEASUREMENT_ID
  REACT_APP_FIREBASE_API_KEY REACT_APP_FIREBASE_AUTH_DOMAIN REACT_APP_FIREBASE_PROJECT_ID
  REACT_APP_FIREBASE_STORAGE_BUCKET REACT_APP_FIREBASE_MESSAGING_SENDER_ID
  REACT_APP_FIREBASE_APP_ID REACT_APP_FIREBASE_MEASUREMENT_ID
  CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET CLOUDINARY_URL
  VITE_CLOUDINARY_CLOUD_NAME REACT_APP_CLOUDINARY_CLOUD_NAME
  PANEL_FIRESTORE_EMAIL PANEL_FIRESTORE_PASSWORD
)

add_var() {
  local name="$1" value="$2" target="$3"
  [[ -n "$value" ]] || return 0
  echo "  $name -> $target"
  if [[ "$target" == "preview" ]]; then
    vercel env add "$name" "$target" --value "$value" --yes --force --non-interactive "" \
      || echo "    WARN $name $target"
  else
    vercel env add "$name" "$target" --value "$value" --yes --force \
      || echo "    WARN $name $target"
  fi
}

for target in "${@:-production preview development}"; do
  echo "== $target =="
  for name in "${VARS[@]}"; do
    value="$(get_val "$name")"
    if [[ "$name" == "FIREBASE_API_KEY" && -z "$value" ]]; then
      value="$(get_val VITE_FIREBASE_API_KEY)"
    fi
    if [[ "$name" == "FIREBASE_PROJECT_ID" && -z "$value" ]]; then
      value="$(get_val VITE_FIREBASE_PROJECT_ID)"
    fi
    if [[ "$name" == "ADMIN_PANEL_KEY" || "$name" == "VITE_ADMIN_PANEL_KEY" ]]; then
      value="$ADMIN_KEY"
    fi
    add_var "$name" "$value" "$target"
  done
done

echo "OK (clé admin: ${#ADMIN_KEY} caractères). Redéploie : vercel --prod"

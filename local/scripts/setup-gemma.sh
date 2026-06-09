#!/usr/bin/env bash
set -euo pipefail

MODEL_NAME="gemma-quizbit"
MODEL_FILE="/home/ravel/Desktop/gemma4/lm/gemma-4-E2B-it-Q4_K_M.gguf"
MODELF_PATH="local/scripts/Modelfile-gemma"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Erreur: Ollama n'est pas installe."
  exit 1
fi

if [ ! -f "$MODEL_FILE" ]; then
  echo "Erreur: Le fichier $MODEL_FILE est introuvable."
  exit 1
fi

echo "Importation du modele $MODEL_NAME dans Ollama..."
ollama create "$MODEL_NAME" -f "$MODELF_PATH"

echo ""
echo "Configuration du projet pour utiliser $MODEL_NAME par defaut..."
# On peut creer un .env local ou modifier le code. 
# Creons un .env local pour ne pas casser le code source original mais prioriser ce modele.
echo "OLLAMA_MODEL=$MODEL_NAME" > local/.env

echo "Succes ! Le modele $MODEL_NAME est pret."
echo "Relance le serveur local avec: npm start (dans le dossier local)"

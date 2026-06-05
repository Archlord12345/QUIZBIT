#!/usr/bin/env bash
set -euo pipefail

MODEL="${OLLAMA_MODEL:-smollm2:135m-instruct-q4_1}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama n est pas installe."
  echo "Installe-le depuis https://ollama.com puis relance ce script."
  exit 1
fi

echo "Installation du modele QuizBit local: ${MODEL} (~98 Mo)"
ollama pull "${MODEL}"

echo ""
echo "Test rapide..."
ollama run "${MODEL}" "Reponds uniquement OK" >/dev/null

echo "OK — modele pret pour /api/generate-questions (provider auto ou ollama)."

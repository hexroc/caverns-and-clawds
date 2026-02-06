#!/bin/bash
# Run strategic Ollama bot every 5 minutes
# Slower but has personality!

cd "$(dirname "$0")/.."

echo "🧠 Starting Strategic Bot (Ollama)"
echo "   Tactician (Ghost Wizard)"
echo "   Using: phi3:mini model"
echo ""
echo "Running every 5 minutes (slow but strategic!)"
echo "Press Ctrl+C to stop."
echo ""

while true; do
  node bin/ollama-bot.js
  echo ""
  echo "⏳ Waiting 5 minutes until next turn..."
  sleep 300  # 5 minutes
done

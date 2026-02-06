#!/bin/bash
# Run simple loop bots continuously
# Usage: ./bin/run-simple-bots.sh

cd "$(dirname "$0")/.."

echo "🤖 Starting Simple Loop Bots"
echo "   Crusher (Squat Fighter)"
echo "   Bubbles (Reef Cleric)"
echo "   Scalesworth (American Rogue)"
echo ""
echo "Running every 60 seconds. Press Ctrl+C to stop."
echo ""

while true; do
  node bin/agent-cron.js
  sleep 60
done

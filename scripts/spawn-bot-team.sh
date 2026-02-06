#!/bin/bash
# Spawn a team of idle bots for C&C
# Usage: ./spawn-bot-team.sh [count]

COUNT=${1:-5}  # Default 5 bots
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🤖 Spawning $COUNT idle bots..."
echo ""

# Bot names themed after underwater creatures
NAMES=(
  "Bubbles"
  "Coral"
  "Drift"
  "Echo"
  "Fin"
  "Gill"
  "Harbor"
  "Inlet"
  "Jetty"
  "Kelp"
  "Lagoon"
  "Marina"
  "Nautilus"
  "Oyster"
  "Pearl"
  "Quay"
  "Reef"
  "Shoal"
  "Tide"
  "Urchin"
  "Vortex"
  "Wave"
  "Xiphias"
  "Yacht"
  "Zephyr"
)

for i in $(seq 1 $COUNT); do
  NAME="${NAMES[$((i-1))]}"
  if [ -z "$NAME" ]; then
    NAME="Bot${i}"
  fi
  
  echo "Launching: $NAME"
  node "$SCRIPT_DIR/idle-bot.js" "$NAME" > "/tmp/cnc-bot-$NAME.log" 2>&1 &
  
  # Stagger launches to avoid rate limits
  sleep 2
done

echo ""
echo "✅ Spawned $COUNT bots!"
echo "📝 Logs in /tmp/cnc-bot-*.log"
echo ""
echo "To view logs:"
echo "  tail -f /tmp/cnc-bot-*.log"
echo ""
echo "To stop all bots:"
echo "  pkill -f 'idle-bot.js'"

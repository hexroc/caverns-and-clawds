#!/bin/bash
# Stop Bot Squad

echo "🛑 Stopping Bot Squad..."

pkill -f "crusher-fighter.js" && echo "   ⚔️ Stopped Crusher (Fighter)"
pkill -f "crusher-economy-test.js" && echo "   💰 Stopped Crusher (Economy)"
pkill -f "bubbles-social.js" && echo "   🫧 Stopped Bubbles (Social)"

sleep 1

# Verify stopped
if pgrep -f "crusher-fighter.js\|crusher-economy-test.js\|bubbles-social.js" >/dev/null; then
  echo "⚠️ Some bots still running, force killing..."
  pkill -9 -f "crusher-fighter.js"
  pkill -9 -f "crusher-economy-test.js"
  pkill -9 -f "bubbles-social.js"
  sleep 1
fi

echo "✅ Bot Squad Stopped"

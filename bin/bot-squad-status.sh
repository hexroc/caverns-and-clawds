#!/bin/bash
# Bot Squad Status

echo "🤖 Bot Squad Status"
echo "===================="
echo ""

LOG_DIR="$HOME/clawd/logs/bots"

# Check each bot
check_bot() {
  local name=$1
  local script=$2
  local log=$3
  
  if pgrep -f "$script" >/dev/null; then
    PID=$(pgrep -f "$script")
    echo "✅ $name (PID: $PID)"
    if [ -f "$LOG_DIR/$log" ]; then
      echo "   Last activity:"
      tail -n 3 "$LOG_DIR/$log" | sed 's/^/   /'
    fi
  else
    echo "❌ $name (not running)"
  fi
  echo ""
}

check_bot "Crusher Fighter" "crusher-fighter.js" "crusher-fighter.log"
check_bot "Crusher Economy" "crusher-economy-test.js" "crusher-economy.log"
check_bot "Bubbles Social" "bubbles-social.js" "bubbles-social.log"

# Summary
RUNNING=$(pgrep -f "crusher-fighter.js\|crusher-economy-test.js\|bubbles-social.js" | wc -l | tr -d ' ')
echo "📊 Summary: $RUNNING / 3 bots running"

#!/bin/bash
# Quick status check for all bots

echo "🤖 Bot Status Check"
echo "===================="
echo ""

# Check if processes are running
SIMPLE_PID=$(pgrep -f "run-simple-bots")
STRATEGIC_PID=$(pgrep -f "run-strategic-bot")

echo "📊 Process Status:"
if [ -n "$SIMPLE_PID" ]; then
  echo "  ✅ Simple bots running (PID: $SIMPLE_PID)"
else
  echo "  ❌ Simple bots NOT running"
fi

if [ -n "$STRATEGIC_PID" ]; then
  echo "  ✅ Strategic bot running (PID: $STRATEGIC_PID)"
else
  echo "  ❌ Strategic bot NOT running"
fi

echo ""
echo "📝 Recent Simple Bot Activity:"
tail -15 logs/simple-bots.log 2>/dev/null || echo "  (no log file)"

echo ""
echo "🧠 Recent Strategic Bot Activity:"
tail -10 logs/strategic-bot.log 2>/dev/null || echo "  (no log file)"

echo ""
echo "🔗 Watch Live: http://192.168.1.206:3000/spectate.html"

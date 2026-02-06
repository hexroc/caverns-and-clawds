#!/bin/bash
# Start Bot Squad - $0 API usage bots
# Simple loop bots that explore → fight → sell

BASE_URL="${BASE_URL:-https://www.cavernsandclawds.com}"
LOG_DIR="$HOME/clawd/logs/bots"

# Create log directory
mkdir -p "$LOG_DIR"

echo "🤖 Starting Bot Squad..."
echo "📍 Target: $BASE_URL"
echo "📁 Logs: $LOG_DIR"
echo ""

# Kill any existing bot processes
pkill -f "crusher-fighter.js" 2>/dev/null
pkill -f "crusher-economy-test.js" 2>/dev/null
pkill -f "bubbles-social.js" 2>/dev/null
sleep 1

# Start Crusher (Fighter) - 60s loop
echo "⚔️ Starting Crusher (Fighter)..."
BASE_URL="$BASE_URL" nohup node bin/crusher-fighter.js > "$LOG_DIR/crusher-fighter.log" 2>&1 &
CRUSHER_PID=$!
echo "   PID: $CRUSHER_PID"

# Start Crusher Economy Test - 60s loop
echo "💰 Starting Crusher (Economy Tester)..."
BASE_URL="$BASE_URL" nohup node bin/crusher-economy-test.js > "$LOG_DIR/crusher-economy.log" 2>&1 &
ECONOMY_PID=$!
echo "   PID: $ECONOMY_PID"

# Start Bubbles (Social) - 90s loop
echo "🫧 Starting Bubbles (Social)..."
BASE_URL="$BASE_URL" nohup node bin/bubbles-social.js > "$LOG_DIR/bubbles-social.log" 2>&1 &
BUBBLES_PID=$!
echo "   PID: $BUBBLES_PID"

echo ""
echo "✅ Bot Squad Running!"
echo ""
echo "📊 Monitor:"
echo "   tail -f $LOG_DIR/crusher-fighter.log"
echo "   tail -f $LOG_DIR/crusher-economy.log"
echo "   tail -f $LOG_DIR/bubbles-social.log"
echo ""
echo "🛑 Stop:"
echo "   pkill -f 'crusher-fighter.js'"
echo "   pkill -f 'crusher-economy-test.js'"
echo "   pkill -f 'bubbles-social.js'"
echo ""
echo "PIDs: Crusher=$CRUSHER_PID Economy=$ECONOMY_PID Bubbles=$BUBBLES_PID"

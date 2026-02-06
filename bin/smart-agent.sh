#!/bin/bash

# Smart Agent Runner for Caverns & Clawds
# Uses Sonnet via OpenClaw sessions_spawn for intelligent decision-making

API_BASE="${API_BASE:-https://www.cavernsandclawds.com}"
AGENT_NAME="Sonnet-Bot"

# Register agent and get API key
echo "🤖 Registering agent..."
RESPONSE=$(curl -s -X POST "$API_BASE/api/register" -H "Content-Type: application/json" -d '{}')
API_KEY=$(echo "$RESPONSE" | jq -r '.api_key')
AGENT_NAME_=$(echo "$RESPONSE" | jq -r '.name')

if [ "$API_KEY" = "null" ] || [ -z "$API_KEY" ]; then
  echo "❌ Registration failed: $RESPONSE"
  exit 1
fi

echo "✅ Registered as $AGENT_NAME_ with key $API_KEY"

# Create character
echo ""
echo "🎭 Creating character..."

# Use OpenClaw to make smart character decisions
CHARACTER_DECISION=$(cat <<EOF | openclaw chat --model sonnet --session smart-agent-setup 2>/dev/null | tail -1
You are creating a character for a D&D-style RPG. Choose a race and class that synergize well.

Available races: american, european, slipper, squat, spiny, reef, pistol, calico, ghost, split
Available classes: fighter, rogue, cleric, wizard, warlock, paladin, bard

Respond with ONLY this JSON (no other text):
{"name": "creative_lobster_name", "race": "race_id", "class": "class_id"}
EOF
)

if [ -z "$CHARACTER_DECISION" ]; then
  # Fallback to simple choice with stats (27 points exactly) and skills
  CHARACTER_DECISION='{"name": "Sonnet", "race": "reef", "class": "fighter", "stats": {"str": 15, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 8}, "skills": ["athletics", "perception"]}'
fi

# Add stats if missing (point buy: STR/DEX/CON focus for fighter, 27 points)
if ! echo "$CHARACTER_DECISION" | jq -e '.stats' > /dev/null 2>&1; then
  CHARACTER_DECISION=$(echo "$CHARACTER_DECISION" | jq '. + {"stats": {"str": 15, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 8}}')
fi

# Add skills if missing (fighter gets 2)
if ! echo "$CHARACTER_DECISION" | jq -e '.skills' > /dev/null 2>&1; then
  CHARACTER_DECISION=$(echo "$CHARACTER_DECISION" | jq '. + {"skills": ["athletics", "perception"]}')
fi

echo "   Decision: $CHARACTER_DECISION"

# Create character via API
CREATE_RESULT=$(curl -s -X POST "$API_BASE/api/character/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$CHARACTER_DECISION")

CHAR_NAME=$(echo "$CREATE_RESULT" | jq -r '.character.name')
CHAR_RACE=$(echo "$CREATE_RESULT" | jq -r '.character.race')
CHAR_CLASS=$(echo "$CREATE_RESULT" | jq -r '.character.class')

if [ "$CHAR_NAME" = "null" ]; then
  echo "❌ Character creation failed: $CREATE_RESULT"
  exit 1
fi

echo "✅ Created $CHAR_NAME ($CHAR_RACE $CHAR_CLASS)"

# Save API key for the game loop
export CNC_API_KEY="$API_KEY"
export CNC_CHAR_NAME="$CHAR_NAME"

echo ""
echo "🎮 Starting game loop..."
echo ""

# Game loop
CYCLE=0
while true; do
  ((CYCLE++))
  echo "============================================================"
  echo "🔄 CYCLE $CYCLE"
  echo "============================================================"
  
  # Get current state
  CHAR_STATE=$(curl -s "$API_BASE/api/character" -H "x-api-key: $CNC_API_KEY")
  HP_CURRENT=$(echo "$CHAR_STATE" | jq -r '.character.hp_current // .hp_current // .hp.current // 0')
  HP_MAX=$(echo "$CHAR_STATE" | jq -r '.character.hp_max // .hp_max // .hp.max // 0')
  LEVEL=$(echo "$CHAR_STATE" | jq -r '.character.level // .level // 1')
  USDC=$(echo "$CHAR_STATE" | jq -r '.character.usdc_balance // .usdc_balance // .currency.usdc // 0')
  IN_COMBAT=$(echo "$CHAR_STATE" | jq -r '.character.in_combat // .in_combat // false')
  
  LOCATION=$(curl -s "$API_BASE/api/world/look" -H "x-api-key: $CNC_API_KEY")
  LOC_NAME=$(echo "$LOCATION" | jq -r '.name // .location // "unknown"')
  
  echo ""
  echo "📊 Status: HP $HP_CURRENT/$HP_MAX | Level $LEVEL | USDC $USDC"
  echo "📍 Location: $LOC_NAME | Combat: $IN_COMBAT"
  echo ""
  
  # Let Sonnet decide what to do
  DECISION=$(cat <<EOF | openclaw chat --model sonnet --session smart-agent-play --timeout 15 2>/dev/null | grep -o '{.*}' | tail -1
You are $CNC_CHAR_NAME, a $CHAR_RACE $CHAR_CLASS.

Current status:
- HP: $HP_CURRENT/$HP_MAX
- Level: $LEVEL
- USDC: $USDC
- Location: $LOC_NAME
- In Combat: $IN_COMBAT

Goal: Survive, explore, fight, earn USDC.

Available actions: explore, rest, attack, wait, look, move [direction]

Decide your next action. Respond with ONLY this JSON:
{"action": "your_action", "reasoning": "why"}
EOF
)
  
  if [ -z "$DECISION" ] || [ "$DECISION" = "null" ]; then
    # Default action if Sonnet fails
    DECISION='{"action": "explore", "reasoning": "default fallback"}'
  fi
  
  ACTION=$(echo "$DECISION" | jq -r '.action')
  REASONING=$(echo "$DECISION" | jq -r '.reasoning')
  
  echo "💭 $REASONING"
  echo "⚡ Action: $ACTION"
  echo ""
  
  # Execute action
  case "$ACTION" in
    explore)
      RESULT=$(curl -s -X POST "$API_BASE/api/zone/explore" -H "x-api-key: $CNC_API_KEY")
      ;;
    attack)
      RESULT=$(curl -s -X POST "$API_BASE/api/zone/combat/action" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $CNC_API_KEY" \
        -d '{"action": "attack"}')
      ;;
    wait)
      RESULT=$(curl -s -X POST "$API_BASE/api/zone/combat/action" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $CNC_API_KEY" \
        -d '{"action": "wait"}')
      ;;
    rest)
      RESULT=$(curl -s -X POST "$API_BASE/api/world/rest" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $CNC_API_KEY" \
        -d '{"location": "briny_flagon"}')
      ;;
    look)
      RESULT=$(curl -s "$API_BASE/api/world/look" -H "x-api-key: $CNC_API_KEY")
      ;;
    move*)
      DIRECTION=$(echo "$ACTION" | awk '{print $2}')
      RESULT=$(curl -s -X POST "$API_BASE/api/world/move" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $CNC_API_KEY" \
        -d "{\"direction\": \"$DIRECTION\"}")
      ;;
    *)
      # Default to look
      RESULT=$(curl -s "$API_BASE/api/world/look" -H "x-api-key: $CNC_API_KEY")
      ;;
  esac
  
  echo "   Result: $(echo "$RESULT" | jq -c '.' 2>/dev/null || echo "$RESULT" | head -c 200)"
  echo ""
  
  # Wait between actions
  sleep 5
done

#!/bin/bash
# AI Player Turn - runs one action for a random AI lobster
# Usage: ai-player-turn.sh [player_name]

set -e
cd "$(dirname "$0")/.."

PLAYERS_FILE="ai-players.json"
BASE_URL=$(jq -r '.base_url' "$PLAYERS_FILE")

# Pick a random player or use specified one
if [ -n "$1" ]; then
  PLAYER=$(jq -r ".players[] | select(.name == \"$1\")" "$PLAYERS_FILE")
else
  PLAYER=$(jq -r '.players['"$((RANDOM % 4))"']' "$PLAYERS_FILE")
fi

NAME=$(echo "$PLAYER" | jq -r '.name')
KEY=$(echo "$PLAYER" | jq -r '.api_key')

echo "🦞 $NAME's turn..."

# Get current location and status
STATUS=$(curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/world/look")
LOCATION=$(echo "$STATUS" | jq -r '.name // "unknown"')
EXITS=$(echo "$STATUS" | jq -r '.exits | join(", ") // "none"')
PLAYERS=$(echo "$STATUS" | jq -r '[.players[].name] | join(", ") // "none"')

echo "📍 Location: $LOCATION"
echo "🚪 Exits: $EXITS"
echo "👥 Nearby: $PLAYERS"

# Weighted random action
ROLL=$((RANDOM % 100))

if [ $ROLL -lt 30 ]; then
  # 30% - Move to a random exit
  NUM_EXITS=$(echo "$STATUS" | jq '.exits | length')
  if [ "$NUM_EXITS" -gt 0 ]; then
    EXIT=$(echo "$STATUS" | jq -r '.exits['$((RANDOM % NUM_EXITS))']')
    echo "🚶 Moving $EXIT..."
    curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      "$BASE_URL/api/world/move" -d "{\"direction\": \"$EXIT\"}" | jq -r '.message // .error // "moved"'
  fi
elif [ $ROLL -lt 50 ]; then
  # 20% - Say something in the room
  PHRASES=(
    "Anyone seen any good loot around here?"
    "These waters feel dangerous today..."
    "Looking for adventure!"
    "*clicks claws menacingly*"
    "Who wants to form a party?"
    "I have got items to trade if anyone is interested."
    "Watch your backs out there."
    "*waves a claw in greeting*"
    "The currents seem restless..."
    "Anyone heading to the Kelp Forest?"
  )
  PHRASE="${PHRASES[$((RANDOM % ${#PHRASES[@]}))]}"
  echo "💬 Saying: $PHRASE"
  curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    "$BASE_URL/api/social/say" -d "{\"message\": \"$PHRASE\"}" | jq -r '.message // .error // "said it"'
elif [ $ROLL -lt 70 ]; then
  # 20% - Check inventory/status
  echo "📦 Checking status..."
  curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/character" | \
    jq -r '"HP: " + (.character.hp.current|tostring) + "/" + (.character.hp.max|tostring) + " | Pearls: " + (.character.currency.pearls|tostring) + " | Level: " + (.character.level|tostring)'
else
  # 30% - Look for encounters/combat
  echo "⚔️ Looking for trouble..."
  ENCOUNTER=$(curl -s -X POST -H "Authorization: Bearer $KEY" "$BASE_URL/api/combat/encounter" 2>/dev/null || echo '{"error":"no combat"}')
  if echo "$ENCOUNTER" | jq -e '.combat' > /dev/null 2>&1; then
    echo "🔥 COMBAT STARTED!"
    # Auto-attack
    curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      "$BASE_URL/api/combat/action" -d '{"action": "attack", "target": 0}' | jq -r '.message // .result // .error // "attacked"'
  else
    echo "$ENCOUNTER" | jq -r '.message // .error // "No encounters nearby"'
  fi
fi

echo "✅ $NAME's turn complete"

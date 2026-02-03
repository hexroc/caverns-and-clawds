#!/bin/bash
BASE="http://192.168.1.206:3000/api/capstone"
KEY="test_faithful_key"
ID="ad91bb5e-7f44-4421-a173-b2e483f32df1"

run_action() {
  curl -s -X POST "$BASE/$ID/action" \
    -H "X-API-Key: $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"$1\"}"
}

move() {
  curl -s -X POST "$BASE/$ID/move" \
    -H "X-API-Key: $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"direction\": \"forward\"}"
}

get_status() {
  curl -s "$BASE/$ID" -H "X-API-Key: $KEY"
}

get_combat() {
  curl -s "$BASE/$ID/combat" -H "X-API-Key: $KEY"
}

echo "🦞 Auto-running capstone to find combat..."

# Loot treasure room first
echo "📦 Looting..."
run_action "loot" | jq -r '.message // .error'

# Move forward until we hit combat
for i in {1..10}; do
  echo ""
  echo "🚶 Move $i..."
  MOVE=$(move)
  ROOM=$(echo "$MOVE" | jq -r '.room.type // .type // "unknown"')
  FLOOR=$(echo "$MOVE" | jq -r '.room.floor // .floor // "?"')
  RNUM=$(echo "$MOVE" | jq -r '.room.room // .room // "?"')
  echo "  Floor $FLOOR Room $RNUM: $ROOM"
  
  if [ "$ROOM" = "combat" ]; then
    echo ""
    echo "⚔️ COMBAT FOUND! Checking party..."
    run_action "start_combat" > /dev/null
    sleep 1
    COMBAT=$(get_combat)
    echo "$COMBAT" | jq -r '.combatants[]? | select(.team=="party") | "  \(.char) \(.name) (\(.type)) HP:\(.hp)/\(.maxHp)"'
    
    HENCH_COUNT=$(echo "$COMBAT" | jq '[.combatants[]? | select(.type=="henchman")] | length')
    echo ""
    echo "🦐 Henchmen in party: $HENCH_COUNT"
    break
  elif [ "$ROOM" = "trap" ]; then
    echo "  ⚠️ Trap room - detecting..."
    run_action "detect" | jq -r '.message // .error'
    run_action "disarm" | jq -r '.message // .error'
  elif [ "$ROOM" = "stairs" ]; then
    echo "  🪜 Taking stairs down..."
    curl -s -X POST "$BASE/$ID/move" \
      -H "X-API-Key: $KEY" \
      -H "Content-Type: application/json" \
      -d '{"direction": "down"}' | jq -r '.message // .room.name // "descended"'
  fi
done

#!/bin/bash
BASE="http://192.168.1.206:3000/api/capstone"
KEY="test_faithful_key"
CHAR_ID="char_faithful"

echo "🦞 Creating capstone instance for $CHAR_ID..."
CREATE=$(curl -s -X POST "$BASE/create" \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"characterId\": \"$CHAR_ID\"}")
echo "$CREATE" | jq '.'

ID=$(echo "$CREATE" | jq -r '.capstoneId')
if [ "$ID" = "null" ] || [ -z "$ID" ]; then
  echo "❌ Failed to create instance"
  exit 1
fi
echo "Instance ID: $ID"

echo ""
echo "🚀 Starting run $ID..."
START=$(curl -s -X POST "$BASE/$ID/start" -H "X-API-Key: $KEY")
echo "$START" | jq '.'

echo ""
echo "🗺️ Getting room info..."
ROOM=$(curl -s "$BASE/$ID/room" -H "X-API-Key: $KEY")
echo "$ROOM" | jq '{floor, room, type, cleared, hasCombat}'

echo ""
echo "⚔️ Getting combat..."
COMBAT=$(curl -s "$BASE/$ID/combat" -H "X-API-Key: $KEY")
echo "Party members:"
echo "$COMBAT" | jq -r '.combatants[]? | select(.team=="party") | "  \(.char) \(.name) (\(.type)) HP:\(.hp)/\(.maxHp)"' 2>/dev/null || echo "$COMBAT" | jq '.'

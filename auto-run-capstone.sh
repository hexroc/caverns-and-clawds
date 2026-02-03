#!/bin/bash
# Auto-run capstone dungeon

API="http://192.168.1.206:3000/api/capstone"
KEY="test_faithful_key"
CAPSTONE_ID="$1"

if [ -z "$CAPSTONE_ID" ]; then
  echo "Usage: $0 <capstone_id>"
  exit 1
fi

echo "Auto-running capstone: $CAPSTONE_ID"

while true; do
  # Get current room
  ROOM=$(curl -s "$API/$CAPSTONE_ID/room" -H "X-API-Key: $KEY")
  FLOOR=$(echo "$ROOM" | jq -r '.floor')
  ROOM_NUM=$(echo "$ROOM" | jq -r '.room')
  TYPE=$(echo "$ROOM" | jq -r '.roomInfo.type')
  CLEARED=$(echo "$ROOM" | jq -r '.roomInfo.cleared')
  COMBAT_STATUS=$(echo "$ROOM" | jq -r '.combat.status // "none"')
  
  echo "Floor $FLOOR Room $ROOM_NUM ($TYPE) - Cleared: $CLEARED, Combat: $COMBAT_STATUS"
  
  # If in combat, wait for it to finish
  if [ "$COMBAT_STATUS" = "active" ]; then
    echo "  Combat in progress, waiting..."
    sleep 3
    continue
  fi
  
  # If room not cleared, do room action based on type
  if [ "$CLEARED" != "true" ]; then
    case "$TYPE" in
      "trap")
        echo "  Triggering trap..."
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"detect"}' | jq -r '.message // .error'
        sleep 1
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"proceed"}' | jq -r '.message // .error'
        ;;
      "combat")
        echo "  Starting combat..."
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"engage"}' | jq -r '.message // .error'
        ;;
      "treasure")
        echo "  Looting treasure..."
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"loot"}' | jq -r '.message // .error'
        ;;
      "rest")
        echo "  Resting..."
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"rest"}' | jq -r '.message // .error'
        ;;
      "puzzle")
        echo "  Solving puzzle..."
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"solve"}' | jq -r '.message // .error'
        ;;
      "stairs")
        echo "  Using stairs..."
        # First do action to mark stairs as cleared
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"use"}' | jq -r '.message // .error'
        sleep 1
        # Then move down
        curl -s -X POST "$API/$CAPSTONE_ID/move" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"direction":"down"}' | jq -r '.message // .error'
        ;;
      "boss")
        echo "  BOSS FIGHT!"
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"engage"}' | jq -r '.message // .error'
        ;;
    esac
    sleep 2
    continue
  fi
  
  # Room cleared, move forward
  if [ "$ROOM_NUM" -lt 5 ]; then
    echo "  Moving forward..."
    curl -s -X POST "$API/$CAPSTONE_ID/move" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"direction":"forward"}' | jq -r '.message // .error'
  elif [ "$TYPE" = "stairs" ]; then
    echo "  Descending to next floor..."
    curl -s -X POST "$API/$CAPSTONE_ID/move" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"direction":"down"}' | jq -r '.message // .error'
  else
    echo "  Dungeon complete or stuck!"
    break
  fi
  
  sleep 2
done

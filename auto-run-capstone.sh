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
  
  # Check for completion or failure
  COMPLETED=$(echo "$ROOM" | jq -r '.completed // false')
  if [ "$COMPLETED" = "true" ]; then
    echo "🎉 CAPSTONE COMPLETED! The Dreadnought has been vanquished!"
    exit 0
  fi
  
  # Check capstone status from DB response
  STATUS=$(curl -s "$API/$CAPSTONE_ID/room" -H "X-API-Key: $KEY" | jq -r '.status // "active"')
  if [ "$STATUS" = "completed" ]; then
    echo "🎉 CAPSTONE COMPLETED!"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "💀 CAPSTONE FAILED - Too many deaths!"
    exit 1
  fi
  
  FLOOR=$(echo "$ROOM" | jq -r '.floor')
  ROOM_NUM=$(echo "$ROOM" | jq -r '.room')
  TYPE=$(echo "$ROOM" | jq -r '.roomInfo.type')
  CLEARED=$(echo "$ROOM" | jq -r '.roomInfo.cleared')
  COMBAT_STATUS=$(echo "$ROOM" | jq -r '.combat.status // "none"')
  
  # Check for null/error state
  if [ "$FLOOR" = "null" ] || [ "$TYPE" = "null" ]; then
    echo "⚠️ Invalid state detected (floor=$FLOOR, type=$TYPE)"
    # Check if capstone is actually complete
    DB_STATUS=$(sqlite3 /Users/gamebot/clawd/caverns-and-clawds/db/tavern.db "SELECT status FROM capstone_instances WHERE id='$CAPSTONE_ID';" 2>/dev/null)
    if [ "$DB_STATUS" = "completed" ]; then
      echo "🎉 CAPSTONE COMPLETED!"
      exit 0
    elif [ "$DB_STATUS" = "failed" ]; then
      echo "💀 CAPSTONE FAILED!"
      exit 1
    fi
    echo "Waiting for state to resolve..."
    sleep 3
    continue
  fi
  
  echo "Floor $FLOOR Room $ROOM_NUM ($TYPE) - Cleared: $CLEARED, Combat: $COMBAT_STATUS"
  
  # If in combat, wait for it to finish
  if [ "$COMBAT_STATUS" = "active" ]; then
    echo "  Combat in progress, waiting..."
    sleep 3
    continue
  fi
  
  # Boss room cleared = victory!
  if [ "$TYPE" = "boss" ] && [ "$CLEARED" = "true" ]; then
    echo "🎉 BOSS DEFEATED! CAPSTONE COMPLETE!"
    exit 0
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
        SOLUTION=$(echo "$ROOM" | jq -c '.roomInfo.state.puzzle.solution')
        if [ "$SOLUTION" != "null" ]; then
          curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d "{\"action\":\"solve\", \"answer\":$SOLUTION}" | jq -r '.message // .error'
        else
          curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"skip"}' | jq -r '.message // .error'
        fi
        ;;
      "stairs")
        echo "  Using stairs..."
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"use"}' | jq -r '.message // .error'
        sleep 1
        curl -s -X POST "$API/$CAPSTONE_ID/move" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"direction":"down"}' | jq -r '.message // .error'
        ;;
      "boss")
        echo "  🦀 BOSS FIGHT!"
        curl -s -X POST "$API/$CAPSTONE_ID/action" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"action":"engage"}' | jq -r '.message // .error'
        ;;
      *)
        echo "  Unknown room type: $TYPE"
        sleep 2
        ;;
    esac
    sleep 2
    continue
  fi
  
  # Room cleared, move forward (but not from boss room)
  if [ "$TYPE" = "boss" ]; then
    echo "🎉 BOSS DEFEATED! CAPSTONE COMPLETE!"
    exit 0
  elif [ "$ROOM_NUM" -lt 5 ]; then
    echo "  Moving forward..."
    MOVE_RESULT=$(curl -s -X POST "$API/$CAPSTONE_ID/move" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"direction":"forward"}')
    echo "$MOVE_RESULT" | jq -r '.message // .error'
    # Check if completed
    if echo "$MOVE_RESULT" | jq -e '.completed' > /dev/null 2>&1; then
      echo "🎉 CAPSTONE COMPLETED!"
      exit 0
    fi
  elif [ "$TYPE" = "stairs" ]; then
    echo "  Descending to next floor..."
    curl -s -X POST "$API/$CAPSTONE_ID/move" -H "X-API-Key: $KEY" -H "Content-Type: application/json" -d '{"direction":"down"}' | jq -r '.message // .error'
  else
    echo "  End of floor, looking for stairs..."
  fi
  
  sleep 2
done

#!/bin/bash
# Full capstone autorun with henchmen support

BASE="http://192.168.1.206:3000/api/capstone"
KEY="test_faithful_key"
CHAR="char_faithful"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[RUN]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[X]${NC} $1"; }

# Check for existing run
EXISTING=$(curl -s "$BASE/mine" -H "X-API-Key: $KEY" | jq -r '.active[0].id // empty')
if [ -n "$EXISTING" ]; then
  warn "Existing run found: $EXISTING"
  # Try to complete current combat if any
  COMBAT_STATUS=$(curl -s "$BASE/$EXISTING/combat" -H "X-API-Key: $KEY" | jq -r '.inCombat')
  if [ "$COMBAT_STATUS" = "true" ]; then
    log "Combat in progress, auto-completing..."
    for i in {1..50}; do
      RESULT=$(curl -s -X POST "$BASE/$EXISTING/action" \
        -H "X-API-Key: $KEY" \
        -H "Content-Type: application/json" \
        -d '{"action":"end_turn"}')
      DONE=$(echo "$RESULT" | jq -r '.combatEnded // false')
      if [ "$DONE" = "true" ]; then
        log "Combat ended!"
        break
      fi
      sleep 0.3
    done
  fi
  ID="$EXISTING"
else
  # Create new run
  log "Creating new capstone run..."
  CREATE=$(curl -s -X POST "$BASE/create" \
    -H "X-API-Key: $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"characterId\": \"$CHAR\"}")
  ID=$(echo "$CREATE" | jq -r '.capstoneId')
  if [ "$ID" = "null" ] || [ -z "$ID" ]; then
    err "Failed to create: $(echo $CREATE | jq -r '.error')"
    exit 1
  fi
  
  log "Starting run $ID..."
  curl -s -X POST "$BASE/$ID/start" -H "X-API-Key: $KEY" > /dev/null
fi

log "Run ID: $ID"

# Main dungeon loop
MAX_ROOMS=25
for room_num in $(seq 1 $MAX_ROOMS); do
  # Get current room
  ROOM=$(curl -s "$BASE/$ID/room" -H "X-API-Key: $KEY")
  FLOOR=$(echo "$ROOM" | jq -r '.floor')
  ROOM_NUM=$(echo "$ROOM" | jq -r '.room')
  TYPE=$(echo "$ROOM" | jq -r '.roomInfo.type')
  CLEARED=$(echo "$ROOM" | jq -r '.roomInfo.cleared')
  DEATHS=$(echo "$ROOM" | jq -r '.deathCount')
  
  echo ""
  log "Floor $FLOOR Room $ROOM_NUM: $TYPE (cleared: $CLEARED, deaths: $DEATHS)"
  
  # Handle room based on type
  case "$TYPE" in
    "treasure")
      if [ "$CLEARED" = "false" ]; then
        log "Looting treasure..."
        curl -s -X POST "$BASE/$ID/action" \
          -H "X-API-Key: $KEY" \
          -H "Content-Type: application/json" \
          -d '{"action":"loot"}' | jq -r '.message // .error'
      fi
      ;;
    
    "trap")
      if [ "$CLEARED" = "false" ]; then
        log "Handling trap..."
        curl -s -X POST "$BASE/$ID/action" \
          -H "X-API-Key: $KEY" \
          -H "Content-Type: application/json" \
          -d '{"action":"proceed"}' | jq -r '.message // .error'
      fi
      ;;
    
    "puzzle")
      if [ "$CLEARED" = "false" ]; then
        log "Solving puzzle..."
        curl -s -X POST "$BASE/$ID/action" \
          -H "X-API-Key: $KEY" \
          -H "Content-Type: application/json" \
          -d '{"action":"solve"}' | jq -r '.message // .error'
      fi
      ;;
    
    "rest")
      if [ "$CLEARED" = "false" ]; then
        log "Resting..."
        curl -s -X POST "$BASE/$ID/action" \
          -H "X-API-Key: $KEY" \
          -H "Content-Type: application/json" \
          -d '{"action":"rest"}' | jq -r '.message // .error'
      fi
      ;;
    
    "combat"|"boss")
      COMBAT_ACTIVE=$(echo "$ROOM" | jq -r '.combat != null')
      if [ "$CLEARED" = "false" ]; then
        if [ "$COMBAT_ACTIVE" = "false" ]; then
          log "Starting combat..."
          curl -s -X POST "$BASE/$ID/action" \
            -H "X-API-Key: $KEY" \
            -H "Content-Type: application/json" \
            -d '{"action":"start_combat"}' > /dev/null
        fi
        
        # Show party composition
        COMBAT=$(curl -s "$BASE/$ID/combat" -H "X-API-Key: $KEY")
        log "Party:"
        echo "$COMBAT" | jq -r '.combat.combatants[] | select(.team=="party") | "  \(.char) \(.name) HP:\(.hp)/\(.maxHp)"'
        
        # Auto-fight
        log "Auto-fighting..."
        for turn in {1..100}; do
          TURN_RESULT=$(curl -s -X POST "$BASE/$ID/action" \
            -H "X-API-Key: $KEY" \
            -H "Content-Type: application/json" \
            -d '{"action":"end_turn"}')
          
          COMBAT_ENDED=$(echo "$TURN_RESULT" | jq -r '.combatEnded // false')
          VICTORY=$(echo "$TURN_RESULT" | jq -r '.victory // false')
          CAPSTONE_FAILED=$(echo "$TURN_RESULT" | jq -r '.capstoneFailed // false')
          
          if [ "$COMBAT_ENDED" = "true" ]; then
            if [ "$VICTORY" = "true" ]; then
              log "Victory!"
            else
              warn "Combat ended (defeat or other)"
            fi
            break
          fi
          
          if [ "$CAPSTONE_FAILED" = "true" ]; then
            err "CAPSTONE FAILED - Too many deaths!"
            exit 1
          fi
          
          sleep 0.2
        done
      fi
      ;;
    
    "stairs")
      log "Taking stairs down..."
      curl -s -X POST "$BASE/$ID/move" \
        -H "X-API-Key: $KEY" \
        -H "Content-Type: application/json" \
        -d '{"direction":"down"}' | jq -r '.message // "descended"'
      continue
      ;;
  esac
  
  # Check if capstone completed
  STATUS=$(curl -s "$BASE/$ID" -H "X-API-Key: $KEY" | jq -r '.status')
  if [ "$STATUS" = "completed" ]; then
    echo ""
    log "🎉 CAPSTONE COMPLETED!"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    err "💀 CAPSTONE FAILED"
    exit 1
  fi
  
  # Move forward
  log "Moving forward..."
  MOVE=$(curl -s -X POST "$BASE/$ID/move" \
    -H "X-API-Key: $KEY" \
    -H "Content-Type: application/json" \
    -d '{"direction":"forward"}')
  echo "$MOVE" | jq -r '.message // "moved"'
  
  sleep 0.3
done

warn "Reached max rooms without completion"

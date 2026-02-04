#!/bin/bash
# AI Player Turn - runs one action for a random AI lobster
# Includes: exploration, combat, shopping, selling materials, banking

cd "$(dirname "$0")/.."

PLAYERS_FILE="ai-players.json"
BASE_URL=$(jq -r '.base_url' "$PLAYERS_FILE")

# Pick a random player
PLAYER=$(jq -r '.players['"$((RANDOM % 4))"']' "$PLAYERS_FILE")
NAME=$(echo "$PLAYER" | jq -r '.name')
KEY=$(echo "$PLAYER" | jq -r '.api_key')

# Get current status
STATUS=$(curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/zone/status" 2>/dev/null)
ZONE_STATUS=$(curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/world/look" 2>/dev/null)

LOCATION=$(echo "$ZONE_STATUS" | jq -r '.name // "unknown"')
IN_COMBAT=$(echo "$STATUS" | jq -r '.inCombat // false')
IS_ADVENTURE=$(echo "$STATUS" | jq -r '.zone.isAdventureZone // false')

echo "🦞 $NAME @ $LOCATION"

# Character phrases
SNIPPY_SAY=("*flexes claws*" "Time to fight!" "BATTLE!" "*sharpens claw*" "Bring it on!")
CORAL_SAY=("May the tides bless you!" "Anyone need healing?" "Stay safe!" "*prays*" "Together!")
SHADE_SAY=("*emerges from shadows*" "Got materials to sell..." "*counts pearls*" "Looking for deals." "Trust no one.")
TANK_SAY=("Hmm." "*nods*" "..." "I protect." "*stands guard*")
SHOPPING_SAY=("What's for sale?" "Interesting..." "How much?" "*browses*" "Any deals?")
SELL_SAY=("I have materials to sell!" "Top quality goods!" "Fair price?" "Fresh from the hunt!")
EMOTES=("waves" "stretches" "looks around" "clicks claws" "adjusts shell")

get_phrase() {
  case "$NAME" in
    "Snippy") arr=("${SNIPPY_SAY[@]}") ;;
    "Coral") arr=("${CORAL_SAY[@]}") ;;
    "Shade") arr=("${SHADE_SAY[@]}") ;;
    "Tank") arr=("${TANK_SAY[@]}") ;;
    *) arr=("Hello!") ;;
  esac
  echo "${arr[$((RANDOM % ${#arr[@]}))]}"
}

# === COMBAT MODE ===
if [ "$IN_COMBAT" = "true" ]; then
  echo "  ⚔️ In combat!"
  
  # Check if it's our turn
  CURRENT=$(echo "$STATUS" | jq -r '.encounter.currentTurn.type')
  if [ "$CURRENT" != "player" ]; then
    # Wait for monster turn
    RESULT=$(curl -s -X POST -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      "$BASE_URL/api/zone/combat/action" -d '{"action": "wait"}' 2>/dev/null)
    echo "  ⏳ $(echo $RESULT | jq -r '.messages[-1] // "waiting..."')"
  else
    # Attack!
    RESULT=$(curl -s -X POST -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      "$BASE_URL/api/zone/combat/action" -d '{"action": "attack"}' 2>/dev/null)
    
    if echo "$RESULT" | grep -q '"victory":true\|"combatEnded":true'; then
      echo "  🎉 Victory! XP gained: $(echo $RESULT | jq -r '.xpGained // 0')"
      # Check for materials
      MATS=$(curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/economy/inventory" 2>/dev/null | jq -r '.materials | length // 0')
      echo "  📦 Materials: $MATS"
    else
      echo "  💥 $(echo $RESULT | jq -r '.messages[0] // "attacked!"')"
    fi
  fi
  exit 0
fi

# === ADVENTURE ZONE - EXPLORE ===
if [ "$IS_ADVENTURE" = "true" ]; then
  if [ $((RANDOM % 3)) -eq 0 ]; then
    echo "  🔍 Exploring..."
    RESULT=$(curl -s -X POST -H "Authorization: Bearer $KEY" "$BASE_URL/api/zone/explore" 2>/dev/null)
    
    if echo "$RESULT" | grep -q '"encounter":true'; then
      ENEMY=$(echo "$RESULT" | jq -r '.monsters[0].name // "enemies"')
      echo "  🔥 Encountered $ENEMY!"
    else
      echo "  $(echo $RESULT | jq -r '.message // "exploring..."')"
    fi
    exit 0
  fi
fi

# === RANDOM ACTION ===
ROLL=$((RANDOM % 100))

# Check for shops (higher priority at Pearl Market)
SHOPS=$(curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/shop/list" 2>/dev/null)
HAS_SHOPS=$(echo "$SHOPS" | jq '.shops | length > 0' 2>/dev/null)

# Check if we have materials to sell
MATS=$(curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/economy/inventory" 2>/dev/null)
HAS_MATS=$(echo "$MATS" | jq '.materials | length > 0' 2>/dev/null || echo "false")

if [ "$HAS_SHOPS" = "true" ] && [ "$HAS_MATS" = "true" ] && [ $ROLL -lt 30 ]; then
  # 30% - Sell materials to NPC
  echo "  💰 Selling materials..."
  SHOP_ID=$(echo "$SHOPS" | jq -r '.shops[0].id')
  MAT_ID=$(echo "$MATS" | jq -r '.materials[0].material_id')
  MAT_QTY=$(echo "$MATS" | jq -r '.materials[0].quantity')
  MAT_NAME=$(echo "$MATS" | jq -r '.materials[0].name // .materials[0].material_id')
  
  if [ -n "$MAT_ID" ] && [ "$MAT_ID" != "null" ]; then
    RESULT=$(curl -s -X POST -H "Authorization: Bearer $KEY" \
      -H "Content-Type: application/json" \
      "$BASE_URL/api/shop/$SHOP_ID/sell" \
      -d "{\"materialId\": \"$MAT_ID\", \"quantity\": $MAT_QTY}" 2>/dev/null)
    echo "  Sold $MAT_QTY $MAT_NAME: $(echo $RESULT | jq -r '.message // .error')"
    
    PHRASE="${SELL_SAY[$((RANDOM % ${#SELL_SAY[@]}))]}"
    curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      "$BASE_URL/api/social/say" -d "{\"message\": \"$PHRASE\"}" > /dev/null 2>&1
  fi
  
elif [ "$HAS_SHOPS" = "true" ] && [ $ROLL -lt 50 ]; then
  # 20% - Browse/buy from shop
  NUM_SHOPS=$(echo "$SHOPS" | jq '.shops | length')
  SHOP_IDX=$((RANDOM % NUM_SHOPS))
  SHOP_ID=$(echo "$SHOPS" | jq -r ".shops[$SHOP_IDX].id")
  SHOP_NAME=$(echo "$SHOPS" | jq -r ".shops[$SHOP_IDX].shopName // .shops[$SHOP_IDX].name")
  echo "  🏪 Browsing $SHOP_NAME..."
  
  INV=$(curl -s -H "Authorization: Bearer $KEY" "$BASE_URL/api/shop/$SHOP_ID/inventory" 2>/dev/null)
  ITEM_ID=$(echo "$INV" | jq -r '[.inventory | to_entries[].value[]] | .[0].itemId // empty')
  
  if [ -n "$ITEM_ID" ] && [ "$ITEM_ID" != "null" ] && [ $((RANDOM % 4)) -eq 0 ]; then
    echo "  💰 Buying..."
    curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      "$BASE_URL/api/shop/$SHOP_ID/buy" -d "{\"itemId\": \"$ITEM_ID\", \"quantity\": 1}" > /dev/null 2>&1
  fi
  
  PHRASE="${SHOPPING_SAY[$((RANDOM % ${#SHOPPING_SAY[@]}))]}"
  echo "  💬 \"$PHRASE\""
  curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    "$BASE_URL/api/social/say" -d "{\"message\": \"$PHRASE\"}" > /dev/null 2>&1

elif [ $ROLL -lt 65 ]; then
  # 15% - Move toward adventure zone or shops
  EXITS=$(echo "$ZONE_STATUS" | jq -r '.exits[]? // empty' 2>/dev/null)
  
  # Prefer adventure zones for combat characters
  if [ "$NAME" = "Snippy" ] || [ "$NAME" = "Tank" ]; then
    if echo "$EXITS" | grep -q "kelp_forest"; then
      echo "  → kelp_forest (hunting!)"
      curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
        "$BASE_URL/api/world/move" -d '{"direction": "kelp_forest"}' > /dev/null 2>&1
      exit 0
    fi
  fi
  
  # Random movement
  NUM_EXITS=$(echo "$ZONE_STATUS" | jq '.exits | length // 0')
  if [ "$NUM_EXITS" -gt 0 ] 2>/dev/null; then
    EXIT=$(echo "$ZONE_STATUS" | jq -r ".exits[$((RANDOM % NUM_EXITS))]")
    echo "  → $EXIT"
    curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
      "$BASE_URL/api/world/move" -d "{\"direction\": \"$EXIT\"}" > /dev/null 2>&1
  fi

elif [ $ROLL -lt 85 ]; then
  # 20% - Chat
  PHRASE=$(get_phrase)
  echo "  💬 \"$PHRASE\""
  curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    "$BASE_URL/api/social/say" -d "{\"message\": \"$PHRASE\"}" > /dev/null 2>&1

else
  # 15% - Emote
  EMOTE="${EMOTES[$((RANDOM % ${#EMOTES[@]}))]}"
  echo "  🎭 *$EMOTE*"
  curl -s -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    "$BASE_URL/api/social/emote" -d "{\"action\": \"$EMOTE\"}" > /dev/null 2>&1
fi

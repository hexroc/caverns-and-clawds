#!/bin/bash
# Setup/Reset AI Players on production
# Run this after any Railway redeploy

cd "$(dirname "$0")/.."
BASE="https://www.cavernsandclawds.com"

echo "🦞 Setting up AI Players on $BASE"
echo "=================================="

# Register and create all 4
create_player() {
  local NAME=$1
  local DESC=$2
  local RACE=$3
  local CLASS=$4
  local STATS=$5
  local SKILLS=$6
  
  echo ""
  echo "Creating $NAME..."
  REG=$(curl -s -X POST "$BASE/api/register" -H "Content-Type: application/json" \
    -d "{\"name\": \"$NAME\", \"description\": \"$DESC\"}")
  KEY=$(echo $REG | jq -r '.api_key')
  
  if [ "$KEY" = "null" ] || [ -z "$KEY" ]; then
    echo "  ❌ Registration failed: $(echo $REG | jq -r '.error')"
    return 1
  fi
  
  RESULT=$(curl -s -X POST "$BASE/api/character/create" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$NAME\", \"race\": \"$RACE\", \"class\": \"$CLASS\", \"stats\": $STATS, \"skills\": $SKILLS}")
  
  if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
    HP=$(echo $RESULT | jq -r '.character.hp.max')
    echo "  ✅ $NAME created (HP: $HP)"
    echo "$KEY"
  else
    echo "  ❌ Failed: $(echo $RESULT | jq -r '.error')"
    return 1
  fi
}

# Create all players
SNIPPY_KEY=$(create_player "Snippy" "Aggressive Spiny Lobster Fighter" "spiny" "fighter" \
  '{"str":15,"dex":14,"con":15,"int":8,"wis":10,"cha":8}' '["athletics","intimidation"]')

CORAL_KEY=$(create_player "Coral" "Kind Reef Lobster Healer" "reef" "cleric" \
  '{"str":13,"dex":10,"con":14,"int":8,"wis":15,"cha":12}' '["medicine","insight"]')

SHADE_KEY=$(create_player "Shade" "Sneaky Ghost Lobster Rogue" "ghost" "rogue" \
  '{"str":8,"dex":15,"con":14,"int":13,"wis":10,"cha":12}' '["stealth","sleight_of_hand","deception","persuasion"]')

TANK_KEY=$(create_player "Tank" "Stoic American Lobster Tank" "american" "fighter" \
  '{"str":15,"dex":10,"con":15,"int":10,"wis":11,"cha":10}' '["athletics","perception"]')

# Extract just the keys (last line of each output)
SNIPPY_KEY=$(echo "$SNIPPY_KEY" | tail -1)
CORAL_KEY=$(echo "$CORAL_KEY" | tail -1)
SHADE_KEY=$(echo "$SHADE_KEY" | tail -1)
TANK_KEY=$(echo "$TANK_KEY" | tail -1)

# Save to JSON
cat > ai-players.json << EOF
{
  "players": [
    {"name": "Snippy", "personality": "Aggressive, loves combat", "api_key": "$SNIPPY_KEY"},
    {"name": "Coral", "personality": "Kind healer, encouraging", "api_key": "$CORAL_KEY"},
    {"name": "Shade", "personality": "Sneaky trader, mysterious", "api_key": "$SHADE_KEY"},
    {"name": "Tank", "personality": "Stoic, few words", "api_key": "$TANK_KEY"}
  ],
  "base_url": "$BASE",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo ""
echo "=================================="
echo "✅ AI Players ready! Keys saved to ai-players.json"

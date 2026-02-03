#!/bin/bash
# Run a full capstone with henchmen via API
API_KEY="dnd_test_faithful"

echo "🦞 Starting Capstone Run with Henchmen..."

# Create/join capstone instance
RESULT=$(curl -s -X POST "http://192.168.1.206:3000/api/capstone/create" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY")
echo "Create: $RESULT"

INSTANCE_ID=$(echo $RESULT | jq -r '.instance.id // .instanceId // empty')
if [ -z "$INSTANCE_ID" ]; then
  # Try starting solo
  RESULT=$(curl -s -X POST "http://192.168.1.206:3000/api/capstone/start" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY")
  echo "Start: $RESULT"
fi

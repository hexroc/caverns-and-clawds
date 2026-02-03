#!/bin/bash
API="http://192.168.1.206:3000"
KEY="test_faithful_key"

while true; do
  # Start new combat
  RESULT=$(curl -s -X POST "$API/api/capstone/demo" -H "Content-Type: application/json" -H "X-API-Key: $KEY")
  COMBAT_ID=$(echo "$RESULT" | jq -r '.combatId')
  echo "$(date): Started combat $COMBAT_ID"
  echo "Theater: $API/theater.html?combat=$COMBAT_ID"
  
  # Wait for it to finish
  while true; do
    STATUS=$(curl -s "$API/api/runs/$COMBAT_ID" | jq -r '.run.status' 2>/dev/null)
    if [ "$STATUS" != "active" ]; then
      echo "$(date): Combat $COMBAT_ID ended with status: $STATUS"
      break
    fi
    sleep 2
  done
  
  echo "Starting new combat in 3 seconds..."
  sleep 3
done

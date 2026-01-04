#!/bin/bash

echo "🧪 Testing backup endpoint..."
echo ""

CRON_SECRET="dw7GAlH7VpoLQHGEcTz5Trf7g7NNo6TdFRYpR7xB0GU="
URL="https://app.thelostproject.in/api/cron/backup"

echo "📡 Calling: $URL"
echo "🔑 Using Authorization header"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! Backup completed."
  echo ""
  echo "$BODY" | python3 -m json.tool
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ UNAUTHORIZED - CRON_SECRET mismatch or not set"
  echo "$BODY"
else
  echo "⚠️  Error response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
fi

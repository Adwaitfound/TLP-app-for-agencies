#!/bin/bash

# SQL Runner for Supabase using Direct API
# This script executes SQL statements via Supabase's REST API

set -e

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
SQL_FILE="${1:-.}"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing Supabase credentials"
  echo "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "📋 Running SQL: $(basename $SQL_FILE)"
echo "🔗 Supabase Project: $(echo $SUPABASE_URL | cut -d. -f1 | cut -d/ -f3)"
echo ""

# Extract project ID from URL
PROJECT_ID=$(echo $SUPABASE_URL | cut -d- -f1 | cut -d/ -f3)

# Read SQL file and execute via a stored procedure call
# Since we can't directly execute arbitrary SQL via REST API,
# we need to use a different approach

echo "⚠️  Direct SQL execution requires database connection"
echo ""
echo "Using Supabase Cloud SQL Editor instead..."
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
echo "2. Copy and paste the SQL from: $SQL_FILE"
echo "3. Click 'Run'"
echo ""
echo "Or use supabase-cli with proper authentication"

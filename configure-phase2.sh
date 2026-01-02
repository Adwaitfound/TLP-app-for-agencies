#!/bin/bash

# Phase 2 Configuration Script
# This script will add all the provisioning tokens to .env.local

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 PHASE 2 CONFIGURATION SETUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_FILE=".env.local"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env.local not found!"
    exit 1
fi

echo "✅ Found $ENV_FILE"

# Function to add or update env variable
add_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^$key=" "$ENV_FILE"; then
        # Update existing
        sed -i '' "s|^$key=.*|$key=$value|" "$ENV_FILE"
        echo "  ✓ Updated $key"
    else
        # Add new
        echo "$key=$value" >> "$ENV_FILE"
        echo "  ✓ Added $key"
    fi
}

echo ""
echo "📝 Configuring tokens..."

# These will be replaced by the actual values
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:---placeholder--}"
SUPABASE_ORG_ID="${SUPABASE_ORG_ID:---placeholder--}"
VERCEL_TOKEN="${VERCEL_TOKEN:---placeholder--}"
GITHUB_REPO_OWNER="${GITHUB_REPO_OWNER:---placeholder--}"
GITHUB_REPO_NAME="${GITHUB_REPO_NAME:---placeholder--}"

add_env_var "SUPABASE_ACCESS_TOKEN" "$SUPABASE_ACCESS_TOKEN"
add_env_var "SUPABASE_ORG_ID" "$SUPABASE_ORG_ID"
add_env_var "VERCEL_TOKEN" "$VERCEL_TOKEN"
add_env_var "GITHUB_REPO_OWNER" "$GITHUB_REPO_OWNER"
add_env_var "GITHUB_REPO_NAME" "$GITHUB_REPO_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

#!/bin/bash

# Chat Notifications Setup Helper Script
# This script helps set up VAPID keys for web push notifications

echo "🔔 Chat Notifications Setup Helper"
echo "=================================="
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js and npm first."
    exit 1
fi

echo "Step 1: Check if web-push is installed..."
npm list web-push 2>/dev/null > /dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installing web-push..."
    npm install web-push --save-dev
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install web-push"
        exit 1
    fi
else
    echo "✅ web-push already installed"
fi

echo ""
echo "Step 2: Generating VAPID keys..."
echo "(This is safe to run multiple times - keep the same keys for production)"
echo ""

# Generate VAPID keys
VAPID_OUTPUT=$(npx web-push generate-vapid-keys)

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate VAPID keys"
    exit 1
fi

# Extract keys from output
PUBLIC_KEY=$(echo "$VAPID_OUTPUT" | grep "Public Key:" | sed 's/.*Public Key: //')
PRIVATE_KEY=$(echo "$VAPID_OUTPUT" | grep "Private Key:" | sed 's/.*Private Key: //')

echo "✅ VAPID keys generated successfully!"
echo ""
echo "📋 COPY THE LINES BELOW TO YOUR .env.local FILE:"
echo "=================================================="
echo ""
echo "# Web Push Notifications (VAPID)"
echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_KEY"
echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY"
echo "VAPID_SUBJECT=mailto:admin@yourdomain.com"
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000"
echo ""
echo "=================================================="
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Copy the keys above to your .env.local file"
echo "  2. Replace 'admin@yourdomain.com' with your actual email"
echo "  3. For production, set NEXT_PUBLIC_APP_URL to your domain"
echo "  4. Restart your dev server: npm run dev"
echo ""
echo "📖 Documentation: See CHAT_NOTIFICATIONS_QUICKSTART.md"
echo ""

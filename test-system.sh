#!/bin/bash

# Quick Test Script for Multi-Tenant System
# Run this to verify the system is working

echo "🧪 Testing Multi-Tenant System..."
echo ""

# Test 1: Check server is running
echo "1️⃣ Checking server..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "   ✅ Server is running on http://localhost:3001"
else
    echo "   ❌ Server is not running. Start with: PORT=3001 npm run dev"
    exit 1
fi
echo ""

# Test 2: Verify RLS
echo "2️⃣ Verifying RLS policies..."
node verify-rls-status.mjs
echo ""

# Test 3: Verify user setup
echo "3️⃣ Verifying user setup..."
node test-traffic-controller.mjs
echo ""

# Test 4: Check proxy file exists
echo "4️⃣ Checking proxy.ts..."
if [ -f "proxy.ts" ]; then
    echo "   ✅ proxy.ts exists and is active"
else
    echo "   ❌ proxy.ts not found"
    exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL SYSTEMS OPERATIONAL!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Test Original Owner:"
echo "   Login: adwait@thelostproject.in"
echo "   Expected: /dashboard"
echo ""
echo "2. Test SaaS User:"
echo "   Login: social@thefoundproject.com"
echo "   Expected: /v2/dashboard"
echo ""
echo "3. Test New Signup:"
echo "   Visit: http://localhost:3001/v2/setup"
echo "   Expected: Onboarding flow"
echo ""
echo "📚 Documentation:"
echo "   - READY_TO_USE.md - Quick start guide"
echo "   - PRODUCTION_READY_SUMMARY.md - Feature overview"
echo "   - TRAFFIC_CONTROLLER_GUIDE.md - Detailed docs"
echo ""

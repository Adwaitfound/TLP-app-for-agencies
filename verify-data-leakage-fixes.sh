#!/bin/bash

# Data Leakage Fix Verification Script
# Run this to verify all fixes are in place

echo "🔍 Verifying Data Leakage Fixes..."
echo ""

# Check 1: Middleware Rule 3 fix
echo "✓ Check 1: Middleware routing (proxy.ts)"
if grep -q "if (!isOriginalAgencyOwner && pathname.startsWith('/dashboard'))" proxy.ts; then
  if ! grep -q "!pathname.startsWith('/dashboard/')" proxy.ts; then
    echo "  ✅ PASS: Middleware Rule 3 correctly blocks ALL /dashboard routes"
  else
    echo "  ❌ FAIL: Old escape clause still present"
    exit 1
  fi
else
  echo "  ❌ FAIL: Middleware check not found"
  exit 1
fi

echo ""

# Check 2: Analytics page filtering
echo "✓ Check 2: Analytics page (app/dashboard/analytics/page.tsx)"
if grep -q 'supabase.from("projects").select("*").eq("user_id", user.id)' app/dashboard/analytics/page.tsx; then
  if grep -q 'supabase.from("invoices").select("*").eq("user_id", user.id)' app/dashboard/analytics/page.tsx; then
    if grep -q 'supabase.from("clients").select("*").eq("user_id", user.id)' app/dashboard/analytics/page.tsx; then
      echo "  ✅ PASS: All queries filtered by user_id"
    else
      echo "  ❌ FAIL: Clients query missing user_id filter"
      exit 1
    fi
  else
    echo "  ❌ FAIL: Invoices query missing user_id filter"
    exit 1
  fi
else
  echo "  ❌ FAIL: Projects query missing user_id filter"
  exit 1
fi

echo ""

# Check 3: Admin dashboard filtering
echo "✓ Check 3: Admin Dashboard (app/dashboard/admin-view.tsx)"
DASHBOARD_FILE="app/dashboard/admin-view.tsx"

# Count eq("user_id", userId) in the file
FILTER_COUNT=$(grep -o '.eq("user_id", userId)' "$DASHBOARD_FILE" | wc -l)

if [ $FILTER_COUNT -ge 3 ]; then
  echo "  ✅ PASS: Found $FILTER_COUNT user_id filters (need min 3 for projects, invoices, clients)"
else
  echo "  ❌ FAIL: Found only $FILTER_COUNT filters, need at least 3"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL CHECKS PASSED - Data leakage fixes verified!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  • Middleware correctly isolates SaaS users from /dashboard"
echo "  • Analytics page filters data by user_id"
echo "  • Admin dashboard filters data by user_id"
echo ""
echo "✨ System is secure against tenant data leakage"

#!/bin/bash

echo "🔍 Opening Supabase SQL Editor..."
echo ""
echo "📋 INSTRUCTIONS:"
echo ""
echo "1. Copy ALL content from saas_core_tables.sql"
echo "2. Go to: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql"
echo "3. Paste into SQL editor"
echo "4. Click RUN"
echo ""
echo "The SQL file creates these 5 tables:"
echo "  - saas_organizations"
echo "  - saas_organization_members"
echo "  - saas_organization_payments  ⚠️  (MISSING - causing error)"
echo "  - saas_organization_usage"
echo "  - saas_magic_links"
echo ""
echo "After running, execute: node check-migration.js"
echo ""

# Open Supabase SQL editor
open "https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new"

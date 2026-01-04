#!/bin/bash

echo "🔍 Extracting data from Android backup..."
echo ""

# Find all references to projects, invoices, milestones in the backup
cd "/Users/adwaitparchure/TLP-app for agnecies"

echo "📦 Searching for PROJECT data..."
grep -roh '"id":"[a-f0-9-]\{36\}","project_name":"[^"]\+"' android.bak*/app/src/main/assets/.next 2>/dev/null | \
  sed 's/.*"id":"\([^"]*\)","project_name":"\([^"]*\)".*/Project: \1 - \2/' | \
  sort -u > found_projects.txt
echo "Found $(wc -l < found_projects.txt | tr -d ' ') projects"
head -20 found_projects.txt

echo ""
echo "📄 Searching for INVOICE data..."
grep -roh '"invoice_number":"[^"]\+"' android.bak*/app/src/main/assets/.next 2>/dev/null | \
  sed 's/.*"invoice_number":"\([^"]*\)".*/Invoice: \1/' | \
  sort -u > found_invoices.txt
echo "Found $(wc -l < found_invoices.txt | tr -d ' ') invoices"
cat found_invoices.txt

echo ""
echo "📊 Searching for CLIENT data..."
grep -roh '"company_name":"[^"]\+"' android.bak*/app/src/main/assets/.next 2>/dev/null | \
  sed 's/.*"company_name":"\([^"]*\)".*/Client: \1/' | \
  sort -u > found_clients.txt
echo "Found $(wc -l < found_clients.txt | tr -d ' ') clients"
head -20 found_clients.txt

echo ""
echo "✅ Data extraction complete!"
echo "Check found_projects.txt, found_invoices.txt, and found_clients.txt for results"

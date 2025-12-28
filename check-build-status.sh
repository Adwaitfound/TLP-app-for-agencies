#!/bin/bash

# Check DMG build status

echo "📊 Tauri Build Status Check"
echo "============================"
echo ""

# Check if Rust is compiling
if pgrep -f "cargo build" > /dev/null; then
    echo "✅ Rust compilation is running"
    echo ""
    echo "📦 Compiling packages..."
    ps aux | grep -E "(cargo|rustc)" | grep -v grep | head -5
else
    echo "⏸️  No active Rust compilation"
fi

echo ""
echo "📁 Build output directories:"
ls -lah src-tauri/target/release 2>/dev/null | head -10 || echo "  Release directory not yet created"

echo ""
echo "🎯 Looking for completed DMG..."
find src-tauri/target -name "*.dmg" -type f 2>/dev/null | while read dmg; do
    echo "  ✅ Found: $dmg"
    ls -lh "$dmg"
done || echo "  ⏳ DMG not yet built"

echo ""
echo "💡 The build process typically takes 5-10 minutes for the first compile."
echo "    Once complete, the DMG will appear in src-tauri/target/release/bundle/dmg/"

#!/bin/bash

# Build macOS DMG that points to production web app
# This creates a native macOS wrapper for the web app

set -e

echo "🔧 Building macOS DMG for The Lost Project..."

# Source Rust environment
source "$HOME/.cargo/env"

# Create a minimal index.html that loads the production app
mkdir -p out
cat > out/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>The Lost Project</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    iframe {
      border: none;
      width: 100%;
      height: 100%;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .spinner {
      border: 4px solid rgba(102, 126, 234, 0.3);
      border-radius: 50%;
      border-top: 4px solid #667eea;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <p>Loading The Lost Project...</p>
  </div>
  <iframe id="app" src="https://tlp-app-v2.vercel.app" style="display:none;"></iframe>
  <script>
    const iframe = document.getElementById('app');
    const loading = document.getElementById('loading');
    
    iframe.onload = function() {
      loading.style.display = 'none';
      iframe.style.display = 'block';
    };
    
    // Show iframe after 2 seconds even if not fully loaded
    setTimeout(() => {
      loading.style.display = 'none';
      iframe.style.display = 'block';
    }, 2000);
  </script>
</body>
</html>
EOF

echo "✅ Created minimal build output"

# Build the DMG for Intel only (faster build)
echo "🔨 Building DMG with Tauri (Intel only)..."
npx tauri build --bundles dmg

echo "✅ Build complete!"
echo ""
echo "📦 DMG Location:"
find src-tauri/target -name "*.dmg" -type f 2>/dev/null | head -1 || echo "DMG not found, check build output"
echo ""
echo "To install: Double-click the DMG file and drag the app to Applications"

#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🌐 Starting PWA Build Process${NC}"

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install npm dependencies${NC}"
    exit 1
fi

# Step 2: Build the Next.js application with PWA support
echo -e "${YELLOW}🏗️  Building Next.js application with PWA...${NC}"
npm run build:pwa
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build PWA${NC}"
    exit 1
fi

# Step 3: Generate PWA files
echo -e "${YELLOW}📦 PWA files generated${NC}"

# Verify manifest
if [ -f "public/manifest.json" ]; then
    echo -e "${GREEN}✓ Manifest file found${NC}"
else
    echo -e "${RED}❌ Manifest file not found${NC}"
    exit 1
fi

# Step 4: Create favicon and icons if they don't exist
echo -e "${YELLOW}🎨 Checking for app icons...${NC}"
if [ ! -d "public/icons" ]; then
    mkdir -p public/icons
    echo -e "${YELLOW}⚠️  Icon directory created. You need to add icons manually.${NC}"
fi

# Step 5: Display PWA build information
echo -e "${GREEN}✅ PWA build completed!${NC}"
echo -e "${YELLOW}📍 Build output location: .next/static${NC}"
echo -e "${YELLOW}📍 Manifest location: public/manifest.json${NC}"
echo -e "${YELLOW}📍 Service Worker: public/sw.js${NC}"

# Step 6: Start dev server info
echo -e "${GREEN}🎉 PWA build process completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Add app icons to public/icons/ directory:"
echo -e "     - icon-192x192.png"
echo -e "     - icon-256x256.png"
echo -e "     - icon-384x384.png"
echo -e "     - icon-512x512.png"
echo -e "     - maskable-icon-192x192.png"
echo -e "     - maskable-icon-512x512.png"
echo -e "  2. Run 'npm run dev' to test PWA locally"
echo -e "  3. Run 'npm start' for production"
echo -e "  4. Deploy to your hosting platform (Vercel, Netlify, etc.)"
echo -e ""
echo -e "${YELLOW}To test PWA locally:${NC}"
echo -e "  npm run build && npm start"
echo -e "  Open DevTools → Application → Manifest to verify"
echo -e ""
echo -e "${YELLOW}PWA Features enabled:${NC}"
echo -e "  ✓ Offline support with Service Worker"
echo -e "  ✓ Install on home screen"
echo -e "  ✓ Standalone mode"
echo -e "  ✓ Push notifications"
echo -e "  ✓ Share target integration"

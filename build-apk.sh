#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting APK Build Process${NC}"

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install npm dependencies${NC}"
    exit 1
fi

# Step 2: Build the Next.js application
echo -e "${YELLOW}🏗️  Building Next.js application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build Next.js application${NC}"
    exit 1
fi

# Step 3: Export Next.js to static site for bundling in APK
echo -e "${YELLOW}📤 Exporting Next.js to static files...${NC}"
# Remove old export
rm -rf out
# Use next export if available, or copy from .next/standalone
if [ -d ".next/standalone" ]; then
    echo -e "${YELLOW}📦 Using .next/standalone for static export...${NC}"
    mkdir -p out
    cp -r .next/standalone/* out/ 2>/dev/null || true
    cp -r public/* out/ 2>/dev/null || true
else
    echo -e "${YELLOW}📤 Attempting npm run export...${NC}"
    npm run export 2>/dev/null || true
fi

if [ ! -d "out" ]; then
    echo -e "${YELLOW}⚠️  Creating out directory with public assets...${NC}"
    mkdir -p out
    cp -r public/* out/ 2>/dev/null || true
fi

# Step 4: Install Capacitor if not already installed
if [ ! -f "capacitor.config.json" ]; then
    echo -e "${YELLOW}📱 Installing Capacitor...${NC}"
    npm install @capacitor/core @capacitor/cli
    npx cap init
fi

# Step 5: Add Android platform
if [ ! -d "android" ]; then
    echo -e "${YELLOW}🤖 Adding Android platform...${NC}"
    npx cap add android
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to add Android platform${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Android platform already exists${NC}"
fi

# Step 6: Sync Capacitor
echo -e "${YELLOW}🔄 Syncing Capacitor...${NC}"
npx cap sync android
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to sync Capacitor${NC}"
    exit 1
fi

# Step 7: Build APK
echo -e "${YELLOW}📦 Building APK with Gradle...${NC}"
cd android

# Check if gradle exists, if not download gradle wrapper
if [ ! -f "gradlew" ]; then
    echo -e "${YELLOW}📥 Setting up Gradle wrapper...${NC}"
    ./gradlew wrapper --gradle-version=8.0
fi

# Build release APK
./gradlew assembleRelease
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build APK${NC}"
    exit 1
fi

cd ..

# Step 8: Locate the built APK
APK_PATH="android/app/build/outputs/apk/release/*.apk"
echo -e "${GREEN}✅ APK build completed!${NC}"
echo -e "${YELLOW}📍 APK location: ${APK_PATH}${NC}"

# Display APK info
for apk in android/app/build/outputs/apk/release/*.apk; do
    if [ -f "$apk" ]; then
        SIZE=$(ls -lh "$apk" | awk '{print $5}')
        echo -e "${GREEN}✓ Built: $(basename "$apk") (Size: $SIZE)${NC}"
    fi
done

echo -e "${GREEN}🎉 APK build process completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Copy the APK to your Android device or emulator"
echo -e "  2. Or use: adb install $(basename "$apk")"

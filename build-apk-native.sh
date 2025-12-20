#!/bin/bash

# APK Build Wrapper - Sets up environment and builds APK

export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

echo "🔧 Environment Setup:"
echo "JAVA_HOME: $JAVA_HOME"
echo "ANDROID_HOME: $ANDROID_HOME"
echo ""

# Verify Java
echo "✓ Java Version:"
java -version
echo ""

# Build APK
echo "📱 Starting Android APK build..."
cd "$(dirname "$0")/android"

echo "Running: ./gradlew assembleRelease"
./gradlew assembleRelease

# Check for APK
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo ""
    echo "✅ APK build successful!"
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo "📍 Location: $APK_PATH"
    echo "📦 Size: $APK_SIZE"
else
    echo ""
    echo "❌ APK file not found"
    exit 1
fi

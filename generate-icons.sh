#!/bin/bash

# Generate Android app icons from the TLP logo

# Save the uploaded icon (you'll need to place tlp-logo.png in the root first)
ICON_SOURCE="tlp-logo.png"

if [ ! -f "$ICON_SOURCE" ]; then
    echo "❌ Error: Please save your logo as 'tlp-logo.png' in the project root first"
    exit 1
fi

echo "🎨 Generating Android icons from $ICON_SOURCE..."

# Define sizes for each density
declare -A SIZES=(
    ["mdpi"]=48
    ["hdpi"]=72
    ["xhdpi"]=96
    ["xxhdpi"]=144
    ["xxxhdpi"]=192
)

# Generate icons for each density
for density in "${!SIZES[@]}"; do
    size=${SIZES[$density]}
    output_dir="android/app/src/main/res/mipmap-$density"
    
    echo "📱 Generating ${size}x${size} icons for $density..."
    
    # Create directory if it doesn't exist
    mkdir -p "$output_dir"
    
    # Generate ic_launcher.png
    sips -z $size $size "$ICON_SOURCE" --out "$output_dir/ic_launcher.png" > /dev/null 2>&1
    
    # Generate ic_launcher_foreground.png
    sips -z $size $size "$ICON_SOURCE" --out "$output_dir/ic_launcher_foreground.png" > /dev/null 2>&1
    
    # Generate ic_launcher_round.png
    sips -z $size $size "$ICON_SOURCE" --out "$output_dir/ic_launcher_round.png" > /dev/null 2>&1
done

# Generate PWA icons for web
echo "🌐 Generating PWA icons..."
mkdir -p public/icons

sips -z 192 192 "$ICON_SOURCE" --out "public/icons/icon-192x192.png" > /dev/null 2>&1
sips -z 512 512 "$ICON_SOURCE" --out "public/icons/icon-512x512.png" > /dev/null 2>&1
sips -z 256 256 "$ICON_SOURCE" --out "public/icons/icon-256x256.png" > /dev/null 2>&1
sips -z 384 384 "$ICON_SOURCE" --out "public/icons/icon-384x384.png" > /dev/null 2>&1

# Generate maskable icons (with padding)
sips -z 192 192 "$ICON_SOURCE" --out "public/icons/maskable-icon-192x192.png" > /dev/null 2>&1
sips -z 512 512 "$ICON_SOURCE" --out "public/icons/maskable-icon-512x512.png" > /dev/null 2>&1

echo "✅ Icon generation complete!"
echo ""
echo "Next steps:"
echo "1. Run: npx cap sync android"
echo "2. Build APK: cd android && ./gradlew assembleDebug"

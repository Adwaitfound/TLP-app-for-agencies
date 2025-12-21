#!/usr/bin/env python3
import os
import subprocess

# Icon sizes for Android
android_sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

# PWA sizes
pwa_sizes = [192, 256, 384, 512]

source = 'tlp-logo.png'

print("🎨 Generating Android icons...")
for density, size in android_sizes.items():
    res_dir = f'android/app/src/main/res/mipmap-{density}'
    os.makedirs(res_dir, exist_ok=True)
    
    for icon_type in ['ic_launcher', 'ic_launcher_foreground', 'ic_launcher_round']:
        output = f'{res_dir}/{icon_type}.png'
        subprocess.run(['sips', '-z', str(size), str(size), source, '--out', output], 
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"  ✓ {density}: {size}x{size}")

print("\n🌐 Generating PWA icons...")
os.makedirs('public/icons', exist_ok=True)
for size in pwa_sizes:
    output = f'public/icons/icon-{size}x{size}.png'
    subprocess.run(['sips', '-z', str(size), str(size), source, '--out', output],
                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"  ✓ {size}x{size}")

# Maskable icons
for size in [192, 512]:
    output = f'public/icons/maskable-icon-{size}x{size}.png'
    subprocess.run(['sips', '-z', str(size), str(size), source, '--out', output],
                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("\n✅ All icons generated successfully!")
print("\nNext: npx cap sync android")

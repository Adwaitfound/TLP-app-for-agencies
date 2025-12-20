# Standalone APK with Custom Domain (app.thhelostproject.xyz)

This guide shows how to deploy your app to your custom domain and build a standalone APK.

---

## Step 1: Deploy Backend to Your Domain

Your app needs a server running at `https://app.thhelostproject.xyz`. Choose one:

### Option A: Self-Hosted (VPS - Recommended for Control)
```bash
# 1. Get a VPS (DigitalOcean, Linode, AWS, etc.)
# 2. Set up Node.js on the server
# 3. Deploy this app's `.next` build directory
# 4. Run with pm2 or systemd

# On your VPS:
npm run build
npm start
```

### Option B: Vercel (With Custom Domain)
```bash
# Keep using Vercel but add custom domain:
# 1. In Vercel dashboard → Project Settings
# 2. Domains → Add 'app.thhelostproject.xyz'
# 3. Configure DNS at your domain registrar
# 4. DNS will point to Vercel's nameservers

# This is what was there before, now using your domain.
```

### Option C: Heroku/Railway/Render
```bash
# Deploy .next build to your platform
# Add custom domain in their dashboard
# Point DNS CNAME to their service
```

---

## Step 2: Configure DNS

Go to your domain registrar (GoDaddy, Namecheap, etc.) and:

### If using self-hosted VPS:
```
A Record:
  Name: app
  Type: A
  Value: <your-vps-ip-address>
```

### If using Vercel/Heroku/etc:
```
CNAME Record:
  Name: app
  Type: CNAME
  Value: <service-provided-cname>
```

---

## Step 3: SSL Certificate

### If self-hosted with Let's Encrypt (Free):
```bash
# On your VPS:
sudo apt-get install certbot
certbot certonly --standalone -d app.thhelostproject.xyz
# Then configure Nginx/Apache to use cert
```

### If using Vercel/Heroku:
- They auto-provision SSL certificates (handled for you)

---

## Step 4: Verify Backend is Running

```bash
# Test your domain:
curl https://app.thhelostproject.xyz/
# Should return HTML (not an error)

# Test API:
curl https://app.thhelostproject.xyz/api/health
# Should return 200 OK
```

---

## Step 5: Update Environment Variables (if needed)

Check `.env.local` - Supabase credentials are already set, but if you have any custom API endpoints, update them:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://frinqtylwgzquoxvqhxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# No Vercel-specific vars needed anymore
```

---

## Step 6: Build Standalone APK

The APK is now configured to load from `app.thhelostproject.xyz`.

```bash
# Navigate to project root
cd /Volumes/TLPSSD4/TLP\ APP/TLPappAndroidandPWAbuild

# Set Java/Android env
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk

# Build APK
./build-apk.sh
# Or just the Gradle step:
cd android && ./gradlew assembleDebug && cd ..
```

**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Step 7: Install on Device

```bash
# Connect phone
adb devices

# Install APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch app on device
adb shell am start -n com.vidpro.app/com.vidpro.app.MainActivity
```

---

## Step 8: Test the App

1. **Open app on phone**
2. **It should load:** `https://app.thhelostproject.xyz`
3. **Check DevTools** (if Chrome):
   - Open: `chrome://inspect`
   - Enable "Discover network targets"
   - Inspect the webview

---

## What Changed

**Before (Vercel):**
```json
"url": "https://tlp-app-v2-pw5akhx24-adwaits-projects-7be8e91e.vercel.app"
```

**After (Custom Domain):**
```json
"url": "https://app.thhelostproject.xyz"
```

---

## Troubleshooting

### APK loads blank page
- ✅ Verify domain is accessible: `curl https://app.thhelostproject.xyz`
- ✅ Check SSL certificate is valid
- ✅ Clear app data on phone: Settings → Apps → Video Production App → Storage → Clear

### SSL certificate issues
- ✅ Use `openssl s_client -connect app.thhelostproject.xyz:443` to verify cert
- ✅ If self-hosted, ensure Nginx/Apache is configured correctly

### API calls failing
- ✅ Check CORS headers: `curl -I https://app.thhelostproject.xyz/api/...`
- ✅ Ensure Supabase credentials in `.env.local` are correct
- ✅ Test with: `curl -v https://app.thhelostproject.xyz/api/health`

### Android webview security
- ✅ If `allowMixedContent: true` in capacitor.config.json allows HTTP (for testing)
- ✅ For production, use HTTPS only and set to `false`

---

## Production Checklist

- [ ] Custom domain `app.thhelostproject.xyz` is live
- [ ] SSL certificate is valid (not self-signed or expired)
- [ ] Backend is running and accessible
- [ ] `.env.local` has correct Supabase keys
- [ ] DNS is properly configured (A or CNAME record)
- [ ] App loads without errors when opened
- [ ] All API calls work (projects, invoices, etc.)
- [ ] No mixed content warnings (HTTP + HTTPS)
- [ ] Create signing key for release APK
- [ ] Build release APK: `./gradlew assembleRelease`
- [ ] Sign APK with keystore
- [ ] Distribute via Google Play Store or direct download

---

## Next: Release APK (Production)

To create a production APK:

```bash
# 1. Create signing key (one-time)
keytool -genkey -v -keystore release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release

# 2. Move to safe location
mv release-key.jks ~/.android/

# 3. Update android/build.gradle with signing config

# 4. Build release APK
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## Summary

Your standalone APK will now:
- ✅ Load from your custom domain
- ✅ Connect to Supabase backend
- ✅ Work offline with service worker
- ✅ Be installable on any Android device
- ✅ Not depend on Vercel

Enjoy your standalone app! 🚀

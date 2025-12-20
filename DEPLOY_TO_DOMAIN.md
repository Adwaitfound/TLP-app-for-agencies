# Deploy to app.thelostproject.xyz

## Step 1: Choose Hosting Provider (Recommended: Vercel)

### Option A: Vercel (Recommended - Best for Next.js)
**Why Vercel:**
- Built by Next.js creators
- Free tier includes custom domains
- Automatic deployments
- SSL certificates included
- Global CDN

**Setup:**
1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click "Add New Project"
4. Import this repository or upload project folder
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build` (or leave default)
   - Output Directory: leave default
6. Click "Deploy"

### Option B: Netlify (Alternative)
- Similar to Vercel
- Good Next.js support
- Free SSL and CDN

### Option C: DigitalOcean App Platform
- $5/month minimum
- More control
- Good for scaling

## Step 2: Configure Environment Variables

In your hosting dashboard (e.g., Vercel), add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://frinqtylwgzquoxvqhxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Get these from:**
- Supabase Dashboard → Settings → API

## Step 3: Configure DNS (Domain Settings)

1. **Go to your domain registrar** where you bought thelostproject.xyz
   - Common registrars: GoDaddy, Namecheap, Google Domains, Cloudflare

2. **Add DNS Records:**

   **For Vercel:**
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`
   - TTL: Automatic or 3600

   **OR if Vercel gives you specific records:**
   - They'll show you exact DNS settings after deployment
   - Usually an A record or CNAME record

3. **Wait for DNS propagation** (5 minutes to 48 hours, usually ~1 hour)

## Step 4: Add Domain in Hosting Dashboard

**In Vercel:**
1. Go to your project
2. Click "Settings" → "Domains"
3. Add domain: `app.thelostproject.xyz`
4. Vercel will verify DNS and issue SSL certificate automatically
5. Wait for "Valid Configuration" status

## Step 5: Test Web App

1. Visit https://app.thelostproject.xyz
2. Verify:
   - Site loads correctly
   - No SSL errors (should show 🔒 padlock)
   - Supabase connection works
   - Login/auth works

## Step 6: Update Supabase Allowed URLs

1. Go to Supabase Dashboard
2. Authentication → URL Configuration
3. Add to **Site URL**: `https://app.thelostproject.xyz`
4. Add to **Redirect URLs**: 
   - `https://app.thelostproject.xyz/**`
   - `https://app.thelostproject.xyz/auth/callback`

## Step 7: Build New APK

Once website is deployed and working:

```bash
# Copy to build directory (no spaces in path)
cp -r "/Volumes/TLPSSD4/TLP APP/TLPappAndroidandPWAbuild" ~/app_deploy
cd ~/app_deploy

# Install dependencies
npm install

# Sync Capacitor with new domain
npx cap sync android

# Build APK
cd android
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
export ANDROID_HOME=$HOME/Library/Android/sdk
./gradlew assembleDebug -q
```

APK will be at: `~/app_deploy/android/app/build/outputs/apk/debug/app-debug.apk`

## Step 8: Install APK on Phone

```bash
adb install -r ~/app_deploy/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.vidpro.app/com.vidpro.app.MainActivity
```

---

## Quick Start (If using Vercel)

1. **Deploy Now:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   cd "/Volumes/TLPSSD4/TLP APP/TLPappAndroidandPWAbuild"
   vercel
   # Follow prompts, say yes to defaults
   ```

2. **Add domain in Vercel dashboard:**
   - vercel.com → your project → Settings → Domains
   - Add: `app.thelostproject.xyz`

3. **Update DNS:**
   - Add CNAME record: `app` → `cname.vercel-dns.com`

4. **Wait for SSL**, then build APK

---

## Troubleshooting

### DNS not working
- Check DNS propagation: https://dnschecker.org
- Verify CNAME record is correct
- Wait up to 24 hours

### SSL Certificate errors
- Make sure using `https://` not `http://`
- Wait for hosting provider to issue certificate (automatic)
- Check domain is "Valid" in hosting dashboard

### App shows blank screen
- Check browser console at https://app.thelostproject.xyz
- Verify environment variables are set in hosting dashboard
- Check Supabase allowed URLs include your domain

### APK not connecting
- Verify website loads at https://app.thelostproject.xyz
- Check capacitor.config.json has correct URL
- Run `npx cap sync android` after changing config
- Rebuild APK completely

---

## Cost Estimate

**Free Option (Recommended for starting):**
- Vercel: Free tier (includes SSL, CDN, custom domain)
- Domain: Already owned
- **Total: $0/month**

**Paid Option (For production):**
- Vercel Pro: $20/month (if you need more)
- OR DigitalOcean: $5-12/month
- Domain: Already owned
- **Total: $5-20/month**


# 🎯 Quick Test Commands

## Playwright (Web) - READY ✅

**Run all tests (headless):**
```bash
npm run test:e2e
```

**Interactive UI mode:**
```bash
npm run test:e2e:ui
```

**Watch mode (headed browser):**
```bash
npm run test:e2e:headed
```

**View last test report:**
```bash
npm run test:e2e:report
```

---

## Maestro (APK) - READY ✅
Version: 2.0.10

**Prerequisites:**
1. Update test credentials in `.maestro/smoke-test.yaml` (lines 28, 31)
2. Build & install APK:
   ```bash
   npm run build && npm run export
   npx cap sync android
   cd android && ./gradlew assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
3. Connect device/emulator

**Run APK smoke test:**
```bash
npm run test:maestro
```

**Interactive mode (explore UI):**
```bash
maestro studio
```

**Test specific flow:**
```bash
maestro test .maestro/smoke-test.yaml
```

---

## Setup Test Credentials

**For Playwright (web tests):**
```bash
export TEST_CLIENT_EMAIL="testclient@yourdomain.com"
export TEST_CLIENT_PASSWORD="yourpassword"
export TEST_ADMIN_EMAIL="admin@yourdomain.com"
export TEST_ADMIN_PASSWORD="yourpassword"
```

**For Maestro (APK tests):**
Edit `.maestro/smoke-test.yaml` lines 28-31 with valid credentials.

---

## Current Test Coverage

✅ Landing page loads  
✅ Get Started button opens login dialog  
✅ Client dashboard loads (Dashboard tab)  
✅ Tab switching (Projects/Invoices/Comments)  
✅ Upload File dialog opens/closes  
✅ Add Drive Link dialog opens/closes  
✅ Drive Folder dialog opens/closes  

---

See [TESTING.md](TESTING.md) for full documentation.

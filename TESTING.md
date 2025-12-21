# Automated Testing Setup

This project includes both **web** (Playwright) and **APK** (Maestro) smoke tests to validate critical flows.

---

## 🌐 Web E2E Tests (Playwright)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Set test credentials** (optional, for authenticated flows):
   ```bash
   export TEST_CLIENT_EMAIL="testclient@yourdomain.com"
   export TEST_CLIENT_PASSWORD="yourpassword"
   export TEST_ADMIN_EMAIL="admin@yourdomain.com"
   export TEST_ADMIN_PASSWORD="yourpassword"
   ```

### Run Tests

- **Headless (CI mode):**
  ```bash
  npm run test:e2e
  ```

- **Headed (visible browser):**
  ```bash
  npm run test:e2e:headed
  ```

- **Interactive UI mode:**
  ```bash
  npm run test:e2e:ui
  ```

- **View last report:**
  ```bash
  npm run test:e2e:report
  ```

### Test Coverage

- ✅ Landing page loads with Get Started button
- ✅ Login dialog opens
- ✅ Client dashboard loads (requires test user)
- ✅ Dashboard tabs switch (Dashboard/Projects/Invoices/Comments)
- ✅ File manager dialogs open (Upload/Add Drive Link/Drive Folder)

---

## 📱 APK Smoke Tests (Maestro)

### Setup

1. **Install Maestro:**
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Update credentials** in `.maestro/smoke-test.yaml`:
   ```yaml
   - inputText: "testclient@yourdomain.com"  # line 28
   - inputText: "testpassword123"            # line 31
   ```

3. **Build and install APK:**
   ```bash
   npm run build && npm run export
   npx cap sync android
   cd android && ./gradlew assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

### Run APK Tests

**With device/emulator connected:**
```bash
npm run test:maestro
```

Or directly:
```bash
maestro test .maestro/smoke-test.yaml
```

### Test Coverage

- ✅ App launches
- ✅ Login as client
- ✅ Dashboard loads
- ✅ Tab switching (Dashboard/Projects/Invoices/Comments)
- ✅ Open project detail
- ✅ File manager: Upload dialog opens/closes
- ✅ File manager: Add Drive Link dialog opens/closes
- ✅ File manager: Drive Folder dialog opens/closes

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📝 Notes

- **Playwright tests** run against `http://localhost:3000` (auto-started via `webServer` config).
- **Maestro tests** require a physical device or emulator with the APK installed.
- Tests with auth flows are **skipped by default** until you provide valid credentials.
- Update `.maestro/smoke-test.yaml` tap selectors if your UI text changes.

---

## 🔧 Troubleshooting

**Playwright fails to start dev server:**
- Check port 3000 is free: `lsof -ti:3000 | xargs kill -9`

**Maestro can't find elements:**
- Run `maestro studio` to interactively inspect the APK UI tree.
- Adjust selectors in `.maestro/smoke-test.yaml`.

**Tests timeout:**
- Increase timeout values in test files or Maestro yaml.
- Check Supabase connection/RLS policies for test users.

---

Happy testing! 🎉

# Test Provisioning Now! 🚀

Your tokens are configured. Time to test provisioning!

## Steps to Test

1. **Open the onboarding dashboard**

   - Go to: http://localhost:3000/dashboard/agency-onboarding
   - You should see the "Poshakh" request in the list

2. **Click "Approve & Provision"** on the Poshakh request

   - This will start the provisioning process
   - Watch the terminal for logs

3. **Watch the terminal** for these steps:

   ```
   🚀 Starting provisioning for: Poshakh
   📦 Step 1/5: Creating new Supabase project...
      ✅ New project created: poshakh-xxxxx
   📊 Step 2/5: Setting up schema and admin user...
      📊 Running migrations to set up schema...
      ✅ All 59 migrations completed
      👤 Creating admin user...
      ✅ Admin user created
   ☁️  Step 3/5: Cloning Vercel project...
      ✅ Vercel project cloned
   🚀 Step 4/5: Waiting for deployment...
      ✅ Instance ready at: https://tlp-poshakh-xxxxx.vercel.app
   📧 Step 5/5: Sending welcome email...
      ✅ Welcome email sent
   ✅ Provisioning complete for: Poshakh
   ```

4. **Verify in your dashboards**

   - Check Supabase: https://supabase.com/dashboard
     - New project should appear
     - Should have all 59 migrations
   - Check Vercel: https://vercel.com/dashboard
     - New project should appear
     - Should be deploying or deployed

5. **Test the new instance**
   - Click the instance URL in the dashboard
   - Log in as admin with email: `kavita@poshakhfabrics.com`
   - Check the temporary password in the provisioning status

## Expected Timeline

- **Step 1**: ~30 seconds (creating project)
- **Step 2**: ~1-2 minutes (running migrations + creating admin)
- **Step 3**: ~15 seconds (creating Vercel project)
- **Step 4**: ~30 seconds (waiting for deployment)
- **Step 5**: ~10 seconds (email)
- **TOTAL**: ~2-3 minutes

## Troubleshooting

### Logs show "SUPABASE_ACCESS_TOKEN not configured"

- Your `.env.local` might not have been saved properly
- Restart the dev server: `npm run dev`
- Check that `.env.local` has the token

### "Failed to create Supabase project"

- Token might be expired
- Check that the token is correct in `.env.local`
- Try generating a new token from https://supabase.com/dashboard/account/tokens

### Vercel project not appearing

- Vercel token might be wrong
- Check that `VERCEL_TOKEN` is in `.env.local`
- Make sure token has "Full Account" scope

### Admin user can't log in

- Wait 10-30 seconds after provisioning completes
- Temporary password might not be shown in email (check our logging instead)
- Try resetting the request and reprovisioning

## Next Steps

Once Poshakh is working:

1. ✅ **Create another test agency** to make sure it's repeatable
2. ✅ **Try different names** to test the naming logic
3. ✅ **Add custom domains** to Vercel deployments
4. ✅ **Test user management** in the new agency instance

## Questions?

Check these files:

- `lib/provisioning/template-provisioning.ts` - Main provisioning logic
- `lib/provisioning/orchestrator.ts` - Coordination of steps
- `ENV_SETUP_GUIDE.md` - Environment variable help
- `PROVISIONING_READY.md` - Detailed flow explanation

Good luck! 🎉

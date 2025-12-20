# ✅ Payments Feature - Testing Checklist

## 🎯 Complete This Before Deploying

---

## Step 1: Database Setup ⚠️ CRITICAL

### 1.1 Run SQL Migration
- [ ] Go to Supabase Dashboard: https://supabase.com/dashboard
- [ ] Select your project (frinqtylwgzquoxvqhxb)
- [ ] Go to SQL Editor
- [ ] Open `VENDORS_PAYMENTS_SCHEMA.sql`
- [ ] Copy all contents
- [ ] Paste in SQL Editor
- [ ] Click **"Run"**
- [ ] Wait for success message

### 1.2 Verify Tables Created
- [ ] Go to Table Editor in Supabase
- [ ] Check for new tables:
  - `vendors` ✓
  - `vendor_payments` ✓
  - `vendor_project_assignments` ✓

### 1.3 Check RLS Policies
- [ ] Click on `vendors` table
- [ ] Go to "Policies" tab
- [ ] Should see 2 policies (view + manage)
- [ ] Repeat for other 2 tables

---

## Step 2: Local Testing

### 2.1 Start Dev Server
```bash
npm run dev
```
- [ ] Server starts without errors
- [ ] No compilation errors in terminal
- [ ] Open http://localhost:3000

### 2.2 Login & Navigate
- [ ] Login with admin account (adwait@thelostproject.in)
- [ ] See sidebar menu
- [ ] Find "Payments & Vendors" tab
- [ ] Click on it
- [ ] Page loads successfully

### 2.3 Check Dashboard
- [ ] See 4 analytics cards:
  - Total Vendors
  - Total Paid
  - Pending Payments
  - This Month
- [ ] See 4 tabs:
  - Overview
  - Vendors
  - Payments
  - Project Budgets
- [ ] All cards show "0" or "No data" (fresh database)

---

## Step 3: Test Vendor Management

### 3.1 Add a Vendor
- [ ] Click "Add Vendor" button
- [ ] Dialog opens
- [ ] Fill in:
  - Name: "Test Videographer"
  - Type: Videographer
  - Phone: +91 9876543210
  - Email: test@example.com
  - UPI: test@paytm
- [ ] Click "Add Vendor"
- [ ] Success! Vendor appears in list

### 3.2 View Vendor List
- [ ] Go to "Vendors" tab
- [ ] See the test vendor in table
- [ ] Check columns display:
  - Name ✓
  - Type badge ✓
  - Contact info ✓
  - Projects (0) ✓
  - Total Paid (₹0) ✓
  - Status (Active) ✓

### 3.3 Test Vendor Actions
- [ ] Click 3-dot menu on vendor
- [ ] See options:
  - Edit
  - View Details
  - Payment History
  - Delete
- [ ] Click Delete
- [ ] Confirm deletion
- [ ] Vendor removed from list

### 3.4 Add Multiple Vendors
- [ ] Add vendor 1: Videographer
- [ ] Add vendor 2: Editor
- [ ] Add vendor 3: Sound Engineer
- [ ] All 3 show in list
- [ ] Can search by name
- [ ] Can filter by type

---

## Step 4: Test Payment Recording

### 4.1 Record First Payment
- [ ] Click "Record Payment" button
- [ ] Dialog opens
- [ ] Select:
  - Vendor: Test Videographer
  - Amount: 35000
  - Status: Completed
  - Payment Method: UPI
  - Description: "Test payment for video shoot"
- [ ] Click "Record Payment"
- [ ] Success! Payment recorded

### 4.2 View Payment List
- [ ] Go to "Payments" tab
- [ ] See payment in table
- [ ] Check columns:
  - Date ✓
  - Vendor name ✓
  - Amount ✓
  - Status badge ✓
  - Payment method ✓

### 4.3 Test Payment Status Update
- [ ] Click 3-dot menu on payment
- [ ] Click "Mark as Pending"
- [ ] Status changes to Pending
- [ ] Click menu again
- [ ] Click "Mark as Completed"
- [ ] Status changes back to Completed

### 4.4 Add Payment to Project
- [ ] Add a new payment
- [ ] Select a project from dropdown
- [ ] Amount: 25000
- [ ] Status: Pending
- [ ] Save
- [ ] Payment linked to project

---

## Step 5: Test Budget Tracking

### 5.1 Verify Project Has Budget
- [ ] Go to Projects page
- [ ] Pick a project
- [ ] Check it has budget set (e.g., ₹1,00,000)
- [ ] If not, edit project and add budget

### 5.2 View Budget Tracker
- [ ] Go back to Payments page
- [ ] Click "Project Budgets" tab
- [ ] See projects grouped by vertical:
  - Video Production
  - Social Media
  - Design & Branding

### 5.3 Check Budget Calculations
- [ ] Find project with payments
- [ ] Check displayed:
  - Total Budget ✓
  - Amount Paid ✓
  - Pending Payments ✓
  - Remaining Budget ✓
  - Progress bar ✓
  - Vendor count ✓

### 5.4 Test Over-Budget Warning
- [ ] Find project with ₹50,000 budget
- [ ] Add payments totaling > ₹50,000
- [ ] Should show red "Over Budget" badge
- [ ] Progress bar should be red

---

## Step 6: Test Filters & Search

### 6.1 Vendor Search
- [ ] Go to Vendors tab
- [ ] Type in search box
- [ ] Results filter by name
- [ ] Clear search
- [ ] All vendors return

### 6.2 Vendor Type Filter
- [ ] Select "Videographer" from dropdown
- [ ] Only videographers show
- [ ] Change to "Editor"
- [ ] Only editors show
- [ ] Select "All Types"
- [ ] All vendors return

### 6.3 Payment Status Filter
- [ ] Go to Payments tab
- [ ] Select "Completed" status
- [ ] Only completed payments show
- [ ] Select "Pending"
- [ ] Only pending payments show

---

## Step 7: Test Analytics

### 7.1 Overview Tab
- [ ] Go to Overview tab
- [ ] See "Filter by Vertical" section
- [ ] Click "Video Production"
- [ ] Data filters
- [ ] Click "All Verticals"
- [ ] All data shows

### 7.2 Analytics Cards Update
- [ ] Add 3 vendors
- [ ] Total Vendors shows "3"
- [ ] Add payment of ₹35,000
- [ ] Total Paid shows "₹35,000"
- [ ] Add pending payment of ₹15,000
- [ ] Pending Payments shows "₹15,000"

### 7.3 Recent Payments Section
- [ ] See "Recent Payments" on Overview
- [ ] Shows last 10 payments
- [ ] Compact display
- [ ] Click to view details

### 7.4 Top Vendors Section
- [ ] See "Top Vendors by Amount Paid"
- [ ] Shows vendors sorted by total paid
- [ ] Displays project count
- [ ] Shows vendor type

---

## Step 8: Test Responsive Design

### 8.1 Desktop (1920x1080)
- [ ] All cards visible
- [ ] Table shows all columns
- [ ] Dialogs centered
- [ ] No overflow

### 8.2 Tablet (768x1024)
- [ ] Layout adjusts
- [ ] Table scrolls horizontally if needed
- [ ] Cards stack properly
- [ ] Sidebar collapses

### 8.3 Mobile (375x667)
- [ ] Cards stack vertically
- [ ] Table scrollable
- [ ] Dialogs full-width
- [ ] All features accessible

---

## Step 9: Test Data Integrity

### 9.1 Vendor Stats Auto-Update
- [ ] Note vendor's total_amount_paid
- [ ] Add completed payment to vendor
- [ ] Go back to vendor list
- [ ] Total paid increased ✓

### 9.2 Delete Protection
- [ ] Try to delete vendor with payments
- [ ] Should work (payments cascade delete)
- [ ] Or show warning (depends on your preference)

### 9.3 Required Fields
- [ ] Try to add vendor without name
- [ ] Form validation prevents
- [ ] Try to add payment without amount
- [ ] Form validation prevents

---

## Step 10: Browser Console Check

### 10.1 No Errors
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] No red errors
- [ ] No warnings (or only minor ones)

### 10.2 Network Tab
- [ ] Go to Network tab
- [ ] Refresh page
- [ ] All API calls return 200/201
- [ ] No 404 or 500 errors

---

## Step 11: Performance Check

### 11.1 Page Load Speed
- [ ] Dashboard loads in < 3 seconds
- [ ] Vendor list loads quickly
- [ ] Payment list loads quickly
- [ ] No lag when switching tabs

### 11.2 Large Data Sets
- [ ] Add 20+ vendors
- [ ] Add 50+ payments
- [ ] Check pagination (if implemented)
- [ ] Search still fast

---

## Step 12: Final Verification

### 12.1 Complete User Flow
1. [ ] Login as admin
2. [ ] Add 3 vendors
3. [ ] Record 5 payments
4. [ ] Link payments to projects
5. [ ] View budget tracker
6. [ ] Check all calculations correct
7. [ ] Update payment statuses
8. [ ] Search and filter work
9. [ ] Delete a payment
10. [ ] Logout and login again
11. [ ] All data persists

### 12.2 Cross-Browser Testing
- [ ] Chrome: Works ✓
- [ ] Firefox: Works ✓
- [ ] Safari: Works ✓
- [ ] Edge: Works ✓

---

## ✅ Ready to Deploy Checklist

Before deploying to production:

**Database**
- [ ] SQL migration run successfully
- [ ] All 3 tables created
- [ ] RLS policies active
- [ ] Indexes created

**Functionality**
- [ ] Can add vendors
- [ ] Can record payments
- [ ] Can view budgets
- [ ] All tabs work
- [ ] Search works
- [ ] Filters work
- [ ] Analytics accurate

**UI/UX**
- [ ] No layout issues
- [ ] Responsive on all devices
- [ ] No console errors
- [ ] Fast performance

**Data**
- [ ] Test data can be deleted
- [ ] Or keep sample data for demo

**Documentation**
- [ ] Read PAYMENTS_SETUP_GUIDE.md
- [ ] Read PAYMENTS_QUICK_REFERENCE.md
- [ ] Understand all features

---

## 🚀 Deployment Steps

Once all tests pass:

1. **Clean Up Test Data** (Optional)
   ```sql
   DELETE FROM vendor_payments;
   DELETE FROM vendor_project_assignments;
   DELETE FROM vendors;
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add payments and vendor management feature"
   git push origin main
   ```

3. **Verify on Vercel**
   - Wait for deployment
   - Check deployment logs
   - Visit production URL
   - Test one more time

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Tables not found | Run SQL migration in Supabase |
| Can't add vendor | Check user is admin |
| Budget not showing | Ensure project has budget set |
| Payments not linked | Select project when adding payment |
| Permission denied | Check RLS policies |

---

## 📞 If Something Goes Wrong

1. Check browser console
2. Check Supabase logs
3. Review error message
4. Check database tables exist
5. Verify RLS policies
6. Try refreshing page
7. Clear browser cache
8. Restart dev server

---

**Status:** ⏳ TESTING IN PROGRESS

Mark each checkbox as you complete it!

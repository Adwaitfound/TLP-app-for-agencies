# Payments & Vendor Management - Setup Guide

## ✅ What's Been Added

### 1. **Database Schema**
   - **vendors** table - Store vendor information
   - **vendor_payments** table - Track all payments to vendors
   - **vendor_project_assignments** table - Link vendors to projects
   - New enums: vendor_type, payment_frequency, payment_status

### 2. **Features**
   - ✅ Vendor database management
   - ✅ Payment tracking with status (pending, completed, etc.)
   - ✅ Project budget tracking across all 3 verticals
   - ✅ Vendor contact details (phone, email, UPI ID, bank details)
   - ✅ Payment scheduling
   - ✅ Work frequency tracking
   - ✅ Vendor ratings and preferences
   - ✅ Project-vendor assignments

### 3. **UI Components Created**
   - Main dashboard at `/dashboard/payments`
   - Vendor list with search and filters
   - Payment history with status management
   - Project budget tracker by vertical
   - Add vendor dialog
   - Add payment dialog

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy the contents of `VENDORS_PAYMENTS_SCHEMA.sql`
5. Paste and click **Run**

This will create:
- 3 new tables (vendors, vendor_payments, vendor_project_assignments)
- 3 new enums (vendor_type, payment_frequency, payment_status)
- All necessary indexes and RLS policies
- Trigger functions for auto-updating stats

### Step 2: Test the Feature Locally

1. Make sure dev server is running: `npm run dev`
2. Open http://localhost:3000
3. Login as admin
4. Click **"Payments & Vendors"** in the sidebar
5. Test adding a vendor
6. Test recording a payment

### Step 3: Verify Everything Works

**Test Checklist:**
- [ ] Can navigate to Payments & Vendors page
- [ ] Can add a new vendor
- [ ] Can record a payment
- [ ] Budget tracker shows correct data
- [ ] Can filter by vertical
- [ ] All tabs work (Overview, Vendors, Payments, Budgets)

---

## 📊 How to Use

### Adding a Vendor

1. Click **"Add Vendor"** button
2. Fill in required fields:
   - Name
   - Vendor Type (videographer, editor, etc.)
3. Optional but recommended:
   - Phone & Email
   - UPI ID for payments
   - Bank details
   - Work frequency
   - Mark as preferred vendor

### Recording a Payment

1. Click **"Record Payment"** button
2. Select vendor
3. Select project (optional - can be general payment)
4. Enter amount
5. Set status (pending, completed, etc.)
6. Add payment method and transaction ID
7. Add description

### Tracking Project Budgets

1. Go to **"Project Budgets"** tab
2. See breakdown by vertical:
   - Video Production
   - Social Media
   - Design & Branding
3. Each project shows:
   - Total budget
   - Amount paid
   - Pending payments
   - Remaining budget
   - Number of vendors
   - Over-budget warnings

---

## 💡 Key Features

### Vendor Management
- Store complete vendor contact details
- Track payment methods (UPI, Bank Transfer, Cash, Cheque)
- Mark preferred vendors with star
- Track work frequency and last worked date
- Rate vendors (1-5 stars)
- Add notes and skills

### Payment Tracking
- Record payments with multiple statuses
- Schedule future payments
- Link payments to specific projects
- Track payment methods and transaction IDs
- Upload receipts/invoices
- View payment history per vendor

### Budget Management
- See total budget vs spent vs pending per project
- Visual progress bars
- Over-budget warnings
- Vendor count per project
- Filter by vertical (service type)
- Real-time calculations

### Analytics
- Total vendors (active/inactive)
- Total amount paid (all time)
- Pending payments
- Monthly spending
- Top vendors by payment amount
- Vendors by type breakdown

---

## 🔒 Security

- All tables have RLS (Row Level Security) enabled
- Only authenticated users can view data
- Only admins can create/edit/delete
- Vendor stats auto-update on payment completion
- Timestamps automatically managed

---

## 📝 Database Fields

### Vendors Table
- Basic: name, type, contact info
- Payment: UPI, bank details
- Tracking: total paid, projects worked, ratings
- Status: active/inactive, preferred

### Payments Table
- Amount, dates, status
- Payment method, transaction ID
- Description, reason
- Links to vendor and project

### Assignments Table
- Vendor-project relationships
- Role, rate, hours
- Ratings and feedback

---

## 🎨 Vendor Types Supported

✅ Videographer
✅ Photographer
✅ Editor
✅ Animator
✅ Graphic Designer
✅ Sound Engineer
✅ Voice Artist
✅ Equipment Rental
✅ Studio Rental
✅ Drone Operator
✅ Makeup Artist
✅ Talent/Actor
✅ Location Scout
✅ Production Assistant
✅ Other

---

## 🐛 Troubleshooting

**Issue: Can't see Payments tab**
- Make sure you're logged in as admin
- Clear browser cache
- Refresh page

**Issue: Can't add vendor**
- Check Supabase connection
- Verify database schema was created
- Check browser console for errors

**Issue: Budget not showing**
- Ensure projects have budget set
- Check that payments are linked to projects
- Verify project service_type is set

---

## 🚫 Before Deployment

**IMPORTANT: Do NOT deploy until you:**
1. ✅ Run the database migration in Supabase
2. ✅ Test adding vendors locally
3. ✅ Test recording payments locally
4. ✅ Verify budget tracking works
5. ✅ Check all 3 verticals display correctly
6. ✅ Confirm no console errors
7. ✅ Test on different roles (admin only for now)

---

## 📁 Files Created

### Database
- `VENDORS_PAYMENTS_SCHEMA.sql` - Database migration

### Types
- `types/index.ts` - Added vendor & payment types

### Server Actions
- `app/actions/vendor-operations.ts` - All vendor/payment operations

### Pages
- `app/dashboard/payments/page.tsx` - Main payments dashboard

### Components
- `components/payments/vendor-list.tsx` - Vendor table
- `components/payments/payment-list.tsx` - Payment history
- `components/payments/project-budget-tracker.tsx` - Budget tracking
- `components/payments/add-vendor-dialog.tsx` - Add vendor form
- `components/payments/add-payment-dialog.tsx` - Add payment form

### Navigation
- `components/dashboard/sidebar.tsx` - Added Payments tab

---

## ✨ Next Steps (Optional Enhancements)

Future improvements you could add:
- Export payments to Excel/CSV
- Vendor performance analytics
- Automated payment reminders
- Bulk payment import
- Payment approval workflow
- Vendor contracts storage
- Tax calculations (TDS, GST)
- Multi-currency support
- Recurring payment automation

---

**Ready to test! 🎉**

1. Run the SQL migration in Supabase
2. Test locally
3. Once verified, commit and deploy

# 💳 Payments & Vendors - Quick Reference

## 📍 Access
**URL:** http://localhost:3000/dashboard/payments (or /dashboard/payments on production)
**Navigation:** Sidebar → "Payments & Vendors"
**Role Required:** Admin

---

## ⚡ Quick Actions

### Add a Vendor
1. Click **"Add Vendor"** button
2. Fill required: Name, Type
3. Optional: Phone, Email, UPI, Bank details
4. Save

### Record a Payment
1. Click **"Record Payment"** button  
2. Select: Vendor, Amount, Status
3. Optional: Project, Date, Method
4. Save

### Track Budget
1. Go to **"Project Budgets"** tab
2. View by vertical
3. See: Budget → Spent → Pending → Remaining

---

## 📊 Dashboard Overview

```
┌─────────────────────────────────────────────────┐
│  Payments & Vendors                             │
│  ┌──────────┐  ┌──────────────────┐             │
│  │ Add      │  │ Record           │             │
│  │ Vendor   │  │ Payment          │             │
│  └──────────┘  └──────────────────┘             │
├─────────────────────────────────────────────────┤
│  📊 Analytics Cards                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
│  │Total  │ │Total  │ │Pending│ │This   │       │
│  │Vendors│ │Paid   │ │Payments│ │Month  │       │
│  └───────┘ └───────┘ └───────┘ └───────┘       │
├─────────────────────────────────────────────────┤
│  📑 Tabs:                                       │
│  ○ Overview  ○ Vendors  ○ Payments  ○ Budgets  │
└─────────────────────────────────────────────────┘
```

---

## 🗂️ Data You Can Track

### For Each Vendor:
- ✅ Name, Type (videographer, editor, etc.)
- ✅ Phone, Email
- ✅ UPI ID, Bank Account
- ✅ Total Paid, Projects Worked
- ✅ Work Frequency
- ✅ Preferred Status ⭐
- ✅ Active/Inactive

### For Each Payment:
- ✅ Amount
- ✅ Date (payment/scheduled)
- ✅ Status (pending/completed)
- ✅ Payment Method (UPI/Bank/Cash)
- ✅ Transaction ID
- ✅ Linked Project
- ✅ Description & Reason

### For Each Project:
- ✅ Budget
- ✅ Total Paid to Vendors
- ✅ Pending Payments
- ✅ Remaining Budget
- ✅ Number of Vendors
- ✅ Over-Budget Alerts 🚨

---

## 🎯 Common Use Cases

### Use Case 1: New Vendor
```
1. Click "Add Vendor"
2. Name: "Raj Videography"
3. Type: Videographer
4. Phone: +91 98765 43210
5. UPI: raj@paytm
6. Mark as Preferred ⭐
7. Save → Done!
```

### Use Case 2: Pay Vendor
```
1. Click "Record Payment"
2. Vendor: Raj Videography
3. Project: "Client X - Product Video"
4. Amount: 35,000
5. Method: UPI
6. Status: Completed
7. Save → Budget auto-updates!
```

### Use Case 3: Track Project Budget
```
Project: "Client X - Product Video"
Budget: ₹1,00,000

Vendors:
- Videographer: ₹35,000 (paid)    ✅
- Editor: ₹25,000 (pending)        ⏳
- Sound: ₹15,000 (scheduled)       📅

Remaining: ₹25,000                 💰
Status: ✅ Within Budget
```

---

## 🏷️ Vendor Types

| Icon | Type | Use For |
|------|------|---------|
| 🎥 | Videographer | Shooting |
| ✂️ | Editor | Post-production |
| 🎧 | Sound Engineer | Audio work |
| 🎨 | Graphic Designer | Design work |
| 🎤 | Voice Artist | Voiceover |
| 📹 | Equipment Rental | Gear |
| 🏢 | Studio Rental | Location |
| 🚁 | Drone Operator | Aerial shots |

---

## 💰 Payment Statuses

| Status | Meaning | Color |
|--------|---------|-------|
| ⏳ Pending | Not yet paid | Gray |
| 📅 Scheduled | Payment planned | Blue |
| 🔄 Processing | In progress | Yellow |
| ✅ Completed | Paid successfully | Green |
| ❌ Failed | Payment failed | Red |
| 🚫 Cancelled | Payment cancelled | Gray |

---

## 📈 Budget Tracking by Vertical

### Video Production
- Project 1: ₹1,00,000 budget
  - Paid: ₹75,000 (75%)
  - Pending: ₹20,000 (20%)
  - Remaining: ₹5,000 (5%)

### Social Media
- Project 2: ₹50,000 budget
  - Paid: ₹30,000 (60%)
  - Pending: ₹10,000 (20%)
  - Remaining: ₹10,000 (20%)

### Design & Branding
- Project 3: ₹75,000 budget
  - Paid: ₹45,000 (60%)
  - Pending: ₹15,000 (20%)
  - Remaining: ₹15,000 (20%)

---

## 🔍 Search & Filter

### Vendor Search:
- By name
- By email
- By phone
- Filter by type

### Payment Search:
- By vendor name
- By project name
- By description
- Filter by status

---

## ⚠️ Important Notes

1. **Always link payments to projects** for budget tracking
2. **Set payment dates** for cash flow planning
3. **Update status** when payment is made
4. **Mark preferred vendors** for quick access
5. **Check budgets** before approving new payments

---

## 🔧 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't see Payments tab | Login as admin |
| Can't add vendor | Run database migration first |
| Budget not showing | Link payments to projects |
| Numbers wrong | Refresh page |

---

## 📱 Mobile Access

All features work on mobile:
- ✅ Add vendors
- ✅ Record payments
- ✅ View budgets
- ✅ Update statuses
- ✅ Search & filter

---

## 🎓 Best Practices

1. **Before Project Starts**
   - Add all vendors
   - Set up payment methods
   - Define project budget

2. **During Project**
   - Record payments promptly
   - Link to correct project
   - Update statuses

3. **After Project**
   - Mark all as completed
   - Review budget vs actual
   - Rate vendor performance

---

## 🚀 Keyboard Shortcuts

(To be added in future versions)
- `Ctrl/Cmd + K` - Search vendors
- `Ctrl/Cmd + P` - Add payment
- `Ctrl/Cmd + V` - Add vendor

---

**Quick Access:**
- Sidebar → Payments & Vendors
- Or go to: `/dashboard/payments`

**Need Help?**
- Check: PAYMENTS_SETUP_GUIDE.md
- Review: PAYMENTS_IMPLEMENTATION_SUMMARY.md

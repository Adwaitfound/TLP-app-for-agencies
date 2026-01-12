# 🎨 Quick Start - Admin Layout & Brand Colors

## ✅ What's Ready

Your SaaS admins now have:

- **Professional admin layout** (sidebar + header)
- **Brand color customization** (10 colors)
- **Responsive design** (desktop and mobile)
- **Admin-only settings page**

---

## 🚀 Try It Now

### 1. Login to Your Dashboard

```
URL: http://localhost:3001/agency/login
Email: social@thefoundproject.com
```

### 2. You'll See

- Left sidebar with navigation
- Sticky header at top
- Dashboard with welcome section
- Brand color (default: blue)

### 3. Go to Settings

- Click **Settings** in sidebar
- Scroll to **Brand Customization**
- Choose a new color from 10 options
- Click **Save Changes**

### 4. See Brand Color Update

- Header background changes
- Sidebar hover colors update
- Applied instantly after save

---

## 📱 Layout Features

### Desktop

✅ Fixed 280px sidebar
✅ Full navigation visible
✅ All menu items accessible
✅ Main content in center

### Mobile

✅ Hamburger menu in header
✅ Sidebar hidden by default
✅ Full-width content
✅ Touch-friendly buttons

### Sidebar Menu

- 🏠 Dashboard
- 📁 Projects
- 👥 Team Members (admin only)
- 📄 Invoices
- 💳 Payments (admin only)
- ⚙️ Settings (admin only)
- 🚪 Sign Out

---

## 🎨 Brand Color Options

Click on color circles in settings:

| Color          | Hex     |
| -------------- | ------- |
| Blue (default) | #3b82f6 |
| Indigo         | #6366f1 |
| Purple         | #a855f7 |
| Pink           | #ec4899 |
| Red            | #ef4444 |
| Orange         | #f97316 |
| Amber          | #f59e0b |
| Green          | #22c55e |
| Emerald        | #10b981 |
| Cyan           | #06b6d4 |

---

## ⚙️ Settings You Can Customize

In the Settings page:

### Organization Information

- **Organization Name** - Edit your org name
- **Website** - Add your website URL
- **Timezone** - UTC, IST, PST, EST, GMT, CET, JST

### Brand Customization

- **Brand Color** - Choose from 10 colors
- Colors applied to:
  - Sidebar hover states
  - Header background
  - Active menu items
  - Throughout dashboard

---

## 🔐 Permission Levels

### Admin (Current user)

✅ Access Settings
✅ Change brand color
✅ Add team members
✅ Manage payments
✅ Create projects

### Team Members (Future)

❌ Cannot access Settings
❌ Cannot change brand
✅ Can see dashboard with org's brand color
✅ Can use features per plan

---

## 💾 How It Works

### Brand Color Storage

```
Database: saas_organizations.settings
Field: brand_color (string)
Example: "blue", "purple", "emerald"
```

### Component Updates

```
V2Header    → Uses brand_color for gradient
V2Sidebar   → Uses brand_color for hover states
ColorPicker → Shows all 10 options
```

### Real-time Updates

```
1. Change color in settings
2. Click Save
3. Database updated
4. Component re-renders
5. New color applied instantly
```

---

## 📝 For New Agencies

Each new agency that signs up gets:

1. **Default Layout**

   - Blue brand color
   - Standard admin layout
   - All features based on plan

2. **Customization**

   - Can change to any of 10 colors
   - Edit org name
   - Add website URL
   - Choose timezone

3. **Access**
   - Admin sees Settings
   - Team members see dashboard with brand colors
   - All protected by RLS policies

---

## 🧪 Test Checklist

- [ ] Server running (http://localhost:3001)
- [ ] Can login as social@thefoundproject.com
- [ ] See new sidebar layout
- [ ] See new header
- [ ] Can click menu items
- [ ] Go to Settings page
- [ ] See brand color picker
- [ ] Change color (try purple)
- [ ] Click Save
- [ ] Sidebar hover color changed
- [ ] Header background changed

---

## 🎯 Files Modified

### New Components

- `components/v2/sidebar.tsx` - Navigation
- `components/v2/header.tsx` - Header
- `components/v2/color-picker.tsx` - Color selector

### New Pages

- `app/v2/settings/page.tsx` - Settings management
- `app/v2/projects/page.tsx` - Projects (placeholder)
- `app/v2/members/page.tsx` - Members (placeholder)
- `app/v2/invoices/page.tsx` - Invoices (placeholder)
- `app/v2/billing/page.tsx` - Billing (placeholder)

### Updated Files

- `app/v2/layout.tsx` - Main layout with sidebar + header
- `app/v2/dashboard/page.tsx` - New dashboard design

---

## 🚀 Next Time You Deploy

Remember to:

1. Run `ADD_BRAND_COLOR_MIGRATION.sql` in Supabase
2. Deploy new components to production
3. Test brand color customization
4. Share Settings link with admin users

---

**You're all set! Try it now:** http://localhost:3001 🎉

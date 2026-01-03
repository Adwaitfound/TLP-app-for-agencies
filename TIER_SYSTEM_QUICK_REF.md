# Subscription Tier System - Quick Reference

## What You Can Do Now

### ✅ Tier Selection During Onboarding

When approving an agency onboarding request, you can now:

1. Click "Approve & Provision"
2. Select tier:
   - **Standard**: Good for starting agencies
   - **Premium**: For growing agencies needing advanced features
3. System automatically sets seat limits and features

### ✅ Automatic Seat Limit Enforcement

- Database triggers prevent adding users beyond tier limits
- Standard: 1 admin, 2 employees, 2 clients
- Premium: 2 admins, 4 employees, 4 clients
- Attempts to exceed limits will fail with clear error message

### ✅ Feature Access Control

System detects available features by tier:

```typescript
import { hasFeature } from "@/lib/tier-features";

// Check if tier has a feature
if (hasFeature("premium", "comments")) {
  // Comments are available in Premium
}
```

### ✅ Tier Info Display

Use the TierInfo component to show users their subscription details:

```tsx
import { TierInfo } from "@/components/tier-info";

<TierInfo
  tier="premium"
  currentEmployees={2}
  currentClients={1}
  currentAdmins={1}
/>;
```

## How It Works

### Provisioning Flow

1. Admin clicks "Approve & Provision"
2. Tier selection modal opens
3. Admin selects Standard or Premium
4. System saves tier to database
5. New Supabase project is created with:
   - Agencies table with tier column
   - Seat limit columns (employee_seats, client_seats, admin_seats)
   - Database trigger for seat validation
6. Agency record is created with correct tier and limits

### Database Structure

```
agencies
├─ id
├─ name
├─ tier (standard/premium)
├─ employee_seats (2 or 4)
├─ client_seats (2 or 4)
├─ admin_seats (1 or 2)
├─ additional_employees (for paid add-ons)
└─ additional_clients (for paid add-ons)

agency_subscriptions
├─ id
├─ agency_id
├─ tier
├─ status (active/trialing/past_due/canceled)
├─ stripe_subscription_id
└─ timestamps

agency_onboarding_requests
├─ id
├─ ...other fields...
└─ tier (standard/premium)
```

## Testing

### Quick Test: Tier Selection

1. Have a pending onboarding request (or create one)
2. Go to: http://localhost:3000/dashboard/agency-onboarding
3. Click "Approve & Provision"
4. Modal should show:
   - Standard card with 1/2/2 seats
   - Premium card with 2/4/4 seats
5. Select tier and click "Approve & Provision"
6. Check console logs for: `AGENCY_APPROVED { tier: 'standard' }`

### Quick Test: Seat Limits

```typescript
// In your Supabase console, try adding 3rd employee to Standard agency:
INSERT INTO user_memberships (agency_id, user_id, role)
VALUES ('agency-id', 'user-id', 'employee');

// Should get error: "Employee seat limit reached for this agency"
```

## Feature Definitions by Tier

### Standard Tier Features

- Dashboard
- Projects
- All Clients
- Team Members
- All Files
- Invoices
- Settings

### Premium Tier Features

All Standard features + :

- Comments & Collaboration
- Payments & Vendors Management
- Advanced Analytics

## Using Feature Gating in Code

### Check Feature Access (Server-Side)

```typescript
import { checkFeatureAccess } from "@/lib/feature-access";

const { hasAccess, tier } = await checkFeatureAccess(userId, "comments");

if (!hasAccess) {
  // Show upgrade prompt or deny access
}
```

### Check Feature Access (Client-Side)

```typescript
import { hasFeature } from "@/lib/tier-features";
import { useAuth } from "@/contexts/auth-context";

export function CommentsSection() {
  const { agencyTier } = useAuth(); // Need to add tier to auth context

  if (!hasFeature(agencyTier, "comments")) {
    return <UpgradeToPayments />;
  }

  return <Comments />;
}
```

### Conditional UI Rendering

```tsx
import { TIER_CONFIG, FEATURE_NAMES } from "@/lib/tier-features";

export function FeatureList({ tier }) {
  const features = TIER_CONFIG[tier].features;

  return (
    <div>
      {features.map((feature) => (
        <div key={feature}>✓ {FEATURE_NAMES[feature]}</div>
      ))}
    </div>
  );
}
```

## Common Tasks

### Get Tier Configuration

```typescript
import { TIER_CONFIG } from "@/lib/tier-features";

const standard = TIER_CONFIG.standard;
// { maxEmployees: 2, maxClients: 2, maxAdmins: 1, features: [...] }

const premium = TIER_CONFIG.premium;
// { maxEmployees: 4, maxClients: 4, maxAdmins: 2, features: [...] }
```

### Check Seat Availability

```typescript
import { checkSeatAvailability } from "@/lib/tier-features";

const availability = checkSeatAvailability(
  "standard",
  2, // current employees
  1, // current clients
  1, // current admins
  0, // additional employees (paid add-ons)
  0 // additional clients (paid add-ons)
);

if (!availability.canAddEmployee) {
  // Show "Upgrade" or "Purchase add-on" prompt
}
```

### Get Unavailable Features

```typescript
import { getUnavailableFeatures } from "@/lib/feature-access";

const unavailable = getUnavailableFeatures("standard");
// ['comments', 'payments_vendors', 'analytics']
```

## Admin Operations

### Query Agency Subscription

```typescript
const { data: subscription } = await supabase
  .from("agency_subscriptions")
  .select("*")
  .eq("agency_id", agencyId)
  .single();

console.log(subscription.tier); // 'standard' or 'premium'
```

### Upgrade Agency

```typescript
// Update tier
await supabase.from("agencies").update({ tier: "premium" }).eq("id", agencyId);

// Record subscription change
await supabase
  .from("agency_subscriptions")
  .update({ tier: "premium" })
  .eq("agency_id", agencyId);
```

### Add Paid Extra Seats

```typescript
// Add 2 extra employees for $X/month
await supabase
  .from("agencies")
  .update({ additional_employees: 2 })
  .eq("id", agencyId);
```

## Environment Setup

No new environment variables needed! The tier system uses:

- Existing Supabase credentials
- Existing database connection
- No external APIs required

## Migration Status

✅ **Complete** - All migrations are in place:

- `20260103_add_subscription_tiers.sql`: Creates tier system schema
- Included in template project during cloning

## Files Changed

### Core System

- `supabase/migrations/20260103_add_subscription_tiers.sql` - Database schema
- `lib/tier-features.ts` - Tier definitions and utilities
- `lib/feature-access.ts` - Feature access control

### UI Components

- `components/tier-info.tsx` - Display tier and seat usage
- `app/dashboard/agency-onboarding/page.tsx` - Tier selection modal

### API Routes

- `app/api/admin/agency-onboarding/approve/route.ts` - Accept tier parameter

### Provisioning

- `lib/provisioning/orchestrator.ts` - Pass tier to setup
- `lib/provisioning/template-provisioning.ts` - Create agency with tier

### Documentation

- `TIER_SYSTEM_GUIDE.md` - Complete technical guide
- `TIER_SYSTEM_QUICK_REF.md` - This file

## Next Steps (Optional)

1. **Stripe Integration**

   - Create subscription in Stripe when provisioning
   - Link stripe_subscription_id in agency_subscriptions
   - Add billing portal for upgrades/downgrades

2. **Feature UI Gating**

   - Wrap Comments behind feature check
   - Wrap Payments & Vendors behind feature check
   - Wrap Analytics behind feature check
   - Show "Upgrade to Premium" prompts

3. **Seat Upgrade Flow**

   - Add "Buy Extra Seats" in agency dashboard
   - Process payment via Stripe
   - Update additional_employees/additional_clients

4. **Usage Analytics**

   - Track feature usage by tier
   - Monitor seat utilization
   - Generate upgrade recommendations

5. **Self-Service Portal**
   - Let agencies view their subscription
   - Let agencies upgrade/downgrade tier
   - Let agencies purchase extra seats
   - Self-serve billing management

## Support

For issues or questions about the tier system:

1. Check `TIER_SYSTEM_GUIDE.md` for detailed documentation
2. Review test results: `bash test-tier-system.sh`
3. Check console logs during provisioning
4. Look for 'TIER' in git history: `git log --grep=tier`

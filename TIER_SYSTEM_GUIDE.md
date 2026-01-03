# Subscription Tier System Implementation

## Overview

The TLP app now includes a two-tier subscription model to serve agencies of different sizes:

- **Standard Tier**: For small to medium agencies starting out
- **Premium Tier**: For growing agencies needing advanced features

## Tier Specifications

### Standard Tier
- **1 Admin** (non-upgradeable within tier)
- **2 Employees** (can add more via paid add-ons)
- **2 Clients** (can add more via paid add-ons)
- **Features**:
  - Dashboard
  - Projects Management
  - All Clients View
  - Team Members
  - All Files
  - Invoices
  - Settings

### Premium Tier
- **2 Admins** (1 more than Standard)
- **4 Employees** (2 more than Standard, can add more via paid add-ons)
- **4 Clients** (2 more than Standard, can add more via paid add-ons)
- **Features** (all Standard features plus):
  - Comments & Collaboration
  - Payments & Vendors Management
  - Advanced Analytics

## Implementation Details

### Database Schema

#### New Table: `agency_subscriptions`
Tracks active subscription status:
```sql
- id (UUID, primary key)
- agency_id (UUID, foreign key to agencies)
- tier (enum: standard, premium)
- status (enum: active, trialing, past_due, canceled)
- stripe_subscription_id (Text, optional)
- started_at, ended_at (timestamps)
- created_at, updated_at (timestamps)
```

#### New Columns in `agencies` Table
```sql
- tier (agency_tier enum: standard, premium) DEFAULT 'standard'
- employee_seats (INT) DEFAULT 2
- client_seats (INT) DEFAULT 2
- admin_seats (INT) DEFAULT 1
- additional_employees (INT) DEFAULT 0 -- paid add-ons
- additional_clients (INT) DEFAULT 0 -- paid add-ons
```

#### New Column in `agency_onboarding_requests`
```sql
- tier (agency_tier enum: standard, premium) DEFAULT 'standard'
```

### Row Level Security (RLS)

**For `agency_subscriptions`**: Only users belonging to an agency can view their subscription:
```sql
CREATE POLICY "Users can see subscription of their agency"
  ON agency_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agencies
      WHERE agencies.id = agency_subscriptions.agency_id
      AND agencies.id IN (
        SELECT agency_id FROM user_memberships
        WHERE user_id = auth.uid()
      )
    )
  );
```

### Seat Limit Enforcement

**Database Trigger**: `check_seat_limits` prevents adding users beyond their tier's limits:
- Validates before INSERT on `user_memberships`
- Checks role-specific limits (employee, client, admin)
- Includes additional seats purchased as add-ons
- Raises `EXCEPTION` with message if limit exceeded

## Onboarding Flow with Tier Selection

### 1. Admin Opens Onboarding Page
**URL**: `http://localhost:3000/dashboard/agency-onboarding`

### 2. Approves Agency Request
Admin clicks "Approve & Provision" on a pending onboarding request.

### 3. Tier Selection Modal Appears
Modal shows:
- **Standard Tier Card**
  - 1 Admin, 2 Employees, 2 Clients
  - Basic features
  - Add-on pricing note
- **Premium Tier Card**
  - 2 Admins, 4 Employees, 4 Clients
  - All features
  - Add-on pricing note

Admin selects tier with radio button and clicks "Approve & Provision".

### 4. Provisioning Starts
- Tier is saved to `agency_onboarding_requests`
- Supabase project is cloned
- Migrations run (creates schema with tier columns)
- Admin user is created
- Agency record is created with selected tier and seat limits
- Vercel URL is generated
- Welcome email is sent

## Code Files

### Core Tier Configuration
- **`lib/tier-features.ts`**: Tier definitions, feature lists, seat limits
- **`lib/feature-access.ts`**: Feature checking middleware and utilities

### UI Components
- **`components/tier-info.tsx`**: Displays tier, seat usage, available features

### API Routes
- **`app/api/admin/agency-onboarding/approve/route.ts`**: Accepts `tier` parameter

### Provisioning
- **`lib/provisioning/orchestrator.ts`**: Passes tier to setup function
- **`lib/provisioning/template-provisioning.ts`**: Creates agency with tier and seat limits

### Admin Dashboard
- **`app/dashboard/agency-onboarding/page.tsx`**: Tier selection modal

## Usage Examples

### Check if User Can Access Feature
```typescript
import { checkFeatureAccess } from '@/lib/feature-access';

const { hasAccess, tier } = await checkFeatureAccess(userId, 'comments');
if (!hasAccess) {
  // Show upgrade prompt
}
```

### Check Seat Availability
```typescript
import { checkSeatAvailability, TIER_CONFIG } from '@/lib/tier-features';

const availability = checkSeatAvailability(
  'standard',
  2, // current employees
  1, // current clients
  1, // current admins
  0, // additional employees purchased
  0  // additional clients purchased
);

if (availability.canAddEmployee) {
  // Show "Add Employee" button
}
```

### Show Tier Info Component
```typescript
import { TierInfo } from '@/components/tier-info';

<TierInfo
  tier="premium"
  currentEmployees={2}
  currentClients={1}
  currentAdmins={1}
  additionalEmployees={0}
  additionalClients={0}
/>
```

## Feature Gating Examples

### Conditionally Show Features in UI
```tsx
import { shouldShowFeature } from '@/lib/feature-access';

export function Analytics({ tier }: { tier: SubscriptionTier }) {
  if (!shouldShowFeature(tier, 'analytics')) {
    return <UpgradePrompt feature="Analytics" />;
  }
  
  return <AnalyticsComponent />;
}
```

### API Endpoint Feature Check
```typescript
// In route handler
const { hasAccess } = await checkFeatureAccess(userId, 'payments_vendors');

if (!hasAccess) {
  return NextResponse.json({ error: 'Feature not available in your tier' }, { status: 403 });
}

// Process payment request...
```

## Admin Setup (Post-Provisioning)

### View Agency Subscription
```typescript
const { data: subscription } = await supabase
  .from('agency_subscriptions')
  .select('*')
  .eq('agency_id', agencyId)
  .single();
```

### Upgrade Agency Tier
```typescript
// Update agency tier
await supabase
  .from('agencies')
  .update({ tier: 'premium' })
  .eq('id', agencyId);

// Create new subscription record
await supabase
  .from('agency_subscriptions')
  .insert({
    agency_id: agencyId,
    tier: 'premium',
    status: 'active',
    stripe_subscription_id: stripeId,
  });
```

### Add Paid Seats
```typescript
// Add 2 extra employees for $50/month
await supabase
  .from('agencies')
  .update({ additional_employees: 2 })
  .eq('id', agencyId);
```

## Testing

### Test Tier Selection Modal
1. Go to http://localhost:3000/dashboard/agency-onboarding
2. Click "Approve & Provision" on a pending request
3. Select Standard tier, approve
4. Check logs for: `AGENCY_APPROVED { tier: 'standard' }`
5. Repeat with Premium tier

### Test Seat Limits
1. Provision two agencies (one Standard, one Premium)
2. Standard agency: Try to add 3rd employee
   - Should see: "Employee seat limit reached for this agency"
3. Premium agency: Add 5th employee
   - Should succeed (within limit of 4)
   - Try to add 6th employee
   - Should fail: "Employee seat limit reached for this agency"

### Test Feature Access
1. Create endpoint to check feature access
2. Standard tier: Should NOT have 'comments', 'payments_vendors', 'analytics'
3. Premium tier: Should have all features

## Next Steps

1. **Stripe Integration**
   - Add Stripe subscription creation on provisioning
   - Implement billing page
   - Handle subscription upgrades/downgrades

2. **Feature UI Gating**
   - Wrap Comments feature with `shouldShowFeature('comments')`
   - Wrap Analytics with tier check
   - Show "Upgrade to Premium" prompts

3. **Reporting & Limits**
   - Add dashboard showing seat usage
   - Add warning when approaching seat limits
   - Show available paid add-ons

4. **Custom Pricing**
   - Allow tier pricing customization per region
   - Support annual billing discount
   - Volume discounts for larger plans

5. **Migration Path**
   - For existing agencies, set default tier
   - Allow retroactive tier changes
   - Create upgrade/downgrade flows

## Pricing Framework (To Be Configured)

```
Standard: $X/month
  + $X per extra employee
  + $X per extra client

Premium: $Y/month (Y > X)
  + $X per extra employee
  + $X per extra client
```

## Monitoring

Track:
- Number of agencies per tier
- Seat utilization by tier
- Feature usage by tier
- Upgrade/downgrade rates
- Seat overflow (paid add-ons)

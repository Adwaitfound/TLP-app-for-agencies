# Weekly Backup Configuration

## Setup Instructions

### 1. Generate a Cron Secret

Run this command to generate a random secret:

```bash
openssl rand -base64 32
```

### 2. Add Environment Variables to Vercel

Go to: https://vercel.com/adwaits-projects-7be8e91e/tlp-app-v2-cli/settings/environment-variables

Add these variables:

```
CRON_SECRET=<paste the random secret from step 1>
BACKUP_EMAIL_TO=adwait@thelostproject.in
BACKUP_EMAIL_FROM=backups@thelostproject.in
```

### 3. Choose an Email Service (pick one):

#### Option A: Resend (Recommended - Simple & Free)

1. Sign up at https://resend.com
2. Get API key
3. Add to Vercel env vars:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

#### Option B: SendGrid

1. Sign up at https://sendgrid.com
2. Get API key
3. Add to Vercel env vars:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
```

### 4. Deploy

```bash
npx vercel deploy --prod
```

### 5. Test the Backup

Run this command to test manually:

```bash
curl -X GET https://app.thelostproject.in/api/cron/backup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Schedule

- **Frequency:** Every Sunday at midnight (UTC)
- **Cron expression:** `0 0 * * 0`

## What Gets Backed Up

- ✅ Clients
- ✅ Projects
- ✅ Sub-projects
- ✅ Users
- ✅ Employee tasks
- ✅ Invoices
- ✅ Milestones

Backup is sent as JSON attachment to your email.

## Change Schedule

Edit `vercel.json` cron schedule:

- Daily: `0 0 * * *`
- Weekly (Sunday): `0 0 * * 0`
- Bi-weekly: `0 0 */14 * *`
- Monthly: `0 0 1 * *`

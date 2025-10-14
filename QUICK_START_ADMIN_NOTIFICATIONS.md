# Quick Start: Admin Signup Notifications

Get email notifications at **mihir@meetdiya.com** for every new user signup.

## 🚀 Quick Deploy (3 Steps)

### 1️⃣ Deploy Everything

```bash
cd "/Users/mihirbedi/Desktop/Business ideas/AI Counselor/Diya-AI"
./scripts/deploy-admin-notifications.sh
```

### 2️⃣ Enable pg_net Extension

**Option A: Via SQL Editor**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Option B: Via Dashboard**
1. Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/database/extensions
2. Search for `pg_net`
3. Click "Enable"

### 3️⃣ Test It

**Option A: Automated Test**
```bash
./scripts/test-admin-notification.sh
```

**Option B: Create Real Test User**
1. Go to your signup page
2. Create a test account
3. Check mihir@meetdiya.com

## ✅ Verify Setup

Run this in Supabase SQL Editor:

```sql
\i supabase/verify_admin_notification_setup.sql
```

Or manually check:

```sql
-- Should return 'pg_net'
SELECT extname FROM pg_extension WHERE extname = 'pg_net';

-- Should return the trigger name
SELECT tgname FROM pg_trigger WHERE tgname = 'zz_notify_admin_on_user_created';
```

## 📧 What You'll Get

Every new signup sends you an email with:
- ✅ User's name and email
- ✅ What they're applying to (undergrad/MBA/grad)
- ✅ Signup timestamp
- ✅ Direct link to user in Supabase dashboard

## 🔧 Troubleshooting

### No emails received?

1. **Check pg_net is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

2. **Check edge function logs:**
   ```bash
   supabase functions logs send-admin-signup-notification --tail
   ```

3. **Verify Resend API key:**
   - Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/settings/functions
   - Check `RESEND_API_KEY` and `RESEND_FROM` are set

4. **Test manually:**
   ```bash
   ./scripts/test-admin-notification.sh
   ```

### Email in spam?

- Add mihir@meetdiya.com to your contacts
- Mark the test email as "Not Spam"

## 📚 Full Documentation

See [ADMIN_SIGNUP_NOTIFICATIONS_GUIDE.md](ADMIN_SIGNUP_NOTIFICATIONS_GUIDE.md) for:
- Detailed troubleshooting
- Customization options
- Monitoring queries
- Adding Slack notifications

## 📁 Files Created

- ✅ Edge Function: `supabase/functions/send-admin-signup-notification/index.ts`
- ✅ Migration: `supabase/migrations/20251013000000_add_admin_signup_notification.sql`
- ✅ Deploy Script: `scripts/deploy-admin-notifications.sh`
- ✅ Test Script: `scripts/test-admin-notification.sh`
- ✅ Verify Script: `supabase/verify_admin_notification_setup.sql`
- ✅ This Guide: `QUICK_START_ADMIN_NOTIFICATIONS.md`
- ✅ Full Guide: `ADMIN_SIGNUP_NOTIFICATIONS_GUIDE.md`

---

**Need Help?** Check the full guide or view edge function logs for details.



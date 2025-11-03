# Founder Escalation Email Notifications Setup

Get email notifications at **mihir@meetdiya.com** whenever a student escalates an essay for review.

## 🚀 Quick Deploy

### 1️⃣ Deploy Edge Function

```bash
cd "/Users/mihirbedi/Desktop/Business ideas/AI Counselor/Diya-AI"
supabase functions deploy send-founder-escalation-notification
```

### 2️⃣ Run Database Migration

```bash
supabase db push
```

Or manually run the migration:
```sql
\i supabase/migrations/20251102193300_add_founder_escalation_notification.sql
```

### 3️⃣ Verify pg_net Extension (if not already enabled)

**Option A: Via SQL Editor**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Option B: Via Dashboard**
1. Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/database/extensions
2. Search for `pg_net`
3. Click "Enable"

### 4️⃣ Configure Environment Variables

Make sure these are set in Supabase Dashboard → Settings → Edge Functions:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=mihir@meetdiya.com
```

(These should already be configured if you've set up other email functions)

## ✅ Verify Setup

Run this in Supabase SQL Editor:

```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'zz_notify_founder_on_escalation';

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'notify_founder_of_escalation';
```

## 📧 What You'll Get

Every time a student escalates an essay, you'll receive an email with:
- ✅ Student's name and email
- ✅ Essay title
- ✅ Word count and character count
- ✅ Direct link to review the essay in Founder Portal
- ✅ Escalation timestamp

## 🔧 Troubleshooting

### No emails received?

1. **Check pg_net is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

2. **Check edge function logs:**
   ```bash
   supabase functions logs send-founder-escalation-notification --tail
   ```

3. **Verify Resend API key:**
   - Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/settings/functions
   - Check `RESEND_API_KEY` and `RESEND_FROM` are set

4. **Check database logs:**
   ```sql
   -- Check if trigger is firing
   SELECT * FROM pg_stat_activity WHERE query LIKE '%notify_founder%';
   ```

### Test the Function Manually

You can test the Edge Function directly:

```bash
curl -X POST 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-founder-escalation-notification' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -d '{
    "escalationId": "test-id",
    "essayId": "test-essay-id",
    "userId": "test-user-id",
    "essayTitle": "Test Essay",
    "wordCount": 500,
    "characterCount": 2500,
    "escalatedAt": "2025-01-01T12:00:00Z",
    "studentName": "Test Student",
    "studentEmail": "test@example.com"
  }'
```

### Email in spam?

- Add mihir@meetdiya.com to your contacts
- Mark the test email as "Not Spam"

## 📁 Files Created

- `supabase/functions/send-founder-escalation-notification/index.ts` - Edge Function
- `supabase/migrations/20251102193300_add_founder_escalation_notification.sql` - Database trigger

## 🔄 How It Works

1. When a student escalates an essay, a new row is inserted into `escalated_essays` table
2. The database trigger `zz_notify_founder_on_escalation` fires automatically
3. The trigger calls the Edge Function via `pg_net.http_post()`
4. The Edge Function:
   - Fetches student info from `user_profiles` if not provided
   - Generates a nice HTML email
   - Sends it to mihir@meetdiya.com via Resend
5. You receive the notification with a direct link to review the essay

## ⚙️ Advanced Configuration

### Customize Email Recipient

Edit `supabase/functions/send-founder-escalation-notification/index.ts`:

```typescript
const founderEmail = "your-email@example.com"; // Change this line
```

### Customize Email Content

Edit the `generateFounderEscalationEmail()` function in the same file.

### Disable Notifications

To temporarily disable notifications:

```sql
DROP TRIGGER IF EXISTS zz_notify_founder_on_escalation ON public.escalated_essays;
```

To re-enable:

```sql
CREATE TRIGGER zz_notify_founder_on_escalation
  AFTER INSERT ON public.escalated_essays
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_founder_of_escalation();
```


# Diya AI Analytics Guide

## Quick Start

Analytics are initialized automatically when the app loads. The GA4 Measurement ID is configured via environment variables:

```bash
# .env.local or similar
VITE_GA_ID=G-EG61TCBFGV  # for Vite
# or
NEXT_PUBLIC_GA_ID=G-EG61TCBFGV  # for Next.js
```

For development debugging:
```bash
VITE_ANALYTICS_DEBUG=true  # shows friendly console logs
```

## Adding New Events

1. Check `docs/analytics/events.json` for existing events
2. Pick a clear name (snake_case, max 40 chars)
3. Add 1-2 key parameters that you'll want to filter/group by
4. Update events.json with your new event details
5. Test in debug mode to verify data

Example:
```typescript
trackError('network_error', 'Voice connection failed', {
  source: 'voice_engine',
  level: 'error',
  user_action: 'starting_onboarding'
});
```

## How to Read Errors in GA4

1. Go to Reports > Events > error_occurred
2. Key fields to check:
   - message: Plain English description of what went wrong
   - source: Which part of the app had the issue
   - level: Priority ('warning', 'error', 'critical')
   - user_action: What the user was doing

Common patterns:
- Filter by level='critical' to see urgent issues
- Group by source to spot problem areas
- Look at message patterns to find recurring issues

Example debug flow:
1. See spike in errors
2. Filter to last hour
3. Group by source + message
4. Check if users were doing something specific (user_action)
5. Look for patterns in timing or user flow

## GA4 Custom Definitions

Add these dimensions in GA4 Admin > Custom Definitions for better reporting:

- error_type (event parameter)
- error_level (event parameter)
- school_category (event parameter)
- feature_name (event parameter)
- conversion_type (event parameter)

This lets you create segments and filters using these fields.

## Privacy & PII

We NEVER send:
- Email addresses
- Names
- Phone numbers
- Essay content
- Voice transcripts
- Full user inputs

Parameters are automatically sanitized to:
- Remove common PII fields
- Truncate long text (100 char max)
- Skip large arrays
- Limit to 25 parameters per event

## Debugging Tips

1. Enable debug mode:
```bash
VITE_ANALYTICS_DEBUG=true
```

2. Watch browser console for:
- 📊 Analytics Event: Regular events
- 📄 Page View: Route changes
- 🚨 Error logged: Issues to investigate
- ✅ Tracked: Important conversions

3. Use GA4 DebugView:
- Real-time event validation
- Check parameter values
- Verify triggers work

4. Common issues:
- Events not showing: Check console for errors
- Missing data: Verify required fields
- Duplicates: We auto-skip within 2 seconds
- Too many errors: We throttle after 5 similar ones in 10s

## BigQuery Export (Optional)

For advanced analysis, enable BigQuery export in GA4:
1. Admin > BigQuery Links
2. Link your project
3. Wait 24h for first export

Example queries in `sql/`:
- funnels.sql: Conversion paths
- cohorts.sql: User retention
- errors.sql: Error patterns

## CSP Headers

If you use Content Security Policy, allow:
```
script-src:
  https://www.googletagmanager.com
  https://www.google-analytics.com

connect-src:
  https://www.google-analytics.com
  https://region1.google-analytics.com

img-src:
  https://www.google-analytics.com
  https://ssl.gstatic.com
  data:
```

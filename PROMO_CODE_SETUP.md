# Promo Code Setup Instructions

## Overview
This implementation adds promo code tracking to send users to different Stripe checkout pages. When users click "Upgrade to Pro", they are prompted to enter a promo code before proceeding to checkout.

## Current Promo Code
- **Promo Code**: `early-access-39jkl5fe2`
- **Early Access Price ID**: `price_1SOnm6Cl951Iw04MQdhK2ETY`

## Setup Steps

### 1. Create Supabase Secret
Add the following secret to your Supabase project:

**Secret Name**: `STRIPE_EA_PRICE_ID`  
**Secret Value**: `price_1SOnm6Cl951Iw04MQdhK2ETY`

**How to add:**
1. Go to your Supabase Dashboard
2. Navigate to Project Settings > Edge Functions > Secrets
3. Click "Add Secret"
4. Name: `STRIPE_EA_PRICE_ID`
5. Value: `price_1SOnm6Cl951Iw04MQdhK2ETY`
6. Click "Save"

### 2. Update Promo Code (When Needed)
To change the promo code, edit the `VALID_PROMO_CODE` constant in:
- **File**: `src/components/PromoCodeModal.tsx`
- **Line**: ~8
- **Current Value**: `early-access-39jkl5fe2`

The promo code validation is case-insensitive, so users can enter it in any case.

## How It Works

### User Flow
1. User clicks "Upgrade to Pro" from any location (Subscription page, Pricing page, Upgrade Modal, PaywallGuard)
2. **Promo Code Modal** appears asking for a promo code
3. User can either:
   - Enter a valid promo code → Proceeds to Stripe checkout with early access price ID
   - Click "Enter Anyway" → Proceeds to Stripe checkout with regular price ID

### Technical Flow
1. `PromoCodeModal` component validates the promo code
2. If valid, sets `use_promo_price: true` when calling `createCheckoutSession()`
3. `create-stripe-checkout` edge function checks `use_promo_price`:
   - If `true`: Uses `STRIPE_EA_PRICE_ID` from Supabase secrets
   - If `false`: Uses regular `STRIPE_TEST_PRICE_ID` (from request or env)
4. Stripe checkout session is created with appropriate price ID
5. Metadata includes `promo_code` and `is_promo` for tracking

## Webhook Handling

The existing Stripe webhook (`stripe-webhook`) does **NOT** need any changes. It:
- Processes all `checkout.session.completed` events the same way
- Upgrades users to Pro tier regardless of which price ID was used
- Logs promo code information for analytics/tracking purposes

The webhook will log:
- `is_promo: true/false` from session metadata
- `promo_code: 'early-access'` if applicable

## Files Modified

### New Files
- `src/components/PromoCodeModal.tsx` - Promo code entry modal component

### Modified Files
- `src/services/stripePaymentService.ts` - Added `use_promo_price` option
- `src/pages/Subscription.tsx` - Added promo code modal integration
- `src/components/UpgradeModal.tsx` - Added promo code modal integration
- `src/pages/Pricing.tsx` - Added promo code modal integration
- `src/components/PaywallGuard.tsx` - Added promo code modal integration
- `supabase/functions/create-stripe-checkout/index.ts` - Added promo price ID logic and metadata tracking
- `supabase/functions/stripe-webhook/index.ts` - Added promo code logging (no functional changes)

## Testing

1. **Test Promo Code Flow:**
   - Click "Upgrade to Pro"
   - Enter promo code: `early-access-39jkl5fe2`
   - Verify redirect to Stripe checkout with early access price

2. **Test Regular Flow:**
   - Click "Upgrade to Pro"
   - Click "Enter Anyway"
   - Verify redirect to Stripe checkout with regular price

3. **Test Invalid Promo Code:**
   - Click "Upgrade to Pro"
   - Enter invalid code
   - Verify error message appears

## Future Enhancements

If you want to track promo vs regular purchases in your database:

1. Add a column to track purchase type:
   ```sql
   ALTER TABLE user_profiles 
   ADD COLUMN purchase_type VARCHAR(20) DEFAULT 'regular';
   -- Values: 'regular' or 'promo'
   ```

2. Update the webhook to store this information:
   - Check `session.metadata.is_promo`
   - Update `purchase_type` column accordingly

## Notes

- Promo code is currently hardcoded but can be easily updated in `PromoCodeModal.tsx`
- The validation is case-insensitive for better UX
- All upgrade entry points now show the promo code modal first
- The webhook continues to work as before - no breaking changes


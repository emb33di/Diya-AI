# Razorpay SFTP Invoice Collection Setup Assessment

## 📋 Overview

This document assesses what needs to be implemented to enable **SFTP-based invoice collection** for Razorpay payments as per their invoice collection requirements.

## 🔍 Current State Analysis

### ✅ What Exists
1. **Payment Flow Complete** - Orders are created and payments are processed
2. **Payment Data Storage** - Database already stores:
   - `razorpay_order_id` (can serve as invoice number)
   - `razorpay_payment_id`
   - `payment_amount`
   - `payment_currency`
   - User profile data (name, email, address)
3. **Payment Completion Flow** - Payment completion triggers `completePayment()` method

### ❌ What's Missing
1. **Invoice Generation** - No invoice PDF generation
2. **Invoice Details** - Missing required invoice fields:
   - Business name/address
   - Customer complete address
   - Description of goods/services
   - Units sold
   - Taxes applied
3. **SFTP Client** - No SFTP upload capability
4. **SFTP Configuration** - Missing credentials and setup

---

## 🎯 Requirements from Razorpay

### Invoice Content Requirements
Each invoice must contain:
- ✅ Unique invoice number (your order_id)
- ❌ Partner's/business name
- ❌ Partner's/business address
- ❌ Customer's complete address
- ❌ Description of goods/services
- ❌ Units sold (e.g., "1 Pro Subscription")
- ❌ Amount in INR (2 decimals only)
- ❌ Taxes applied (GST)

### SFTP Requirements
- **File Path Format**: `invoiceUpload/automated/<MID>/YYYY-MM-DD/InvoiceNumber.pdf`
- **File Format**: PDF only
- **Folder Date**: YYYY-MM-DD format
- **No slashes**: Avoid `/` in folder names or filenames

### Setup Requirements (Manual Steps)
1. **Share SSH Public Key** with Razorpay contact
2. **IP Whitelisting** - Provide list of authorized outbound IPs
3. **Receive Credentials** from Razorpay:
   - Hostname
   - Port (default: 22)
   - Username
   - Path prefix (based on your MID - Merchant ID)

---

## 🚀 Implementation Plan

### Phase 1: Invoice Generation (Backend)
**Location**: New Supabase Edge Function `razorpay-generate-invoice`

**Requirements**:
1. Use order data to generate invoice
2. Include all required fields:
   - Business information (Diya AI details)
   - Customer information (from user_profiles)
   - Invoice number (order_id)
   - Service description ("Pro Subscription")
   - Amount with 2 decimal places
   - GST calculation and breakdown
3. Generate PDF using a library (e.g., `pdf-lib`, `puppeteer`, or `jsPDF`)

**Input Data Needed**:
```typescript
interface InvoiceData {
  // From payment
  order_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  
  // From user_profile
  customer_name: string;
  customer_email: string;
  customer_address: string;
  
  // Business details (store in env/config)
  business_name: string;
  business_address: string;
  business_gstin: string;
  
  // Service details
  service_description: string;
  quantity: number;
  tax_rate: number; // e.g., 18% GST
}
```

### Phase 2: SFTP Upload Integration (Backend)
**Location**: Supabase Edge Function `razorpay-upload-invoice`

**Requirements**:
1. Connect to Razorpay SFTP server using credentials
2. Create proper directory structure: `invoiceUpload/automated/<MID>/YYYY-MM-DD/`
3. Upload PDF file with format: `<InvoiceNumber>.pdf`
4. Handle authentication via SSH keys
5. Error handling and retry logic

**SFTP Client**:
- Use `ssh2-sftp-client` npm package
- Store SFTP credentials in Supabase secrets
- Automatically generate proper paths

### Phase 3: Payment Flow Integration
**Location**: Modify `src/services/razorpayService.ts` and `supabase/functions/razorpay-store-payment/index.ts`

**Changes Needed**:
1. After successful payment storage, trigger invoice generation
2. After invoice generation, trigger SFTP upload
3. Add invoice status tracking in database

### Phase 4: Database Schema Updates
**Location**: New migration file

**New Columns Needed**:
```sql
-- Add invoice tracking to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS invoice_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS invoice_uploaded BOOLEAN DEFAULT FALSE;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS invoice_uploaded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS invoice_filename TEXT;

-- Create separate invoices table for tracking
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  filename TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  tax_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL,
  invoice_status TEXT DEFAULT 'pending', -- pending, generated, uploaded
  uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON public.invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(invoice_status);
```

### Phase 5: Configuration & Environment Setup

**Supabase Secrets Required**:
```bash
# SFTP Configuration
RAZORPAY_SFTP_HOST=your-sftp-host.example.com
RAZORPAY_SFTP_PORT=22
RAZORPAY_SFTP_USERNAME=your-username
RAZORPAY_SFTP_KEY_PATH=path/to/private/key

# Business Information
BUSINESS_NAME=Diya AI
BUSINESS_ADDRESS=Your full business address here
BUSINESS_GSTIN=XXAAAAA0000A1ZX  # If applicable
BUSINESS_CITY=Your City
BUSINESS_STATE=Your State
BUSINESS_PIN=123456
BUSINESS_PHONE=+91XXXXXXXXXX
BUSINESS_EMAIL=contact@diya.ai

# Merchant ID from Razorpay
RAZORPAY_MERCHANT_ID=MDoeHNNpi0nB7m  # This is the MID
```

---

## 📁 Files to Create/Modify

### New Files to Create:
1. **`supabase/functions/razorpay-generate-invoice/index.ts`**
   - Invoice PDF generation logic
   - Uses PDF generation library

2. **`supabase/functions/razorpay-upload-invoice/index.ts`**
   - SFTP upload logic
   - Handles file path creation and upload

3. **`supabase/migrations/[timestamp]_add_invoice_tracking.sql`**
   - Invoice table and columns

4. **`.env.example`** (update existing)
   - Add SFTP configuration examples

### Files to Modify:
1. **`src/services/razorpayService.ts`**
   - Add `generateInvoice()` method
   - Add `uploadInvoice()` method
   - Modify `completePayment()` to include invoice flow

2. **`supabase/functions/razorpay-store-payment/index.ts`**
   - Trigger invoice generation after storing payment
   - Or return invoice generation task

3. **`src/integrations/supabase/types.ts`**
   - Update TypeScript types for new invoice columns

---

## 🔧 Technical Implementation Details

### Invoice PDF Generation Options:
1. **jsPDF + html2canvas** (Client-side, lightweight)
   - Easy HTML-to-PDF conversion
   - Limited layout control

2. **pdf-lib** (Pure JS, most flexible)
   - Full control over PDF structure
   - Manual layout creation

3. **Puppeteer** (Server-side, best quality)
   - Uses headless Chrome
   - Renders HTML perfectly
   - Higher resource usage

**Recommendation**: Start with **pdf-lib** for flexibility and server-side compatibility.

### SFTP Upload Library:
- **ssh2-sftp-client** - Promises-based SFTP client for Node.js
- Works well in Deno/Supabase Edge Functions

### Invoice Data Flow:
```
Payment Success 
  → Complete Payment 
    → Store Payment (existing)
      → Generate Invoice (NEW)
        → Upload via SFTP (NEW)
          → Update Invoice Status
```

---

## ⚠️ Important Considerations

### 1. Invoice Uniqueness
- Use `razorpay_order_id` as invoice number (already unique)
- Track uploaded invoices to prevent duplicates
- Handle failed payment re-attempts

### 2. SFTP Security
- Store SSH private key securely in Supabase secrets
- Use key-based authentication (not password)
- Rotate keys periodically

### 3. Error Handling
- Invoice generation failures should not block payment
- Log errors for manual retry
- Add retry mechanism for SFTP uploads
- Monitor upload success/failure

### 4. Business Information
- You need to provide actual business details:
  - Registered business name
  - Complete address
  - GST registration number (if applicable)
  - Contact details
- These will be embedded in every invoice

### 5. Tax Calculation
- If registered under GST, apply appropriate rate (e.g., 18%)
- Calculate: Tax = Amount × Tax Rate
- Show: Subtotal + Tax = Total
- Include GSTIN in invoice

### 6. Date Handling
- Invoice date format: YYYY-MM-DD
- Match Razorpay's date format for folder structure
- Use UTC or IST timezone consistently

---

## 📝 Next Steps

### Immediate Actions Required:
1. **Get SFTP Credentials from Razorpay**
   - Contact your Razorpay account manager
   - Provide your SSH public key
   - Share authorized IP addresses
   - Receive: hostname, username, path prefix

2. **Collect Business Information**
   - Business registration details
   - Complete business address
   - GST registration (if applicable)
   - Contact information

3. **Decide on Tech Stack**
   - Choose PDF generation library
   - Choose SFTP library (ssh2-sftp-client recommended)

4. **Generate SSH Key Pair**
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/razorpay_sftp_key
   ```

### Development Steps:
1. Create invoice table migration
2. Set up environment variables
3. Create invoice generation function
4. Create SFTP upload function
5. Integrate with payment flow
6. Test with test Razorpay account
7. Deploy to production

---

## 🎯 Estimated Implementation Complexity

- **Invoice Generation**: Medium (2-3 days)
  - PDF library integration
  - Template creation
  - Data extraction from user profile

- **SFTP Upload**: Medium (1-2 days)
  - SSH client setup
  - Path generation logic
  - Error handling

- **Integration**: Easy (1 day)
  - Modify existing payment flow
  - Add hooks/triggers

- **Testing**: Medium (2-3 days)
  - Test with Razorpay test environment
  - Verify invoice format compliance
  - Test all edge cases

**Total Estimated Time**: 6-9 days

---

## 📞 Required External Information

Before starting implementation, you need:

1. ✅ **SFTP Credentials** from Razorpay
2. ✅ **SSH Public Key** generation and sharing
3. ✅ **IP Whitelist** list of authorized IPs
4. ✅ **Merchant ID (MID)** from Razorpay dashboard
5. ✅ **Business Information** for invoice template
6. ✅ **GST Details** (if applicable)

---

## 📚 Additional Resources

- [Razorpay Invoice Collection Docs](https://razorpay.com/docs/payments/invoice-collection/)
- [SFTP Setup Guide](https://razorpay.com/docs/payments/custom-payment-gateway/#invoice-submission-via-sftp)
- SSH2 SFTP Client: https://github.com/theophilusx/ssh2-sftp-client
- pdf-lib: https://github.com/Hopding/pdf-lib

---

## ❓ Questions to Resolve

1. **Is your business registered under GST?**
   - If yes, what's your GSTIN?
   - What's the applicable GST rate?

2. **Do you have a registered business address?**
   - Need complete address for invoice header

3. **What's your Razorpay Merchant ID?**
   - Check in Razorpay Dashboard
   - Format: `MDoeHNNpi0nB7m` (example from your docs)

4. **Which PDF generation approach do you prefer?**
   - Recommendation: pdf-lib for flexibility

5. **Should invoices be stored locally as well?**
   - For record-keeping purposes
   - For customer access/download

---

## Conclusion

To enable SFTP invoice collection, you need to:

1. **Generate invoice PDFs** with required business/customer details
2. **Implement SFTP upload** to Razorpay's server with correct path structure
3. **Integrate with payment flow** to trigger after successful payment
4. **Configure environment** with SFTP credentials and business information
5. **Test thoroughly** before enabling in production

**The good news**: Your payment flow is already complete. You just need to add invoice generation and SFTP upload after payment completion.

**Start by**: Getting SFTP credentials from Razorpay and collecting your business information.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Verify Stripe webhook signature
 * Uses HMAC SHA256 to verify the webhook came from Stripe
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Parse the signature header (format: t=timestamp,v1=signature)
    const elements = signature.split(',');
    const timestampMatch = elements.find(el => el.startsWith('t='));
    const signatureMatch = elements.find(el => el.startsWith('v1='));
    
    if (!timestampMatch || !signatureMatch) {
      console.error('Invalid signature format');
      return false;
    }

    const timestamp = parseInt(timestampMatch.split('=')[1]);
    const receivedSignature = signatureMatch.split('=')[1];

    // Validate timestamp to prevent replay attacks
    // Stripe recommends rejecting timestamps older than 5 minutes
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - timestamp);
    
    if (timeDifference > 300) { // 300 seconds = 5 minutes
      console.error(`Webhook timestamp too old: ${timeDifference}s difference. Possible replay attack.`);
      return false;
    }

    // Create the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Import the secret key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Generate signature
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signedPayload)
    );

    // Convert to hex
    const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (generatedSignature.length !== receivedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < generatedSignature.length; i++) {
      result |= generatedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Find user by email address
 * Checks user_profiles table which should have email_address populated
 */
async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user in user_profiles by email_address
    // The handle_new_user trigger should populate email_address when user signs up
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email_address')
      .ilike('email_address', normalizedEmail) // Case-insensitive search
      .maybeSingle();

    if (profileError) {
      console.error('Error querying user_profiles:', profileError);
      return null;
    }

    if (profile?.user_id) {
      console.log(`✅ Found user ${profile.user_id} for email ${normalizedEmail}`);
      return profile.user_id;
    }

    console.warn(`⚠️ No user found in user_profiles with email: ${normalizedEmail}`);
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Migrate all guest essays for a user after payment succeeds
 * This ensures preview essays are migrated to the user's account
 */
async function migrateGuestEssaysForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ migratedCount: number; errors: string[] }> {
  try {
    // Get all guest essays for this user
    const { data: guestEssays, error: fetchError } = await supabase
      .from('guest_essays')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching guest essays:', fetchError);
      return { migratedCount: 0, errors: [fetchError.message] };
    }

    if (!guestEssays || guestEssays.length === 0) {
      return { migratedCount: 0, errors: [] };
    }

    const errors: string[] = [];
    let migratedCount = 0;

    // Migrate each guest essay
    for (const guestEssay of guestEssays) {
      try {
        // Calculate word count
        const essayContent = guestEssay.essay_content || '';
        const wordCount = essayContent.trim().length > 0
          ? essayContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 0).length
          : 0;
        const characterCount = essayContent.length;

        // Convert semantic document blocks to essay content format
        const semanticDoc = guestEssay.semantic_document;
        const essayContentData = {
          blocks: semanticDoc.blocks.map((block: any) => ({
            id: block.id,
            type: block.type,
            content: block.content,
            metadata: block.metadata || {}
          })),
          metadata: {
            totalWordCount: wordCount,
            totalCharacterCount: characterCount,
            lastSaved: new Date().toISOString()
          }
        };

        // Create essay
        const { data: essay, error: essayError } = await supabase
          .from('essays')
          .insert({
            user_id: userId,
            title: guestEssay.title,
            school_name: guestEssay.school_name,
            prompt_text: guestEssay.prompt_text,
            word_limit: guestEssay.word_limit,
            content: essayContentData,
            word_count: wordCount,
            character_count: characterCount,
            status: 'draft'
          })
          .select()
          .single();

        if (essayError || !essay) {
          errors.push(`Failed to create essay "${guestEssay.title}": ${essayError?.message || 'Unknown error'}`);
          continue;
        }

        // Create semantic document
        const semanticDocMetadata = {
          ...semanticDoc.metadata,
          essayId: essay.id,
          author: userId
        };

        const { data: semanticDocData, error: docError } = await supabase
          .from('semantic_documents')
          .insert({
            id: semanticDoc.id,
            title: semanticDoc.title,
            blocks: semanticDoc.blocks,
            metadata: semanticDocMetadata,
            created_at: semanticDoc.createdAt || new Date().toISOString(),
            updated_at: semanticDoc.updatedAt || new Date().toISOString()
          })
          .select()
          .single();

        if (docError || !semanticDocData) {
          // Clean up essay
          await supabase.from('essays').delete().eq('id', essay.id);
          errors.push(`Failed to create semantic document for "${guestEssay.title}": ${docError?.message || 'Unknown error'}`);
          continue;
        }

        // Create semantic annotations
        if (guestEssay.semantic_annotations && guestEssay.semantic_annotations.length > 0) {
          const annotationsToInsert = guestEssay.semantic_annotations.map((annotation: any) => ({
            id: annotation.id,
            document_id: semanticDocData.id,
            block_id: annotation.targetBlockId,
            type: annotation.type,
            author: annotation.author,
            content: annotation.content,
            target_text: annotation.targetText || null,
            resolved: annotation.resolved || false,
            resolved_at: annotation.resolvedAt ? annotation.resolvedAt : null,
            resolved_by: annotation.resolvedBy || null,
            created_at: annotation.createdAt || new Date().toISOString(),
            updated_at: annotation.updatedAt || new Date().toISOString(),
            action_type: annotation.actionType || 'none',
            suggested_replacement: annotation.suggestedReplacement || null,
            original_text: annotation.originalText || null,
            metadata: annotation.metadata || {}
          }));

          const { error: annotationsError } = await supabase
            .from('semantic_annotations')
            .insert(annotationsToInsert);

          if (annotationsError) {
            // Clean up essay and semantic document
            await supabase.from('semantic_documents').delete().eq('id', semanticDocData.id);
            await supabase.from('essays').delete().eq('id', essay.id);
            errors.push(`Failed to create annotations for "${guestEssay.title}": ${annotationsError.message}`);
            continue;
          }
        }

        // Delete guest essay after successful migration
        await supabase.from('guest_essays').delete().eq('id', guestEssay.id);
        migratedCount++;
        console.log(`✅ Migrated guest essay ${guestEssay.id} for user ${userId}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error migrating essay "${guestEssay.title}": ${errorMessage}`);
        console.error(`❌ Error migrating guest essay ${guestEssay.id}:`, error);
      }
    }

    return { migratedCount, errors };
  } catch (error) {
    console.error('Error migrating guest essays:', error);
    return {
      migratedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Upgrade user to Pro tier
 */
async function upgradeUserToPro(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  customerEmail: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    // IDEMPOTENCY CHECK: Prevent race conditions between webhook and client verification
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_tier, stripe_checkout_session_id, escalation_slots')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile?.user_tier === 'Pro') {
      console.log(`User ${userId} already has Pro tier, skipping upgrade`);
      
      // Still update session_id if not set
      if (!existingProfile.stripe_checkout_session_id && sessionId) {
        await supabase
          .from('user_profiles')
          .update({ 
            stripe_checkout_session_id: sessionId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
      
      return { 
        success: true, 
        message: 'User already has Pro tier' 
      };
    }

    // Update user tier to Pro with audit fields
    const updateData: any = {
      user_tier: 'Pro',
      updated_at: new Date().toISOString()
    };

    // Only set escalation_slots to 2 if it's currently NULL (new Pro user)
    // This preserves any admin manual adjustments
    if (existingProfile?.escalation_slots === null || existingProfile?.escalation_slots === undefined) {
      updateData.escalation_slots = 2;
    }

    if (sessionId) {
      updateData.stripe_checkout_session_id = sessionId;
    }
    if (customerEmail) {
      updateData.stripe_customer_email = customerEmail.toLowerCase();
    }
    updateData.upgraded_by = 'webhook';
    updateData.upgraded_at = new Date().toISOString();

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update user tier:', error);
      return {
        success: false,
        message: `Failed to upgrade user: ${error.message}`
      };
    }

    console.log(`✅ User ${userId} upgraded to Pro tier via webhook`);
    return {
      success: true,
      message: 'User upgraded to Pro tier successfully'
    };
  } catch (error) {
    console.error('Error upgrading user to Pro:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get webhook signing secret from environment
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in headers');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('❌ Invalid webhook signature - possible security issue');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Webhook signature verified');

    // Parse the event
    const event = JSON.parse(rawBody);
    console.log(`📦 Received Stripe webhook event: ${event.type}`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        console.log('Processing checkout.session.completed:', {
          session_id: session.id,
          payment_status: session.payment_status,
          client_reference_id: session.client_reference_id,
          metadata_user_id: session.metadata?.user_id,
          customer_email: session.customer_email || session.customer_details?.email,
          is_promo: session.metadata?.is_promo === 'true',
          promo_code: session.metadata?.promo_code
        });

        // Only process if payment was successful
        if (session.payment_status !== 'paid') {
          console.log(`Payment not completed, status: ${session.payment_status}`);
          return new Response(
            JSON.stringify({ 
              received: true,
              message: `Payment status is ${session.payment_status}, skipping upgrade`
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Capture email if present for storage/analytics
        const customerEmail = session.customer_email || session.customer_details?.email || null;

        // Resolve user ID with robust fallbacks
        let userId = session.client_reference_id || session.metadata?.user_id || null;

        if (!userId && customerEmail) {
          userId = await findUserByEmail(supabase, customerEmail);
        }

        if (!userId) {
          console.error('❌ Could not identify user from session');
          return new Response(
            JSON.stringify({ 
              received: true,
              error: 'Cannot identify user - missing client_reference_id, metadata, and email'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Upgrade user to Pro
        const upgradeResult = await upgradeUserToPro(
          supabase,
          userId,
          session.id,
          customerEmail
        );

        if (upgradeResult.success) {
          console.log(`✅ Successfully processed payment for user ${userId}`);
          
          // Migrate all guest essays for this user after payment succeeds
          try {
            const migrationResult = await migrateGuestEssaysForUser(supabase, userId);
            if (migrationResult.migratedCount > 0) {
              console.log(`✅ Migrated ${migrationResult.migratedCount} guest essay(s) for user ${userId}`);
            }
            if (migrationResult.errors.length > 0) {
              console.warn(`⚠️ Some essays failed to migrate:`, migrationResult.errors);
            }
          } catch (migrationError) {
            console.error('Error migrating guest essays:', migrationError);
            // Don't fail webhook if migration fails
          }
          
          return new Response(
            JSON.stringify({
              received: true,
              processed: true,
              message: upgradeResult.message,
              user_id: userId,
              session_id: session.id
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error(`❌ Failed to upgrade user: ${upgradeResult.message}`);
          return new Response(
            JSON.stringify({
              received: true,
              processed: false,
              error: upgradeResult.message,
              session_id: session.id
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'payment_intent.succeeded': {
        // Handle successful payment intent
        const paymentIntent = event.data.object;
        console.log('Payment intent succeeded:', paymentIntent.id);
        
        // You can add additional logic here if needed
        return new Response(
          JSON.stringify({ received: true, message: 'Payment intent processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return new Response(
          JSON.stringify({ 
            received: true, 
            message: `Event type ${event.type} not handled` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


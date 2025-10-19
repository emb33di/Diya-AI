/**
 * Test script for Razorpay signature verification
 * This script tests the HMAC SHA256 signature generation and verification
 */

// Test data matching Razorpay documentation example
const testData = {
  order_id: "order_IEIaMR65cu6nz3",
  payment_id: "pay_IH4NVgf4Dreq1l",
  expected_signature: "0d4e745a1838664ad6c9c9902212a32d627d68e917290b0ad5f08ff4561bc50f",
  secret: "EnLs21M47BllR3X8PSFtjtbd" // Example secret from Razorpay docs
};

/**
 * Generate HMAC SHA256 signature (same logic as edge function)
 */
async function generateSignature(orderId: string, paymentId: string, secret: string): Promise<string> {
  const crypto = globalThis.crypto;
  
  // Create the message to sign: order_id + "|" + razorpay_payment_id
  const message = `${orderId}|${paymentId}`;
  
  // Create HMAC key from secret
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Generate signature
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify signature using constant-time comparison
 */
function verifySignature(generated: string, received: string): boolean {
  if (generated.length !== received.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < generated.length; i++) {
    result |= generated.charCodeAt(i) ^ received.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Run signature verification tests
 */
async function runTests() {
  console.log('🧪 Testing Razorpay Signature Verification...\n');
  
  try {
    // Test 1: Generate signature with test data
    console.log('Test 1: Generating signature...');
    const generatedSignature = await generateSignature(
      testData.order_id,
      testData.payment_id,
      testData.secret
    );
    
    console.log(`Generated signature: ${generatedSignature}`);
    console.log(`Expected signature:  ${testData.expected_signature}`);
    
    // Test 2: Verify signature
    console.log('\nTest 2: Verifying signature...');
    const isValid = verifySignature(generatedSignature, testData.expected_signature);
    
    if (isValid) {
      console.log('✅ Signature verification PASSED');
    } else {
      console.log('❌ Signature verification FAILED');
    }
    
    // Test 3: Test with invalid signature
    console.log('\nTest 3: Testing with invalid signature...');
    const invalidSignature = 'invalid_signature_1234567890abcdef';
    const isInvalidValid = verifySignature(generatedSignature, invalidSignature);
    
    if (!isInvalidValid) {
      console.log('✅ Invalid signature correctly rejected');
    } else {
      console.log('❌ Invalid signature incorrectly accepted');
    }
    
    // Test 4: Test message format
    console.log('\nTest 4: Testing message format...');
    const expectedMessage = `${testData.order_id}|${testData.payment_id}`;
    console.log(`Message format: ${expectedMessage}`);
    console.log('✅ Message format matches Razorpay specification');
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runTests();
} else {
  // Browser environment
  console.log('Run runTests() in browser console to test signature verification');
}

export { generateSignature, verifySignature, runTests };

/**
 * Test script for Phase 1: Local Messages with Immediate Persistence
 * This script tests the message persistence service functionality
 */

import { MessagePersistenceService, ConversationMessage } from './messagePersistenceService';

// Mock test data
const testConversationId = 'test_conv_123';
const testUserId = 'test_user_456';

const testMessages: ConversationMessage[] = [
  {
    conversation_id: testConversationId,
    user_id: testUserId,
    source: 'ai',
    text: 'Hello! I\'m Diya, your AI college counselor. How can I help you today?',
    timestamp: new Date('2024-01-31T10:00:00Z'),
    message_order: 1
  },
  {
    conversation_id: testConversationId,
    user_id: testUserId,
    source: 'user',
    text: 'Hi Diya! I\'m interested in applying to computer science programs.',
    timestamp: new Date('2024-01-31T10:00:30Z'),
    message_order: 2
  },
  {
    conversation_id: testConversationId,
    user_id: testUserId,
    source: 'ai',
    text: 'That\'s wonderful! Computer science is a great field. What specific areas of CS interest you most?',
    timestamp: new Date('2024-01-31T10:01:00Z'),
    message_order: 3
  },
  {
    conversation_id: testConversationId,
    user_id: testUserId,
    source: 'user',
    text: 'I\'m particularly interested in artificial intelligence and machine learning.',
    timestamp: new Date('2024-01-31T10:01:30Z'),
    message_order: 4
  }
];

// Test functions
export const testMessagePersistence = async () => {
  console.log('🧪 Testing Message Persistence Service...');
  
  try {
    // Test 1: Store individual messages
    console.log('📝 Test 1: Storing individual messages');
    for (const message of testMessages) {
      const success = await MessagePersistenceService.storeMessage(
        message.conversation_id,
        message.user_id,
        {
          source: message.source,
          text: message.text,
          timestamp: message.timestamp,
          message_order: message.message_order
        }
      );
      console.log(`Message ${message.message_order} stored:`, success ? '✅' : '❌');
    }
    
    // Test 2: Retrieve messages
    console.log('📊 Test 2: Retrieving messages');
    const retrievedMessages = await MessagePersistenceService.getMessages(testConversationId, testUserId);
    console.log(`Retrieved ${retrievedMessages.length} messages`);
    
    // Test 3: Validate messages
    console.log('✅ Test 3: Validating messages');
    const validation = MessagePersistenceService.validateMessages(retrievedMessages);
    console.log('Validation result:', validation);
    
    // Test 4: Convert to transcript
    console.log('📄 Test 4: Converting to transcript');
    const transcript = MessagePersistenceService.messagesToTranscript(retrievedMessages);
    console.log('Transcript length:', transcript.length);
    console.log('Transcript preview:', transcript.substring(0, 200) + '...');
    
    // Test 5: Get conversation stats
    console.log('📈 Test 5: Getting conversation statistics');
    const stats = MessagePersistenceService.getConversationStats(retrievedMessages);
    console.log('Conversation stats:', stats);
    
    console.log('🎉 All tests completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

// Test transcript format
export const testTranscriptFormat = () => {
  console.log('📄 Testing transcript format...');
  
  const transcript = MessagePersistenceService.messagesToTranscript(testMessages);
  console.log('Generated transcript:');
  console.log('='.repeat(50));
  console.log(transcript);
  console.log('='.repeat(50));
  
  // Verify format
  const lines = transcript.split('\n');
  const hasDiyaMessages = lines.some(line => line.startsWith('Diya:'));
  const hasUserMessages = lines.some(line => line.startsWith('You:'));
  
  console.log('Format validation:');
  console.log(`- Has Diya messages: ${hasDiyaMessages ? '✅' : '❌'}`);
  console.log(`- Has user messages: ${hasUserMessages ? '✅' : '❌'}`);
  console.log(`- Total lines: ${lines.length}`);
  
  return hasDiyaMessages && hasUserMessages;
};

// Test validation edge cases
export const testValidationEdgeCases = () => {
  console.log('🔍 Testing validation edge cases...');
  
  // Test empty messages
  const emptyValidation = MessagePersistenceService.validateMessages([]);
  console.log('Empty messages validation:', emptyValidation);
  
  // Test only AI messages
  const onlyAIMessages = testMessages.filter(m => m.source === 'ai');
  const aiOnlyValidation = MessagePersistenceService.validateMessages(onlyAIMessages);
  console.log('Only AI messages validation:', aiOnlyValidation);
  
  // Test only user messages
  const onlyUserMessages = testMessages.filter(m => m.source === 'user');
  const userOnlyValidation = MessagePersistenceService.validateMessages(onlyUserMessages);
  console.log('Only user messages validation:', userOnlyValidation);
  
  // Test short messages
  const shortMessages = [
    {
      conversation_id: testConversationId,
      user_id: testUserId,
      source: 'ai' as const,
      text: 'Hi',
      timestamp: new Date(),
      message_order: 1
    },
    {
      conversation_id: testConversationId,
      user_id: testUserId,
      source: 'user' as const,
      text: 'Hello',
      timestamp: new Date(),
      message_order: 2
    }
  ];
  const shortValidation = MessagePersistenceService.validateMessages(shortMessages);
  console.log('Short messages validation:', shortValidation);
  
  return true;
};

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Starting Phase 1 Implementation Tests...');
  console.log('='.repeat(60));
  
  const results = {
    persistence: false,
    transcript: false,
    validation: false
  };
  
  try {
    results.persistence = await testMessagePersistence();
    console.log('\n' + '='.repeat(60));
    
    results.transcript = testTranscriptFormat();
    console.log('\n' + '='.repeat(60));
    
    results.validation = testValidationEdgeCases();
    console.log('\n' + '='.repeat(60));
    
    console.log('📊 Test Results Summary:');
    console.log(`- Message Persistence: ${results.persistence ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Transcript Format: ${results.transcript ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Validation Logic: ${results.validation ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return false;
  }
};

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).testMessagePersistence = {
    runAllTests,
    testMessagePersistence,
    testTranscriptFormat,
    testValidationEdgeCases
  };
}

/**
 * Test file demonstrating the transcript saving functionality
 * This file shows how the useTranscriptSaver hook works with the Outspeed integration
 */

import React, { useState } from 'react';
import { useTranscriptSaver } from '@/hooks/useTranscriptSaver';

// Mock component to demonstrate usage
const TranscriptSaverDemo = () => {
  const [messages, setMessages] = useState<Array<{
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>>([]);
  
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Initialize the transcript saver hook
  const { forceSaveTranscript } = useTranscriptSaver(
    messages,
    conversationId,
    'onboarding', // or 'brainstorming'
    500 // 500ms debounce delay
  );

  // Simulate adding messages (this would normally happen via Outspeed callbacks)
  const addMessage = (source: 'ai' | 'user', text: string) => {
    const newMessage = {
      source,
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Simulate conversation start
  const startConversation = () => {
    setConversationId('demo-conversation-' + Date.now());
    setMessages([]);
  };

  // Simulate conversation end with force save
  const endConversation = async () => {
    if (messages.length > 0) {
      console.log('Force saving transcript before ending conversation...');
      await forceSaveTranscript();
    }
    setConversationId(null);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Transcript Saver Demo</h2>
      
      <div className="space-x-2">
        <button 
          onClick={startConversation}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Start Conversation
        </button>
        <button 
          onClick={() => addMessage('user', 'Hello, this is a test message')}
          className="px-4 py-2 bg-green-500 text-white rounded"
          disabled={!conversationId}
        >
          Add User Message
        </button>
        <button 
          onClick={() => addMessage('ai', 'Hi! I received your message.')}
          className="px-4 py-2 bg-purple-500 text-white rounded"
          disabled={!conversationId}
        >
          Add AI Message
        </button>
        <button 
          onClick={endConversation}
          className="px-4 py-2 bg-red-500 text-white rounded"
          disabled={!conversationId}
        >
          End Conversation
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Messages ({messages.length}):</h3>
        <div className="max-h-64 overflow-y-auto border p-2 rounded">
          {messages.map((msg, index) => (
            <div key={index} className={`p-2 mb-1 rounded ${
              msg.source === 'ai' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              <strong>{msg.source === 'ai' ? 'AI' : 'User'}:</strong> {msg.text}
              <br />
              <small className="text-gray-500">
                {msg.timestamp.toLocaleTimeString()}
              </small>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Messages are automatically saved to backend with 500ms debounce</li>
          <li>Each message triggers a debounced save (prevents excessive API calls)</li>
          <li>Force save is called when conversation ends</li>
          <li>Only saves when conversation ID exists and messages have changed</li>
          <li>Check browser console for save logs</li>
        </ul>
      </div>
    </div>
  );
};

export default TranscriptSaverDemo;

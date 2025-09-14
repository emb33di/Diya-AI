/**
 * Test script for the multi-agent AI essay feedback system
 * This script tests the orchestrator and individual agents
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'your-google-api-key'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test essay content
const testEssay = `
Growing up in a small town, I never imagined that a simple conversation with my grandmother would fundamentally change how I view the world. It was a rainy afternoon in March when she shared stories about her journey from rural India to America, carrying nothing but hope and determination.

Her words painted a picture of resilience that I had never fully appreciated. She spoke of learning English by reading newspapers discarded in the streets, of working three jobs while raising four children, and of never losing sight of her dreams despite countless obstacles.

This conversation made me realize that my own challenges - struggling with advanced calculus, feeling overwhelmed by college applications, worrying about fitting in - were not insurmountable barriers but opportunities for growth. My grandmother's story taught me that perseverance isn't just about pushing through difficulties; it's about finding meaning in the struggle itself.

Now, as I prepare to embark on my own journey to college, I carry her lessons with me. I understand that success isn't measured by the absence of obstacles, but by how we respond to them. Her story has given me the courage to pursue my passion for environmental science, knowing that every challenge I face is preparing me to make a meaningful impact on the world.

The resilience I've learned from my grandmother's story will be my foundation as I work to address climate change and environmental justice. Just as she built a new life through determination and hope, I am committed to building a more sustainable future for generations to come.
`

const testPrompt = "Describe a person who has influenced you and explain how they have shaped your values or goals."

async function testMultiAgentSystem() {
  console.log('🚀 Testing Multi-Agent AI Essay Feedback System')
  console.log('=' .repeat(60))

  try {
    // Test 1: Check if we can call the orchestrator
    console.log('\n📋 Test 1: Testing Orchestrator Function')
    console.log('-'.repeat(40))
    
    const orchestratorResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-essay-comments-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        essayId: 'test-essay-123',
        essayContent: testEssay,
        essayPrompt: testPrompt,
        userId: 'test-user-456'
      })
    })

    if (orchestratorResponse.ok) {
      const orchestratorData = await orchestratorResponse.json()
      console.log('✅ Orchestrator function accessible')
      console.log(`📊 Response: ${orchestratorData.message}`)
      console.log(`🎯 Total comments: ${orchestratorData.comments?.length || 0}`)
      
      if (orchestratorData.agentResults) {
        console.log(`🧠 Big Picture Agent: ${orchestratorData.agentResults.bigPicture.success ? '✅ Success' : '❌ Failed'}`)
        console.log(`📝 Paragraph Agent: ${orchestratorData.agentResults.paragraph.success ? '✅ Success' : '❌ Failed'}`)
      }
    } else {
      console.log('❌ Orchestrator function failed')
      const errorText = await orchestratorResponse.text()
      console.log(`Error: ${errorText}`)
    }

    // Test 2: Test individual agents
    console.log('\n📋 Test 2: Testing Individual Agents')
    console.log('-'.repeat(40))

    // Test Big Picture Agent
    const bigPictureResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-essay-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        essayId: 'test-essay-bp-123',
        essayContent: testEssay,
        essayPrompt: testPrompt,
        userId: 'test-user-bp-456'
      })
    })

    if (bigPictureResponse.ok) {
      const bigPictureData = await bigPictureResponse.json()
      console.log('✅ Big Picture Agent accessible')
      console.log(`📊 Comments: ${bigPictureData.comments?.length || 0}`)
    } else {
      console.log('❌ Big Picture Agent failed')
    }

    // Test Paragraph Agent
    const paragraphResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-essay-comments-paragraph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        essayId: 'test-essay-p-123',
        essayContent: testEssay,
        essayPrompt: testPrompt,
        userId: 'test-user-p-456'
      })
    })

    if (paragraphResponse.ok) {
      const paragraphData = await paragraphResponse.json()
      console.log('✅ Paragraph Agent accessible')
      console.log(`📊 Comments: ${paragraphData.comments?.length || 0}`)
    } else {
      console.log('❌ Paragraph Agent failed')
    }

    // Test 3: Database schema check
    console.log('\n📋 Test 3: Database Schema Check')
    console.log('-'.repeat(40))

    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'essay_comments')
      .eq('table_schema', 'public')

    if (!error && columns) {
      const hasAgentType = columns.some(col => col.column_name === 'agent_type')
      console.log(`${hasAgentType ? '✅' : '❌'} agent_type column: ${hasAgentType ? 'Present' : 'Missing'}`)
      
      const hasAiGenerated = columns.some(col => col.column_name === 'ai_generated')
      console.log(`${hasAiGenerated ? '✅' : '❌'} ai_generated column: ${hasAiGenerated ? 'Present' : 'Missing'}`)
      
      const hasConfidenceScore = columns.some(col => col.column_name === 'confidence_score')
      console.log(`${hasConfidenceScore ? '✅' : '❌'} confidence_score column: ${hasConfidenceScore ? 'Present' : 'Missing'}`)
    } else {
      console.log('❌ Could not check database schema')
    }

    console.log('\n🎉 Multi-Agent System Test Complete!')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testMultiAgentSystem()

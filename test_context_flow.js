// Test script to verify context flow
console.log('🧪 Testing Context Flow to ElevenLabs');

// Simulate the context generation process
const testContextFlow = () => {
  // Simulate previous context data
  const previousContext = [
    {
      session: 'onboarding_1',
      transcript: 'Student: Hi, I\'m Sarah and I want to study computer science. Agent: Great! What\'s your GPA? Student: 3.8 GPA and 1450 SAT.',
      summary: 'Sarah wants to study computer science, has 3.8 GPA and 1450 SAT'
    }
  ];

  // Simulate the context summary generation
  const contextSummary = previousContext
    .map((ctx) => {
      const content = ctx.summary || ctx.transcript || '';
      return `${ctx.session}: ${content}`;
    })
    .filter(ctx => {
      const parts = ctx.split(': ');
      return parts.length > 1 && parts[1].trim() !== '';
    })
    .join('\n\n');

  // Simulate dynamic variables
  const dynamicVariables = {
    student_name: 'Sarah',
    previous_sessions: contextSummary,
    session_count: previousContext.length
  };

  console.log('📋 Generated Context:');
  console.log(contextSummary);
  console.log('\n📊 Dynamic Variables:');
  console.log(JSON.stringify(dynamicVariables, null, 2));

  // Test what ElevenLabs would receive
  console.log('\n🎯 What ElevenLabs Agent Would See:');
  console.log(`Student name: ${dynamicVariables.student_name}`);
  console.log(`Session count: ${dynamicVariables.session_count}`);
  console.log(`Previous sessions: ${dynamicVariables.previous_sessions}`);
};

testContextFlow(); 
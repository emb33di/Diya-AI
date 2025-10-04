import { loadPromptTemplate, processPromptTemplate } from '../utils/promptLoader';
import { ApplyingToType } from '../utils/userProfileUtils';

/**
 * Test function to verify the conditional prompt system works correctly
 * This can be called from the browser console or used in development
 */
export async function testConditionalPrompts() {
  console.log('Testing conditional prompt system...');
  
  const testCases: ApplyingToType[] = ['undergraduate', 'mba', 'llm', 'phd', 'masters'];
  
  for (const applyingTo of testCases) {
    try {
      console.log(`\n--- Testing ${applyingTo} prompt ---`);
      
      // Load the prompt template
      const template = await loadPromptTemplate(applyingTo);
      console.log(`Template loaded successfully for ${applyingTo}`);
      
      // Process the template with a test student name
      const processedPrompt = processPromptTemplate(template, 'Test Student');
      console.log(`Template processed successfully for ${applyingTo}`);
      
      // Check if the template contains application-specific content
      if (applyingTo === 'MBA' && processedPrompt.includes('MBA')) {
        console.log('✅ MBA-specific content found');
      } else if (applyingTo === 'Undergraduate' && processedPrompt.includes('undergraduate')) {
        console.log('✅ Undergraduate-specific content found');
      } else if (applyingTo === 'PhD' && processedPrompt.includes('PhD')) {
        console.log('✅ PhD-specific content found');
      } else if (applyingTo === 'LLM' && processedPrompt.includes('LLM')) {
        console.log('✅ LLM-specific content found');
      } else if (applyingTo === 'Masters' && processedPrompt.includes('Masters')) {
        console.log('✅ Masters-specific content found');
      } else {
        console.log('⚠️ Application-specific content not clearly identified');
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${applyingTo} prompt:`, error);
    }
  }
  
  // Test with null/undefined applying_to
  try {
    console.log('\n--- Testing fallback prompt ---');
    const fallbackTemplate = await loadPromptTemplate(null);
    console.log('✅ Fallback template loaded successfully');
  } catch (error) {
    console.error('❌ Error testing fallback prompt:', error);
  }
  
  console.log('\n🎉 Conditional prompt testing completed!');
}

// Make the test function available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).testConditionalPrompts = testConditionalPrompts;
}

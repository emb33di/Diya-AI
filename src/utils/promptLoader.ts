import { ApplyingToType } from '@/utils/userProfileUtils';

/**
 * Load the appropriate prompt template based on the user's application type
 * @param applyingTo - The user's application type
 * @returns The prompt template string
 */
export async function loadPromptTemplate(applyingTo: ApplyingToType | null): Promise<string> {
  try {
    let promptFile: string;
    
    switch (applyingTo) {
      case 'Undergraduate':
        promptFile = '/src/prompts/outspeed/undergraduate-prompt.txt';
        break;
      case 'MBA':
        promptFile = '/src/prompts/outspeed/mba-prompt.txt';
        break;
      case 'LLM':
        promptFile = '/src/prompts/outspeed/llm-prompt.txt';
        break;
      case 'PhD':
        promptFile = '/src/prompts/outspeed/phd-prompt.txt';
        break;
      case 'Masters':
        promptFile = '/src/prompts/outspeed/masters-prompt.txt';
        break;
      default:
        // Fallback to undergraduate prompt if no specific type is provided
        promptFile = '/src/prompts/outspeed/undergraduate-prompt.txt';
        break;
    }

    const response = await fetch(promptFile);
    if (!response.ok) {
      throw new Error(`Failed to load prompt file: ${promptFile}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error loading prompt template:', error);
    // Return a default prompt if loading fails
    return getDefaultPrompt();
  }
}

/**
 * Get the default prompt template as a fallback
 * @returns Default prompt string
 */
function getDefaultPrompt(): string {
  return `You are Diya, an AI college counselor specializing in helping international students with their US college applications. You're having a conversation with {studentName} to understand their academic background, interests, goals, and preferences.

Your role is to:
1. Ask thoughtful questions about their academic interests, extracurricular activities, and career goals
2. Help them identify their strengths and unique qualities
3. Understand their preferences for college size, location, programs, and culture
4. Provide guidance on the college application process, including visa requirements and cultural adaptation
5. Be encouraging, supportive, and professional
6. Address concerns specific to international students (language barriers, cultural differences, etc.)

Keep the conversation natural and engaging. Ask follow-up questions to get deeper insights. This conversation will help generate personalized school recommendations.`;
}

/**
 * Replace placeholders in the prompt template with actual values
 * @param template - The prompt template string
 * @param studentName - The student's name
 * @returns The processed prompt string
 */
export function processPromptTemplate(template: string, studentName?: string): string {
  return template.replace(/{studentName}/g, studentName || 'a student');
}

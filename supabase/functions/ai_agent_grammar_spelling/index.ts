import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface GrammarSpellingAgentRequest {
  essayContent: string;
  essayPrompt?: string;
  blockId?: string;
  blockIndex?: number;
  totalBlocks?: number;
}

interface GrammarSpellingComment {
  comment_text: string;
  comment_nature: 'weakness';
  comment_category: 'inline';
  agent_type: 'grammar_spelling';
  text_selection: {
    start: { pos: number; path: number[] };
    end: { pos: number; path: number[] };
  };
  confidence_score: number;
  // NEW FIELDS FOR EDIT ACTIONS
  original_text?: string;
  suggested_replacement?: string;
  anchor_text?: string;
  // Debug field for validation
  _hasValidEditFields?: boolean;
}

interface GrammarSpellingAgentResponse {
  success: boolean;
  comments: GrammarSpellingComment[];
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Enhanced text matching function to find the best match for original text
 * Handles cases where AI might provide slightly different text than what's in the content
 */
function findBestTextMatch(originalText: string, content: string): string | null {
  if (!originalText || !content) return null;
  
  // Direct match (most common case)
  if (content.includes(originalText)) {
    return originalText;
  }
  
  // Try case-insensitive match
  const lowerOriginal = originalText.toLowerCase();
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes(lowerOriginal)) {
    // Find the actual case version in the content
    const startIndex = lowerContent.indexOf(lowerOriginal);
    const endIndex = startIndex + originalText.length;
    return content.substring(startIndex, endIndex);
  }
  
  // Try removing extra whitespace
  const normalizedOriginal = originalText.replace(/\s+/g, ' ').trim();
  const normalizedContent = content.replace(/\s+/g, ' ').trim();
  if (normalizedContent.includes(normalizedOriginal)) {
    return normalizedOriginal;
  }
  
  // Try fuzzy matching for common variations
  const variations = [
    originalText.replace(/['"]/g, ''), // Remove quotes
    originalText.replace(/[.,;:!?]/g, ''), // Remove punctuation
    originalText.replace(/\s+/g, ''), // Remove all spaces
  ];
  
  for (const variation of variations) {
    if (content.includes(variation)) {
      return variation;
    }
  }
  
  return null;
}

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Grammar and Spelling Analysis Prompt
const GRAMMAR_SPELLING_PROMPT = `You are an expert grammar and spelling checker specializing in mechanical errors in college application essays. Your role is to identify and suggest corrections for grammar, punctuation, and spelling mistakes.

ESSAY PROMPT:
{prompt}

BLOCK CONTENT:
{content}

{blockContext}

CRITICAL GUIDANCE:
- Focus ONLY on mechanical errors: grammar, punctuation, and spelling
- Do NOT comment on style, content, structure, or word choice
- Do NOT suggest stylistic changes or content improvements
- Be direct and specific about the error and correction
- Identify actual mistakes, not preferences
- Focus on errors that would be marked wrong in a grammar test
- Be concise and clear in your corrections

ANALYSIS AREAS:
- Subject-verb agreement errors
- Pronoun agreement and reference issues
- Verb tense inconsistencies
- Comma splices and run-on sentences
- Missing or incorrect punctuation
- Spelling mistakes and typos
- Apostrophe errors
- Capitalization mistakes
- Sentence fragments
- Double negatives

NEEDED vs NICE-TO-HAVE CRITERIA:
- NEEDED: Errors that significantly impact clarity, meaning, or correctness
- NEEDED: Errors that would be marked wrong in formal writing/grammar tests
- NEEDED: Errors that could confuse readers or change meaning
- NICE-TO-HAVE: Minor stylistic preferences, optional punctuation, informal vs formal tone
- NICE-TO-HAVE: Regional spelling differences (e.g., "color" vs "colour")
- NICE-TO-HAVE: Optional comma usage that doesn't affect meaning

INSTRUCTIONS:
Generate comments ONLY for NEEDED mechanical errors. Do not generate comments for nice-to-have suggestions. If no significant errors exist, return an empty comments array. Each comment should identify a specific error and provide the correction.

CRITICAL REQUIREMENTS FOR EDIT ACTIONS:
- For each error, provide the exact text that needs to be fixed (original_text)
- Provide the corrected version (suggested_replacement)
- original_text must be EXACTLY as it appears in the essay (character-for-character match)
- suggested_replacement must be the corrected version
- Be precise with text matching - copy text exactly as written, including punctuation
- Focus on clear, obvious errors that have definitive corrections
- Ensure original_text exists in the essay content before suggesting replacement
- Use anchor_text to highlight the specific problematic text in the UI

IMPORTANT: For each comment, you MUST:
1. Quote the exact text containing the error in your comment_text
2. Provide accurate text_selection positions for the specific text with the error
3. Be specific about what needs to be changed
4. Include original_text (exact text with error)
5. Include suggested_replacement (corrected version)
6. Include anchor_text (text to highlight in UI)

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment_text": "Fix subject-verb disagreement: 'team' is singular",
      "comment_nature": "weakness",
      "comment_category": "inline",
      "agent_type": "grammar_spelling",
      "anchor_text": "The team are working hard",
      "original_text": "The team are working hard",
      "suggested_replacement": "The team is working hard",
      "text_selection": {
        "start": { "pos": 150, "path": [0] },
        "end": { "pos": 175, "path": [0] }
      },
      "confidence_score": 0.95
    },
    {
      "comment_text": "Fix apostrophe: 'its' should be 'it's' (contraction for 'it is')",
      "comment_nature": "weakness", 
      "comment_category": "inline",
      "agent_type": "grammar_spelling",
      "anchor_text": "its important to",
      "original_text": "its important to",
      "suggested_replacement": "it's important to",
      "text_selection": {
        "start": { "pos": 200, "path": [0] },
        "end": { "pos": 220, "path": [0] }
      },
      "confidence_score": 0.98
    }
  ]
}

Remember: Focus ONLY on NEEDED mechanical errors - grammar, punctuation, and spelling. Do NOT address style, content, structure, or word choice. Do NOT generate comments for nice-to-have suggestions.`

async function analyzeGrammarSpelling(
  essayContent: string, 
  essayPrompt?: string, 
  blockId?: string, 
  blockIndex?: number, 
  totalBlocks?: number
): Promise<GrammarSpellingAgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  // Create block context if this is a block-specific analysis
  const blockContext = blockId && blockIndex !== undefined && totalBlocks !== undefined
    ? `\nBLOCK CONTEXT:\nThis is block ${blockIndex + 1} of ${totalBlocks} blocks in the essay. Focus on mechanical errors within this specific block only.`
    : '';

  const formattedPrompt = GRAMMAR_SPELLING_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)
    .replace('{blockContext}', blockContext)

  const requestBody = {
    contents: [{
      parts: [{
        text: formattedPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent grammar checking
      topK: 40,
      topP: 0.95,
        maxOutputTokens: 4096, // Increased to allow for more comments
    }
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Safely extract text from candidates without assuming parts[0]
    const parts = data?.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error('Invalid response from Gemini API: missing content parts')
    }
    
    const responseText = parts
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join('\n')
      .trim()
    
    if (!responseText) {
      throw new Error('Invalid response from Gemini API: empty content text')
    }
    console.log(`Grammar & Spelling Agent Response:`, responseText)
    
    // Extract JSON from response with improved error handling
    let parsedResponse: any
    try {
      // First try to find JSON object boundaries more precisely
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error(`No valid JSON boundaries found in grammar & spelling agent response:`, responseText)
        throw new Error('No valid JSON boundaries found in AI response')
      }
      
      const jsonString = responseText.substring(jsonStart, jsonEnd + 1)
      console.log(`Extracted JSON string:`, jsonString)
      
      // Try to parse the extracted JSON
      parsedResponse = JSON.parse(jsonString)
      console.log(`Parsed grammar & spelling response:`, JSON.stringify(parsedResponse, null, 2))
      
    } catch (parseError) {
      console.error(`JSON parsing error in grammar & spelling agent:`, parseError.message)
      console.error(`Response text that failed to parse:`, responseText)
      
      // Try alternative extraction methods
      try {
        // Try to find JSON array pattern
        const arrayMatch = responseText.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          const arrayString = arrayMatch[0]
          const parsedArray = JSON.parse(arrayString)
          parsedResponse = { comments: parsedArray }
          console.log(`Successfully parsed as array:`, JSON.stringify(parsedResponse, null, 2))
        } else {
          // Try to clean up common JSON issues
          const cleanedResponse = responseText
            .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
          
          console.log(`Attempting to parse cleaned response:`, cleanedResponse)
          
          // Try to find and parse cleaned JSON
          const cleanedJsonStart = cleanedResponse.indexOf('{')
          const cleanedJsonEnd = cleanedResponse.lastIndexOf('}')
          
          if (cleanedJsonStart !== -1 && cleanedJsonEnd !== -1 && cleanedJsonEnd > cleanedJsonStart) {
            const cleanedJsonString = cleanedResponse.substring(cleanedJsonStart, cleanedJsonEnd + 1)
            parsedResponse = JSON.parse(cleanedJsonString)
            console.log(`Successfully parsed cleaned JSON:`, JSON.stringify(parsedResponse, null, 2))
          } else {
            throw new Error('No valid JSON structure found after cleaning')
          }
        }
      } catch (arrayError) {
        console.error(`All parsing attempts failed:`, arrayError.message)
        console.error(`Original response text:`, responseText)
        throw new Error(`Failed to parse JSON from grammar & spelling agent response: ${parseError.message}. Additional error: ${arrayError.message}`)
      }
    }
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate and format comments with enhanced error handling
    const comments: GrammarSpellingComment[] = parsedResponse.comments
      .filter((comment: any) => {
        // Pre-filter comments to ensure they have required fields
        const hasRequiredFields = comment.comment_text && 
                                 (comment.original_text || comment.anchor_text);
        
        if (!hasRequiredFields) {
          console.warn(`Grammar agent: Skipping comment with missing required fields:`, comment);
        }
        
        return hasRequiredFields;
      })
      .map((comment: any) => {
      // Validate confidence score
      const confidenceScore = typeof comment.confidence_score === 'number' 
        ? Math.max(0, Math.min(1, comment.confidence_score))
        : 0.85;

      // Validate text selection
      const textSelection = comment.text_selection && 
        comment.text_selection.start && 
        comment.text_selection.end &&
        typeof comment.text_selection.start.pos === 'number' && 
        typeof comment.text_selection.end.pos === 'number'
        ? {
            start: { 
              pos: Math.max(0, comment.text_selection.start.pos),
              path: comment.text_selection.start.path || [0]
            },
            end: { 
              pos: Math.min(essayContent.length, comment.text_selection.end.pos),
              path: comment.text_selection.end.path || [0]
            }
          }
        : { 
            start: { pos: 0, path: [0] }, 
            end: { pos: 0, path: [0] } 
          };

      // Validate and process edit action fields with enhanced validation
      const rawOriginalText = comment.original_text || comment.anchor_text;
      const suggestedReplacement = comment.suggested_replacement;
      const anchorText = comment.anchor_text || rawOriginalText;

      // Use enhanced text matching to find the best match
      const originalText = rawOriginalText ? findBestTextMatch(rawOriginalText, essayContent) : null;

      // Enhanced validation for edit action fields
      const hasValidEditFields = originalText && suggestedReplacement && 
                                originalText !== suggestedReplacement &&
                                originalText.length > 0;

      // Log validation results for debugging
      if (!hasValidEditFields && rawOriginalText) {
        console.warn(`Grammar agent: Invalid edit fields for comment "${comment.comment_text}"`);
        console.warn(`- raw original_text: "${rawOriginalText}"`);
        console.warn(`- matched original_text: "${originalText}"`);
        console.warn(`- suggested_replacement: "${suggestedReplacement}"`);
        console.warn(`- text exists in content: ${essayContent.includes(rawOriginalText)}`);
      }

      return {
        comment_text: comment.comment_text || 'No comment text provided',
        comment_nature: 'weakness',
        comment_category: 'inline',
        agent_type: 'grammar_spelling',
        text_selection: textSelection,
        confidence_score: confidenceScore,
        // ENHANCED EDIT ACTION FIELDS WITH VALIDATION
        original_text: hasValidEditFields ? originalText : undefined,
        suggested_replacement: hasValidEditFields ? suggestedReplacement : undefined,
        anchor_text: anchorText || originalText || rawOriginalText,
        // Add validation flag for debugging
        _hasValidEditFields: hasValidEditFields
      };
    });

    // Log summary of validation results
    const validEditComments = comments.filter(c => c._hasValidEditFields);
    const invalidEditComments = comments.filter(c => !c._hasValidEditFields);
    
    console.log(`Grammar agent: Processed ${comments.length} comments`);
    console.log(`- ${validEditComments.length} comments with valid edit fields`);
    console.log(`- ${invalidEditComments.length} comments with invalid edit fields`);
    
    if (invalidEditComments.length > 0) {
      console.warn(`Grammar agent: Comments with invalid edit fields:`, 
        invalidEditComments.map(c => ({
          comment: c.comment_text,
          original: c.original_text,
          suggested: c.suggested_replacement
        }))
      );
    }

    return {
      success: true,
      comments: comments.map(c => {
        // Remove debug field before returning
        const { _hasValidEditFields, ...cleanComment } = c;
        return cleanComment;
      })
    }

  } catch (error) {
    console.error(`Error in grammar & spelling agent:`, error)
    return {
      success: false,
      comments: [],
      error: `Failed to analyze grammar and spelling: ${error.message}`
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { essayContent, essayPrompt, blockId, blockIndex, totalBlocks }: GrammarSpellingAgentRequest = await req.json()

    // Validate required fields
    if (!essayContent) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required field: essayContent',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate essay content length
    if (essayContent.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Essay content too short for meaningful grammar and spelling analysis',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Analyzing grammar and spelling for essay content (${essayContent.length} characters)`)
    if (blockId && blockIndex !== undefined && totalBlocks !== undefined) {
      console.log(`Block-specific analysis for block ${blockIndex + 1} of ${totalBlocks}`)
    }
    
    // Analyze grammar and spelling
    const result = await analyzeGrammarSpelling(essayContent, essayPrompt, blockId, blockIndex, totalBlocks)
    
    const response: GrammarSpellingAgentResponse = {
      success: result.success,
      comments: result.comments,
      error: result.error
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in grammar & spelling agent:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        comments: [],
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { TextPosition, MatchStrategy } from '@/types/contextualAnchoring';

// Types for comment data
export interface Comment {
  id: string;
  text: string;
  type: 'suggestion' | 'critique' | 'praise' | 'question';
  aiGenerated: boolean;
  resolved: boolean;
  anchorText: string;
  paragraphId?: string; // NEW: For contextual anchoring
  textSelection: {
    start: { pos: number; path: number[] };
    end: { pos: number; path: number[] };
  };
  hovered?: boolean;
  selected?: boolean;
}

export interface CommentStorage {
  comments: Comment[];
  selectedText: string | null;
  selectionRange: { from: number; to: number } | null;
  addComment: (comment: Omit<Comment, 'id'>) => void;
  removeComment: (id: string) => void;
  resolveComment: (id: string) => void;
  setSelectedText: (text: string, range: { from: number; to: number }) => void;
  clearSelection: () => void;
  setCommentSelection: (commentId: string | null) => void;
}

// Plugin key for the comment extension
const commentPluginKey = new PluginKey('comment');

// Debug utility function to help troubleshoot text matching issues
export function debugTextMatching(doc: ProseMirrorNode, anchorText: string): void {
  console.group(`🔍 Debug Text Matching for: "${anchorText}"`);
  
  const docText = doc.textContent;
  console.log(`Document length: ${docText.length}`);
  console.log(`Document preview: "${docText.substring(0, 200)}..."`);
  
  const cleanAnchorText = anchorText.trim().replace(/\s+/g, ' ');
  console.log(`Clean anchor text: "${cleanAnchorText}"`);
  
  // Test all matching strategies
  console.log('\n📋 Testing matching strategies:');
  
  // Strategy 1: Exact match
  const exactMatch = findExactMatch(docText, cleanAnchorText);
  console.log(`1. Exact match: ${exactMatch ? `✅ Found at ${exactMatch.start}-${exactMatch.end}` : '❌ Not found'}`);
  
  // Strategy 2: Case-insensitive match
  const caseInsensitiveMatch = findExactMatch(docText, cleanAnchorText, true);
  console.log(`2. Case-insensitive match: ${caseInsensitiveMatch ? `✅ Found at ${caseInsensitiveMatch.start}-${caseInsensitiveMatch.end}` : '❌ Not found'}`);
  
  // Strategy 3: Fuzzy match
  const fuzzyMatch = findFuzzyMatch(docText, cleanAnchorText);
  console.log(`3. Fuzzy match: ${fuzzyMatch ? `✅ Found at ${fuzzyMatch.start}-${fuzzyMatch.end}` : '❌ Not found'}`);
  
  // Strategy 4: Progressive word match
  const progressiveMatch = findProgressiveWordMatch(docText, cleanAnchorText);
  console.log(`4. Progressive word match: ${progressiveMatch ? `✅ Found at ${progressiveMatch.start}-${progressiveMatch.end}` : '❌ Not found'}`);
  
  // Show word analysis
  const words = cleanAnchorText.split(' ').filter(word => word.length > 2);
  console.log(`\n📝 Word analysis:`);
  console.log(`Words to search: [${words.join(', ')}]`);
  
  words.forEach((word, index) => {
    const wordIndex = docText.indexOf(word);
    const wordIndexCI = docText.toLowerCase().indexOf(word.toLowerCase());
    console.log(`  ${index + 1}. "${word}": exact=${wordIndex}, case-insensitive=${wordIndexCI}`);
  });
  
  console.groupEnd();
}

// NEW: Debug utility for contextual anchoring positioning
export function debugContextualAnchoring(doc: ProseMirrorNode, paragraphId: string, anchorText: string): void {
  console.group(`🎯 Debug Contextual Anchoring: paragraph '${paragraphId}', anchor '${anchorText}'`);
  
  // First, show all available paragraph IDs
  console.log('📋 Available paragraph IDs in document:');
  const availableIds: string[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.attrs['data-paragraph-id']) {
      availableIds.push(node.attrs['data-paragraph-id']);
      console.log(`  - ${node.attrs['data-paragraph-id']} at position ${pos}`);
    }
  });
  
  if (availableIds.length === 0) {
    console.log('❌ No paragraph IDs found in document!');
    console.groupEnd();
    return;
  }
  
  // Find the paragraph
  let targetNode: ProseMirrorNode | null = null;
  let targetPos = -1;
  
  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.attrs['data-paragraph-id'] === paragraphId) {
      targetNode = node;
      targetPos = pos;
      return false;
    }
  });
  
  if (!targetNode || targetPos === -1) {
    console.log(`❌ Paragraph with ID '${paragraphId}' not found`);
    console.log(`Available IDs: [${availableIds.join(', ')}]`);
    console.groupEnd();
    return;
  }
  
  console.log(`✅ Found paragraph at position ${targetPos}`);
  console.log(`Paragraph text: "${targetNode.textContent}"`);
  console.log(`Paragraph attributes:`, targetNode.attrs);
  
  // Check if anchor text exists
  const textContent = targetNode.textContent;
  const startIndex = textContent.indexOf(anchorText);
  
  if (startIndex === -1) {
    console.log(`❌ Anchor text '${anchorText}' not found in paragraph`);
    console.groupEnd();
    return;
  }
  
  console.log(`✅ Anchor text found at index ${startIndex} in paragraph`);
  
  // Show the paragraph structure
  console.log('\n📋 Paragraph structure:');
  targetNode.descendants((node, pos) => {
    if (node.isText) {
      console.log(`  Text node at ${pos}: "${node.textContent}"`);
    } else {
      console.log(`  Node at ${pos}: ${node.type.name}`);
    }
  });
  
  // Calculate positions
  let textPos = 0;
  let foundStartPos = -1;
  
  targetNode.descendants((node, pos) => {
    if (node.isText) {
      const nodeText = node.textContent;
      const textStart = textPos;
      const textEnd = textPos + nodeText.length;
      
      if (startIndex >= textStart && startIndex < textEnd) {
        const offsetInNode = startIndex - textStart;
        foundStartPos = targetPos + 1 + pos + offsetInNode;
        console.log(`  📍 Calculated position: ${foundStartPos} (targetPos: ${targetPos}, nodePos: ${pos}, offset: ${offsetInNode})`);
        return false;
      }
      
      textPos += nodeText.length;
    }
  });
  
  if (foundStartPos === -1) {
    foundStartPos = targetPos + 1 + startIndex;
    console.log(`  📍 Fallback position: ${foundStartPos}`);
  }
  
  const to = foundStartPos + anchorText.length;
  console.log(`  📍 Final positions: ${foundStartPos}-${to}`);
  
  console.groupEnd();
}

// Find text position in document using anchor text with improved matching
// Enhanced string matching with better fallback strategies
function findTextPosition(
  doc: ProseMirrorNode,
  anchorText: string,
  fallbackSelection?: { start: { pos: number }; end: { pos: number } }
): { from: number; to: number } | null {
  try {
    const docText = doc.textContent;
    
    if (!anchorText || anchorText.trim().length === 0) {
      console.warn('Empty anchor text provided');
      return null;
    }
    
    // Clean and normalize the anchor text
    const cleanAnchorText = anchorText.trim().replace(/\s+/g, ' ');
    console.log(`Searching for anchor text: "${cleanAnchorText}" in document of length ${docText.length}`);
    
    // Strategy 1: Exact match (case-sensitive)
    let matchResult = findExactMatch(docText, cleanAnchorText);
    if (matchResult) {
      console.log(`Found exact match at position ${matchResult.start}`);
      return convertToProseMirrorPosition(doc, matchResult.start, matchResult.end);
    }
    
    // Strategy 2: Case-insensitive exact match
    matchResult = findExactMatch(docText, cleanAnchorText, true);
    if (matchResult) {
      console.log(`Found case-insensitive match at position ${matchResult.start}`);
      return convertToProseMirrorPosition(doc, matchResult.start, matchResult.end);
    }
    
    // Strategy 3: HTML-aware matching (handle HTML entities and tags)
    matchResult = findHtmlAwareMatch(docText, cleanAnchorText);
    if (matchResult) {
      console.log(`Found HTML-aware match at position ${matchResult.start}`);
      return convertToProseMirrorPosition(doc, matchResult.start, matchResult.end);
    }
    
    // Strategy 4: Fuzzy matching with punctuation tolerance
    matchResult = findFuzzyMatch(docText, cleanAnchorText);
    if (matchResult) {
      console.log(`Found fuzzy match at position ${matchResult.start}`);
      return convertToProseMirrorPosition(doc, matchResult.start, matchResult.end);
    }
    
    // Strategy 5: Progressive word matching
    matchResult = findProgressiveWordMatch(docText, cleanAnchorText);
    if (matchResult) {
      console.log(`Found progressive word match at position ${matchResult.start}`);
      return convertToProseMirrorPosition(doc, matchResult.start, matchResult.end);
    }
    
    // Strategy 6: Partial word matching for very short texts
    if (cleanAnchorText.length <= 10) {
      matchResult = findPartialWordMatch(docText, cleanAnchorText);
      if (matchResult) {
        console.log(`Found partial word match at position ${matchResult.start}`);
        return convertToProseMirrorPosition(doc, matchResult.start, matchResult.end);
      }
    }
    
    // Strategy 7: Fallback to paragraph-level highlighting
    console.warn(`Could not find specific text match for: "${cleanAnchorText}"`);
    return null;
    
  } catch (error) {
    console.error('Error in findTextPosition:', error);
    return null;
  }
}

// Helper function to find exact matches
function findExactMatch(text: string, searchText: string, caseInsensitive = false): { start: number; end: number } | null {
  const searchIn = caseInsensitive ? text.toLowerCase() : text;
  const searchFor = caseInsensitive ? searchText.toLowerCase() : searchText;
  
  const index = searchIn.indexOf(searchFor);
  if (index !== -1) {
    return { start: index, end: index + searchText.length };
  }
  return null;
}

// Helper function for fuzzy matching with punctuation tolerance
function findFuzzyMatch(text: string, searchText: string): { start: number; end: number } | null {
  // Remove punctuation and normalize whitespace for comparison
  const normalizeText = (str: string) => str.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  
  const normalizedSearch = normalizeText(searchText);
  const normalizedText = normalizeText(text);
  
  const index = normalizedText.indexOf(normalizedSearch);
  if (index !== -1) {
    // Find the corresponding position in the original text
    let originalIndex = 0;
    let normalizedIndex = 0;
    
    while (normalizedIndex < index && originalIndex < text.length) {
      if (text[originalIndex].match(/[\w\s]/)) {
        normalizedIndex++;
      }
      originalIndex++;
    }
    
    // Find the end position
    let endIndex = originalIndex;
    let searchIndex = 0;
    
    while (searchIndex < normalizedSearch.length && endIndex < text.length) {
      if (text[endIndex].match(/[\w\s]/)) {
        searchIndex++;
      }
      endIndex++;
    }
    
    return { start: originalIndex, end: endIndex };
  }
  
  return null;
}

// Helper function for HTML-aware matching
function findHtmlAwareMatch(text: string, searchText: string): { start: number; end: number } | null {
  // Decode HTML entities in the search text
  const decodeHtmlEntities = (str: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };
  
  const decodedSearch = decodeHtmlEntities(searchText);
  
  // Try exact match with decoded text
  const index = text.indexOf(decodedSearch);
  if (index !== -1) {
    return { start: index, end: index + decodedSearch.length };
  }
  
  // Try case-insensitive match
  const lowerIndex = text.toLowerCase().indexOf(decodedSearch.toLowerCase());
  if (lowerIndex !== -1) {
    return { start: lowerIndex, end: lowerIndex + decodedSearch.length };
  }
  
  return null;
}

// Helper function for partial word matching
function findPartialWordMatch(text: string, searchText: string): { start: number; end: number } | null {
  const words = searchText.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;
  
  // For single words, try to find partial matches
  if (words.length === 1) {
    const word = words[0];
    const lowerText = text.toLowerCase();
    const lowerWord = word.toLowerCase();
    
    // Try to find the word as a substring
    const index = lowerText.indexOf(lowerWord);
    if (index !== -1) {
      return { start: index, end: index + word.length };
    }
    
    // Try to find partial matches (at least 3 characters)
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const partial = word.substring(i);
        const partialIndex = lowerText.indexOf(partial.toLowerCase());
        if (partialIndex !== -1) {
          return { start: partialIndex, end: partialIndex + partial.length };
        }
      }
    }
  }
  
  return null;
}

// Helper function for progressive word matching
function findProgressiveWordMatch(text: string, searchText: string): { start: number; end: number } | null {
  const words = searchText.split(' ').filter(word => word.length > 2);
  
  if (words.length === 0) return null;
  
  // Try to find the first significant word
  const firstWord = words[0];
  let startIndex = text.indexOf(firstWord);
  
  if (startIndex === -1) {
    // Try case-insensitive
    startIndex = text.toLowerCase().indexOf(firstWord.toLowerCase());
  }
  
  if (startIndex === -1) return null;
  
  // Try to extend the match with subsequent words
  let endIndex = startIndex + firstWord.length;
  let currentPos = startIndex + firstWord.length;
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const nextWordIndex = text.indexOf(word, currentPos);
    
    if (nextWordIndex === -1) {
      // Try case-insensitive
      const nextWordIndexCI = text.toLowerCase().indexOf(word.toLowerCase(), currentPos);
      if (nextWordIndexCI !== -1 && nextWordIndexCI - currentPos < 50) {
        endIndex = nextWordIndexCI + word.length;
        currentPos = endIndex;
      } else {
        break; // Stop if we can't find the next word reasonably close
      }
    } else if (nextWordIndex - currentPos < 50) {
      endIndex = nextWordIndex + word.length;
      currentPos = endIndex;
    } else {
      break; // Stop if words are too far apart
    }
  }
  
  return { start: startIndex, end: endIndex };
}

// Helper function to convert character positions to ProseMirror positions
function convertToProseMirrorPosition(doc: ProseMirrorNode, startChar: number, endChar: number): { from: number; to: number } | null {
  try {
    // Ensure positions are within bounds
    const docText = doc.textContent;
    const safeStartChar = Math.max(0, Math.min(startChar, docText.length));
    const safeEndChar = Math.max(safeStartChar, Math.min(endChar, docText.length));
    
    // Use ProseMirror's resolve method for accurate positioning
    const from = doc.resolve(safeStartChar).pos;
    const to = doc.resolve(safeEndChar).pos;
    
    return { from, to };
  } catch (error) {
    console.warn(`Failed to convert character positions ${startChar}-${endChar} to ProseMirror positions:`, error);
    return null;
  }
}

// NEW: Contextual Anchoring - Find position by paragraph ID with improved text matching
function findPositionByParagraphId(
  doc: ProseMirrorNode, 
  paragraphId: string, 
  anchorText: string
): TextPosition | null {
  try {
    let targetNode: ProseMirrorNode | null = null;
    let targetPos = -1;

    // 1. Find the paragraph node with the matching data attribute
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs['data-paragraph-id'] === paragraphId) {
        targetNode = node;
        targetPos = pos;
        return false; // Stop searching once found
      }
    });

    if (!targetNode || targetPos === -1) {
      console.warn(`Paragraph with ID '${paragraphId}' not found in document`);
      return null; // Paragraph not found
    }

    // 2. Perform improved text matching within this paragraph
    const textContent = targetNode.textContent;
    const normalizedText = normalizeTextForMatching(textContent);
    const normalizedAnchor = normalizeTextForMatching(anchorText);
    
    let startIndex = -1;
    let matchLength = anchorText.length;
    
    // Try exact match first
    startIndex = textContent.indexOf(anchorText);
    
    if (startIndex === -1) {
      // Try normalized match
      const normalizedIndex = normalizedText.indexOf(normalizedAnchor);
      if (normalizedIndex !== -1) {
        // Convert normalized position back to original text position
        startIndex = convertNormalizedPositionToOriginal(textContent, normalizedIndex);
        matchLength = normalizedAnchor.length;
      }
    }
    
    if (startIndex === -1) {
      // Try fuzzy matching within the paragraph
      const fuzzyMatch = findFuzzyMatchInParagraph(textContent, anchorText);
      if (fuzzyMatch) {
        startIndex = fuzzyMatch.start;
        matchLength = fuzzyMatch.end - fuzzyMatch.start;
      }
    }

    if (startIndex === -1) {
      console.warn(`Anchor text '${anchorText}' not found in paragraph '${paragraphId}'`);
      return null;
    }

    // 3. Calculate the absolute document positions
    const from = targetPos + 1 + startIndex;
    const to = from + matchLength;
    
    console.log(`✅ Contextual anchoring successful: paragraph '${paragraphId}', anchor '${anchorText}', positions ${from}-${to}`);
    return { from, to };
    
  } catch (error) {
    console.error('Error in findPositionByParagraphId:', error);
    return null;
  }
}

// Helper function to normalize text for matching
function normalizeTextForMatching(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim()
    .toLowerCase();
}

// Helper function to convert normalized position back to original text position
function convertNormalizedPositionToOriginal(originalText: string, normalizedIndex: number): number {
  let originalIndex = 0;
  let normalizedCount = 0;
  
  for (let i = 0; i < originalText.length; i++) {
    const char = originalText[i];
    if (char.match(/[\w\s]/)) {
      if (normalizedCount === normalizedIndex) {
        return i;
      }
      normalizedCount++;
    }
    originalIndex++;
  }
  
  return originalIndex;
}

// Helper function for fuzzy matching within a paragraph
function findFuzzyMatchInParagraph(text: string, searchText: string): { start: number; end: number } | null {
  const words = searchText.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;
  
  // Try to find the first word
  const firstWord = words[0];
  let startIndex = text.toLowerCase().indexOf(firstWord.toLowerCase());
  
  if (startIndex === -1) return null;
  
  // Check if subsequent words follow
  let currentPos = startIndex + firstWord.length;
  let allWordsFound = true;
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const nextIndex = text.toLowerCase().indexOf(word.toLowerCase(), currentPos);
    
    if (nextIndex === -1 || nextIndex > currentPos + 50) { // Allow some gap but not too much
      allWordsFound = false;
      break;
    }
    
    currentPos = nextIndex + word.length;
  }
  
  if (allWordsFound) {
    return {
      start: startIndex,
      end: currentPos
    };
  }
  
  return null;
}

// Create decoration for highlighted comments with NEW Contextual Anchoring system
function createCommentDecoration(
  comment: Comment,
  doc: ProseMirrorNode
): Decoration | null {
  try {
    console.log(`Creating decoration for comment ${comment.id} with anchorText: "${comment.anchorText}"`);
    
    let position: TextPosition | null = null;
    let matchStrategy: MatchStrategy = 'none';
    
    // STAGE 1: The New "Contextual Anchoring" Method (Primary)
    if (comment.paragraphId && comment.anchorText) {
      console.log(`🎯 Attempting contextual anchoring for comment ${comment.id}:`);
      console.log(`  - Paragraph ID: ${comment.paragraphId}`);
      console.log(`  - Anchor Text: "${comment.anchorText}"`);
      
      // Debug contextual anchoring
      debugContextualAnchoring(doc, comment.paragraphId, comment.anchorText);
      
      position = findPositionByParagraphId(doc, comment.paragraphId, comment.anchorText);
      if (position) {
        matchStrategy = 'contextual';
        console.log(`✅ Contextual anchoring successful for comment ${comment.id}`);
      } else {
        console.log(`❌ Contextual anchoring failed for comment ${comment.id}`);
        
        // Try content-based paragraph matching as fallback
        if (comment.paragraph_index !== null && comment.paragraph_index !== undefined) {
          console.log(`🔄 Trying content-based paragraph matching for comment ${comment.id}`);
          position = findParagraphByContentMatch(doc, comment.paragraph_index, comment.anchorText);
          if (position) {
            matchStrategy = 'contentMatch';
            console.log(`✅ Content-based paragraph matching successful for comment ${comment.id}`);
          }
        }
      }
    }
    
    // STAGE 2: Fallback to Old System (Secondary)
    // This will now only run if the new system fails or for legacy comments
    if (!position && comment.anchorText) {
      console.warn(`Contextual Anchoring failed for comment ID ${comment.id}. Falling back to global search.`);
      position = findTextPosition(doc, comment.anchorText); // Your old fuzzy/progressive search function
      if (position) {
        matchStrategy = 'anchorText';
        console.log(`✅ Fallback anchorText matching successful for comment ${comment.id}`);
      }
    }
    
    // STAGE 3: Additional fallback strategies
    if (!position && comment.anchorText) {
      // Try to find a reasonable fallback within the paragraph
      if (comment.paragraph_index !== null && comment.paragraph_index !== undefined) {
        console.log(`🔄 Trying paragraph index fallback for comment ${comment.id} (index: ${comment.paragraph_index})`);
        position = findParagraphFallbackPosition(doc, comment.paragraph_index, comment.anchorText);
        if (position) {
          matchStrategy = 'paragraphFallback';
          console.log(`✅ Using paragraph fallback for comment ${comment.id}`);
        } else {
          console.log(`❌ Paragraph fallback also failed for comment ${comment.id}`);
        }
      }
    }
    
    // STAGE 4: Fallback to textSelection if all else fails
    if (!position && comment.textSelection) {
      try {
        const from = doc.resolve(comment.textSelection.start.pos).pos;
        const to = doc.resolve(comment.textSelection.end.pos).pos;
        position = { from, to };
        matchStrategy = 'textSelection';
        console.log(`✅ Using fallback textSelection for comment ${comment.id}`);
      } catch (fallbackError) {
        console.warn('❌ Fallback textSelection also failed:', fallbackError);
      }
    }
    
    if (!position) {
      console.warn(`❌ Could not find any text position for comment ${comment.id} with anchor: "${comment.anchorText}"`);
      return null;
    }
    
    const { from, to } = position;
    
    // Add debug information to the decoration
    // Only show active/resolved styling when comment is selected
    const decorationAttrs = {
      class: `comment-highlight comment-${comment.type} ${comment.selected ? (comment.resolved ? 'resolved' : 'active') : ''} ${comment.selected ? 'selected' : ''}`,
      'data-comment-id': comment.id,
      'data-comment-type': comment.type,
      'data-ai-generated': comment.aiGenerated.toString(),
      'data-agent-type': comment.agentType || '',
      'data-reconciliation-type': comment.reconciliation_type || '',
      'data-original-source': comment.original_source || '',
      'data-match-strategy': matchStrategy,
      'data-anchor-text': comment.anchorText || '',
      'data-paragraph-id': comment.paragraphId || ''
    };
    
    console.log(`✅ Created decoration for comment ${comment.id} using ${matchStrategy} strategy at positions ${from}-${to}`);
    
    return Decoration.inline(from, to, decorationAttrs);
  } catch (error) {
    console.error('❌ Failed to create comment decoration:', error);
    return null;
  }
}

// Helper function to find paragraph by content matching when IDs don't match
function findParagraphByContentMatch(
  doc: ProseMirrorNode, 
  paragraphIndex: number, 
  anchorText: string
): { from: number; to: number } | null {
  try {
    // Get all paragraph nodes
    const paragraphs: any[] = [];
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        paragraphs.push({ node, pos });
      }
    });
    
    if (paragraphIndex >= paragraphs.length) {
      console.warn(`Paragraph index ${paragraphIndex} is out of bounds (${paragraphs.length} paragraphs found)`);
      return null;
    }
    
    const targetParagraph = paragraphs[paragraphIndex];
    const paragraphText = targetParagraph.node.textContent;
    
    console.log(`Content matching for paragraph ${paragraphIndex}: "${paragraphText.substring(0, 100)}..."`);
    console.log(`Looking for anchor text: "${anchorText}"`);
    
    // Try to find the anchor text within this specific paragraph
    const startIndex = paragraphText.indexOf(anchorText);
    if (startIndex !== -1) {
      const from = targetParagraph.pos + 1 + startIndex;
      const to = from + anchorText.length;
      console.log(`✅ Found anchor text at position ${startIndex} in paragraph ${paragraphIndex}`);
      return { from, to };
    }
    
    // Try fuzzy matching within the paragraph
    const fuzzyMatch = findFuzzyMatchInParagraph(paragraphText, anchorText);
    if (fuzzyMatch) {
      const from = targetParagraph.pos + 1 + fuzzyMatch.start;
      const to = targetParagraph.pos + 1 + fuzzyMatch.end;
      console.log(`✅ Found fuzzy match at positions ${fuzzyMatch.start}-${fuzzyMatch.end} in paragraph ${paragraphIndex}`);
      return { from, to };
    }
    
    console.log(`❌ No match found in paragraph ${paragraphIndex}`);
    return null;
  } catch (error) {
    console.error('Error in findParagraphByContentMatch:', error);
    return null;
  }
}

// Helper function to find a fallback position within a specific paragraph
function findParagraphFallbackPosition(
  doc: ProseMirrorNode, 
  paragraphIndex: number, 
  anchorText: string
): { from: number; to: number } | null {
  try {
    // Get all paragraph nodes
    const paragraphs: any[] = [];
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        paragraphs.push({ node, pos });
      }
    });
    
    if (paragraphIndex >= paragraphs.length) {
      console.warn(`Paragraph index ${paragraphIndex} is out of bounds (${paragraphs.length} paragraphs found)`);
      return null;
    }
    
    const targetParagraph = paragraphs[paragraphIndex];
    const paragraphText = targetParagraph.node.textContent;
    
    console.log(`Searching for fallback in paragraph ${paragraphIndex}: "${paragraphText.substring(0, 100)}..."`);
    
    // Try to find the anchor text within this specific paragraph
    const paragraphPosition = findTextPosition(targetParagraph.node, anchorText);
    if (paragraphPosition) {
      // Adjust positions to be relative to the document
      return {
        from: targetParagraph.pos + paragraphPosition.from,
        to: targetParagraph.pos + paragraphPosition.to
      };
    }
    
    // If still no match, highlight the first sentence of the paragraph
    const firstSentence = paragraphText.split('.')[0].trim();
    if (firstSentence.length > 0) {
      const sentencePosition = findTextPosition(targetParagraph.node, firstSentence);
      if (sentencePosition) {
        return {
          from: targetParagraph.pos + sentencePosition.from,
          to: targetParagraph.pos + sentencePosition.to
        };
      }
    }
    
    // Last resort: highlight the beginning of the paragraph
    return {
      from: targetParagraph.pos + 1,
      to: targetParagraph.pos + Math.min(50, paragraphText.length)
    };
    
  } catch (error) {
    console.warn('Error finding paragraph fallback position:', error);
    return null;
  }
}

export const CommentExtension = Extension.create<CommentStorage>({
  name: 'comment',

  addStorage() {
    return {
      comments: [],
      selectedText: null,
      selectionRange: null,
      addComment: (comment: Omit<Comment, 'id'>) => {
        // This will be implemented by the plugin
      },
      removeComment: (id: string) => {
        // This will be implemented by the plugin
      },
      resolveComment: (id: string) => {
        // This will be implemented by the plugin
      },
      setSelectedText: (text: string, range: { from: number; to: number }) => {
        // This will be implemented by the plugin
      },
      clearSelection: () => {
        // This will be implemented by the plugin
      },
      setCommentSelection: (commentId: string | null) => {
        // This will be implemented by the plugin
      },
    };
  },

  addCommands() {
    return {
      setCommentSelection: (commentId: string | null) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('setCommentSelection', commentId);
        }
        return true;
      },
      clearCommentSelection: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('setCommentSelection', null);
        }
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: commentPluginKey,
        
        state: {
          init: () => ({
            comments: [] as Comment[],
            selectedText: null as string | null,
            selectionRange: null as { from: number; to: number } | null,
          }),
          
          apply: (tr, value) => {
            // Handle comment-related transactions
            if (tr.getMeta('addComment')) {
              const comment = tr.getMeta('addComment');
              return {
                ...value,
                comments: [...value.comments, comment],
              };
            }
            
            if (tr.getMeta('removeComment')) {
              const commentId = tr.getMeta('removeComment');
              return {
                ...value,
                comments: value.comments.filter(c => c.id !== commentId),
              };
            }
            
            if (tr.getMeta('resolveComment')) {
              const commentId = tr.getMeta('resolveComment');
              return {
                ...value,
                comments: value.comments.map(c => 
                  c.id === commentId ? { ...c, resolved: true } : c
                ),
              };
            }
            
            if (tr.getMeta('setSelectedText')) {
              const { text, range } = tr.getMeta('setSelectedText');
              return {
                ...value,
                selectedText: text,
                selectionRange: range,
              };
            }
            
            if (tr.getMeta('clearSelection')) {
              return {
                ...value,
                selectedText: null,
                selectionRange: null,
              };
            }
            
            if (tr.getMeta('clearComments')) {
              return {
                ...value,
                comments: [],
              };
            }
            
            if (tr.getMeta('setCommentSelection')) {
              const commentId = tr.getMeta('setCommentSelection');
              const updatedComments = value.comments.map(c => ({
                ...c,
                selected: c.id === commentId
              }));
              
              // Emit event when comment selection changes
              if (commentId === null) {
                // Selection cleared
                const customEvent = new CustomEvent('comment-selection-cleared');
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(customEvent);
                }
              }
              
              return {
                ...value,
                comments: updatedComments,
              };
            }
            
            return value;
          },
        },
        
        props: {
          decorations: (state) => {
            const pluginState = commentPluginKey.getState(state);
            if (!pluginState || !pluginState.comments) {
              return DecorationSet.empty;
            }
            
            const decorations: Decoration[] = [];
            
            pluginState.comments.forEach(comment => {
              // Create decorations for all comments (both selected and unselected)
              const decoration = createCommentDecoration(comment, state.doc);
              if (decoration) {
                decorations.push(decoration);
              }
            });
            
            return DecorationSet.create(state.doc, decorations);
          },
          
          handleTextInput: (view, from, to, text) => {
            // Clear selection when user types
            const tr = view.state.tr.setMeta('clearSelection', true);
            view.dispatch(tr);
            return false;
          },
          
          handleClick: (view, pos, event) => {
            // Handle clicks on comment decorations
            const target = event.target as HTMLElement;
            if (target.classList.contains('comment-highlight')) {
              const commentId = target.getAttribute('data-comment-id');
              if (commentId) {
                // Emit event for comment panel to handle
                const customEvent = new CustomEvent('comment-click', {
                  detail: { commentId, element: target }
                });
                view.dom.dispatchEvent(customEvent);
                return true;
              }
            } else {
              // Clicked elsewhere - clear comment selection
              const tr = view.state.tr.setMeta('setCommentSelection', null);
              view.dispatch(tr);
            }
            return false;
          },
        },
        
        view: (editorView) => {
          // Set up the storage methods
          const storage = this.storage;
          
          storage.addComment = (comment: Omit<Comment, 'id'>) => {
            const commentWithId = { ...comment, id: `comment_${Date.now()}` };
            const tr = editorView.state.tr.setMeta('addComment', commentWithId);
            editorView.dispatch(tr);
          };
          
          storage.removeComment = (id: string) => {
            const tr = editorView.state.tr.setMeta('removeComment', id);
            editorView.dispatch(tr);
          };
          
          storage.resolveComment = (id: string) => {
            const tr = editorView.state.tr.setMeta('resolveComment', id);
            editorView.dispatch(tr);
          };
          
          storage.setSelectedText = (text: string, range: { from: number; to: number }) => {
            const tr = editorView.state.tr.setMeta('setSelectedText', { text, range });
            editorView.dispatch(tr);
          };
          
          storage.clearSelection = () => {
            const tr = editorView.state.tr.setMeta('clearSelection', true);
            editorView.dispatch(tr);
          };
          
          storage.setCommentSelection = (commentId: string | null) => {
            const tr = editorView.state.tr.setMeta('setCommentSelection', commentId);
            editorView.dispatch(tr);
          };
          
          return {
            destroy: () => {
              // Cleanup if needed
            },
          };
        },
      }),
    ];
  },

  addCommands() {
    return {
      addComment: (comment: Omit<Comment, 'id'>) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('addComment', comment);
        }
        return true;
      },
      
      removeComment: (commentId: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('removeComment', commentId);
        }
        return true;
      },
      
      resolveComment: (commentId: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('resolveComment', commentId);
        }
        return true;
      },
      
      clearComments: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('clearComments', true);
        }
        return true;
      },
      
      setSelectedText: (text: string, range: { from: number; to: number }) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('setSelectedText', { text, range });
        }
        return true;
      },
      
      clearSelection: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('clearSelection', true);
        }
        return true;
      },
    };
  },
});

// CSS classes for comment highlighting
export const commentStyles = `
  .comment-highlight {
    position: relative;
    background-color: rgba(59, 130, 246, 0.1);
    border-radius: 2px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .comment-highlight:hover {
    background-color: rgba(59, 130, 246, 0.2);
  }
  
  .comment-highlight.comment-suggestion {
    background-color: rgba(34, 197, 94, 0.1);
    border-left: 3px solid #22c55e;
  }
  
  .comment-highlight.comment-critique {
    background-color: rgba(239, 68, 68, 0.1);
    border-left: 3px solid #ef4444;
  }
  
  .comment-highlight.comment-praise {
    background-color: rgba(168, 85, 247, 0.1);
    border-left: 3px solid #a855f7;
  }
  
  .comment-highlight.comment-question {
    background-color: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
  }
  
  .comment-highlight.resolved {
    opacity: 0.5;
    background-color: rgba(156, 163, 175, 0.1);
    border-left: 3px solid #9ca3af;
  }
  
  .comment-highlight[data-ai-generated="true"] {
    border-style: dashed;
  }
`;

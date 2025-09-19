# Context Optimization Strategy for Multi-Agent System

## Problem Analysis
The current multi-agent system is experiencing API overload (503 errors) due to cumulative context passing that creates exponentially growing prompt sizes:

- **Weaknesses Agent**: Essay + Prompt (~1200 words)
- **Strengths Agent**: Essay + Prompt + Weaknesses context (~1400 words)  
- **Tone Agent**: Essay + Prompt + Weaknesses + Strengths context (~1600 words)
- **Clarity Agent**: Essay + Prompt + All previous context (~1800 words)
- **Big-Picture Agent**: Essay + Prompt + All previous context (~2000+ words)

## Recommended Solutions

### 1. **Context Summarization Strategy**
Instead of passing full context, create condensed summaries:

```typescript
// Instead of full context
const cumulativeContext = `WEAKNESSES IDENTIFIED:
WEAKNESS: Your opening paragraph lacks a clear thesis statement that directly addresses the prompt...
WEAKNESS: The transition between paragraphs 2 and 3 is abrupt and doesn't flow naturally...
STRENGTH: Your personal anecdote about volunteering at the hospital is compelling and shows genuine passion...
STRENGTH: The specific examples you provide about your research experience demonstrate depth...`

// Use summarized context
const summarizedContext = {
  weaknesses: ["thesis clarity", "paragraph transitions"],
  strengths: ["compelling anecdotes", "specific examples"],
  keyThemes: ["healthcare passion", "research experience"]
}
```

### 2. **Smart Context Filtering**
Only pass relevant context to each agent:

```typescript
const contextFilters = {
  tone: ["weaknesses", "strengths"], // Needs overall assessment
  clarity: ["weaknesses"], // Only needs areas to avoid
  bigPicture: ["summary"] // Gets condensed summary of all
}
```

### 3. **Token Budget Management**
Implement token counting and limits:

```typescript
const TOKEN_LIMITS = {
  maxPromptTokens: 3000,
  maxContextTokens: 800,
  maxEssayTokens: 1500
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // Rough estimate
}

function truncateContext(context: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(context)
  if (estimatedTokens <= maxTokens) return context
  
  const ratio = maxTokens / estimatedTokens
  const truncateLength = Math.floor(context.length * ratio)
  return context.substring(0, truncateLength) + "..."
}
```

### 4. **Parallel + Summary Architecture**
Run agents in two phases:

**Phase 1: Parallel Analysis**
- Weaknesses, Strengths, Tone, Clarity agents run independently
- Each gets only essay + prompt (no cumulative context)
- Faster execution, no dependencies

**Phase 2: Synthesis**
- Big-picture agent gets summarized insights from Phase 1
- Editor-chief agent provides final synthesis

### 5. **Context Relevance Scoring**
Only include context that's relevant to each agent:

```typescript
const contextRelevance = {
  tone: {
    relevantFrom: ['weaknesses', 'strengths'],
    irrelevantTopics: ['grammar', 'structure']
  },
  clarity: {
    relevantFrom: ['weaknesses'],
    irrelevantTopics: ['tone', 'content themes']
  }
}
```

## Implementation Priority

### Immediate Fixes (High Impact, Low Effort):
1. **Add token counting and truncation** to existing system
2. **Implement context summarization** instead of full text passing
3. **Add retry logic with exponential backoff** for API calls

### Medium-term Improvements:
1. **Switch to parallel + summary architecture**
2. **Implement smart context filtering**
3. **Add context relevance scoring**

### Long-term Optimizations:
1. **Agent specialization refinement**
2. **Dynamic context adjustment based on essay length**
3. **Caching of agent insights for similar essays**

## Expected Outcomes
- **90% reduction** in context size passed to agents
- **Elimination** of 503 API overload errors
- **Faster processing** through parallel execution
- **Better agent focus** through relevant context filtering
- **Improved reliability** through retry mechanisms

## Code Examples

### Context Summarizer Implementation:
```typescript
class ContextSummarizer {
  static summarizeComments(comments: SemanticComment[], maxLength: number = 200): string {
    const grouped = this.groupCommentsByType(comments)
    const summary = Object.entries(grouped)
      .map(([type, commentList]) => {
        const key_points = commentList.slice(0, 2).map(c => this.extractKeyPoint(c.comment))
        return `${type.toUpperCase()}: ${key_points.join(', ')}`
      })
      .join(' | ')
    
    return this.truncateToLength(summary, maxLength)
  }
  
  private static extractKeyPoint(comment: string): string {
    // Extract the core issue/strength in 5-10 words
    const sentences = comment.split('.')
    return sentences[0].substring(0, 50) + (sentences[0].length > 50 ? '...' : '')
  }
}
```

### Token Budget Manager:
```typescript
class TokenBudgetManager {
  private static readonly TOKEN_LIMITS = {
    essay: 1500,
    prompt: 300,
    context: 800,
    total: 3000
  }
  
  static optimizePrompt(essay: string, prompt: string, context: string): {
    essay: string,
    prompt: string, 
    context: string
  } {
    const tokens = {
      essay: this.estimateTokens(essay),
      prompt: this.estimateTokens(prompt),
      context: this.estimateTokens(context)
    }
    
    // If within budget, return as-is
    if (tokens.essay + tokens.prompt + tokens.context <= this.TOKEN_LIMITS.total) {
      return { essay, prompt, context }
    }
    
    // Prioritize essay content, then context, then prompt
    const optimizedContext = tokens.context > this.TOKEN_LIMITS.context 
      ? this.truncateToTokens(context, this.TOKEN_LIMITS.context)
      : context
      
    const optimizedEssay = tokens.essay > this.TOKEN_LIMITS.essay
      ? this.truncateToTokens(essay, this.TOKEN_LIMITS.essay)
      : essay
      
    return {
      essay: optimizedEssay,
      prompt,
      context: optimizedContext
    }
  }
}
```

# New AI Agents Testing Plan

## Overview
This document outlines the testing plan for the three new specialized AI agents that have been added to the essay feedback system:
- **Tone Agent** (`ai_agent_tone`)
- **Clarity Agent** (`ai_agent_clarity`) 
- **Grammar & Spelling Agent** (`ai_agent_grammar_spelling`)

## New Agents Summary

### 1. Tone Agent (`ai_agent_tone`)
- **Purpose**: Analyzes personal voice and authenticity in essays
- **Output**: Overall comments focusing on tone and voice
- **Comment Structure**: `comment_nature` (strength/weakness), `comment_category` (overall), `agent_type` (tone)
- **Focus**: Personal voice authenticity, emotional resonance, originality vs clichéd language

### 2. Clarity Agent (`ai_agent_clarity`)
- **Purpose**: Identifies run-on sentences, jargon, and unnecessary words
- **Output**: Inline comments with text selection
- **Comment Structure**: `comment_nature` (weakness), `comment_category` (inline), `agent_type` (clarity), `text_selection`
- **Focus**: Clarity, conciseness, precision - NOT grammar or spelling

### 3. Grammar & Spelling Agent (`ai_agent_grammar_spelling`)
- **Purpose**: Finds grammar, punctuation, and spelling mistakes
- **Output**: Inline comments with text selection
- **Comment Structure**: `comment_nature` (weakness), `comment_category` (inline), `agent_type` (grammar_spelling), `text_selection`
- **Focus**: Mechanical errors only - NOT style, content, or structure

## Database Changes

### Migration Applied
- **File**: `supabase/migrations/20250115000005_add_new_agent_types.sql`
- **Changes**: Extended `agent_type` constraint to include `'tone'`, `'clarity'`, `'grammar_spelling'`

## Testing Strategy

### Phase 1: Individual Agent Testing
Test each agent separately to ensure they work correctly:

```bash
# Test individual agents
python test_individual_agents.py
```

**Expected Results:**
- Each agent should return `success: true`
- Tone agent: 2-3 overall comments about voice/authenticity
- Clarity agent: 2-4 inline comments about clarity/conciseness
- Grammar agent: 2-4 inline comments about mechanical errors

### Phase 2: Orchestrator Integration Testing
Test the orchestrator with all agents including the new ones:

```bash
# Test full orchestrator integration
python test_new_agents.py
```

**Expected Results:**
- Orchestrator should successfully call all 5 agents (existing + new)
- All agent results should be included in the response
- Structured comments should include new agent categories
- Total comment count should include comments from all agents

### Phase 3: End-to-End Testing
Test the complete workflow from frontend to database:

1. **Frontend Integration**: Ensure the essay editor can display comments from new agents
2. **Database Storage**: Verify comments are saved with correct `agent_type` values
3. **Comment Display**: Check that comments are properly categorized and displayed

## Test Files Created

### 1. `test_individual_agents.py`
- Simple script to test each agent individually
- Good for debugging individual agent issues
- Requires manual configuration of Supabase URL and service key

### 2. `test_new_agents.py`
- Comprehensive test suite for all agents and orchestrator
- Tests individual agents and orchestrator integration
- Includes detailed output and error reporting

## Expected Behavior

### Orchestrator Flow
1. **Step 1**: Run weaknesses and strengths agents in parallel
2. **Step 2**: Run reconciliation agent
3. **Step 3**: Run new specialized agents in parallel (tone, clarity, grammar_spelling)
4. **Step 4**: Run paragraph analysis
5. **Step 5**: Combine all comments and save to database

### Comment Organization
- **Overall Comments**: Reconciliation + Tone agent comments
- **Inline Comments**: Clarity + Grammar & Spelling + Paragraph agent comments
- **Agent Types**: All comments tagged with appropriate `agent_type`

## Troubleshooting

### Common Issues
1. **Agent Not Found**: Ensure Edge Functions are deployed
2. **Authentication Errors**: Check Supabase service key
3. **JSON Parsing Errors**: Verify agent response format
4. **Database Constraint Errors**: Ensure migration is applied

### Debug Steps
1. Check individual agent responses first
2. Verify orchestrator can call new agents
3. Check database migration status
4. Review agent response formats

## Success Criteria

✅ **Individual Agents**: All three agents return valid JSON responses
✅ **Orchestrator Integration**: All agents called successfully in parallel
✅ **Database Storage**: Comments saved with correct agent_type values
✅ **Comment Organization**: Comments properly categorized in structured format
✅ **Error Handling**: Graceful failure handling for individual agents

## Next Steps

After successful testing:
1. Deploy Edge Functions to production
2. Apply database migration
3. Update frontend to handle new comment types
4. Monitor agent performance and adjust prompts if needed
5. Document agent capabilities for users

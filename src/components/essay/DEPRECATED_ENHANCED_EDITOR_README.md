# DEPRECATED: Enhanced Essay Editor

⚠️ **This component has been deprecated and replaced by the Semantic Essay Editor**

## Replacement Information

- **Old Component**: `EnhancedEssayEditor`
- **New Component**: `SemanticEssayEditor`
- **Migration Date**: January 18, 2025
- **Reason**: Fundamental architecture issues with position-based commenting

## Why was it replaced?

The Enhanced Essay Editor used a position-based commenting system built on TipTap/ProseMirror that had several fundamental issues:

1. **Position Instability**: Comments would "drift" when content was modified
2. **AI-Document Mismatch**: AI thinks in semantic blocks, not positions
3. **Complex Extension Architecture**: Multiple conflicting positioning systems
4. **"Off by a bit" Problem**: Comments frequently appeared in wrong locations

## New Architecture Benefits

The Semantic Essay Editor provides:

- ✅ **Stable Comment Positioning**: Comments anchored to semantic blocks, not positions
- ✅ **AI-First Design**: Aligns with how AI analyzes content
- ✅ **Google Docs-like UX**: Floating comment bubbles with proper positioning
- ✅ **Better Performance**: Block-based operations instead of complex position calculations
- ✅ **Future-Proof**: Easy to add collaborative editing and version control

## Migration Guide

### Old Usage:
```tsx
<EnhancedEssayEditor 
  essayId={essayId}
  title={title}
  prompt={prompt}
  wordLimit={wordLimit}
  onTitleChange={onTitleChange}
/>
```

### New Usage:
```tsx
<SemanticEssayEditor 
  essayId={essayId}
  title={title}
  prompt={prompt}
  wordLimit={wordLimit}
  onTitleChange={onTitleChange}
  onContentChange={onContentChange} // Optional: for parent components
/>
```

## Automatic Migration

The Semantic Essay Editor automatically migrates:
- Existing essay content to semantic blocks
- Legacy comments to the new annotation system
- User preferences and settings

## Files Deprecated

- `src/components/essay/EnhancedEssayEditor.tsx`
- `src/components/essay/EnhancedEssayEditor.tsx.backup`
- Related TipTap comment extensions and utilities

## Documentation

For full documentation on the new system, see:
- `SEMANTIC_ARCHITECTURE_README.md`
- `AI_COMMENTING_ARCHITECTURE_ANALYSIS.md`

## Contact

If you encounter any issues with the migration, please refer to the semantic editor documentation or create an issue.

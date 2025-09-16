# Essay Prompts Management System

This document explains how to manage essay prompts using JSON files and sync them to the Supabase database.

## Overview

The essay prompts system allows you to:
- Store essay prompts in JSON files organized by program type
- Automatically filter prompts based on user's program type (MBA vs Undergraduate)
- Easily add new prompts and sync them to the database

## File Structure

Essay prompts are organized into JSON files based on program types:
- `public/undergrad_essay_prompts.json` - Undergraduate essay prompts
- `public/mba_essay_prompts.json` - MBA essay prompts

## JSON File Format

Each JSON file follows this structure:

```json
{
  "essay_prompts": [
    {
      "college_name": "Harvard University",
      "how_many": "1",
      "selection_type": "required",
      "prompt_number": "1",
      "prompt": "Harvard has long recognized the importance of enrolling a diverse student body. How will the life experiences that shape who you are today enable you to contribute to Harvard?",
      "word_limit": "150",
      "prompt_selection_type": "required",
      "school_program_type": "Undergraduate"
    }
  ]
}
```

### Field Descriptions

- **college_name**: Name of the college/university (required)
- **how_many**: Number of prompts required (e.g., "1", "2")
- **selection_type**: Type of selection (e.g., "required", "optional")
- **prompt_number**: Number/identifier for the prompt (e.g., "1", "2", "A", "B")
- **prompt**: The actual essay prompt text (required)
- **word_limit**: Word limit for the essay (e.g., "150", "250-650", "300")
- **prompt_selection_type**: Additional classification (e.g., "required", "optional")
- **school_program_type**: Program type (required) - must be one of: "Undergraduate", "MBA", "LLM", "PhD", "Masters"

## Adding New Essay Prompts

### 1. Add to JSON Files

Edit the appropriate JSON file (`undergrad_essay_prompts.json` or `mba_essay_prompts.json`) and add your new prompts:

```json
{
  "college_name": "New University",
  "how_many": "1",
  "selection_type": "required",
  "prompt_number": "1",
  "prompt": "Your essay prompt here...",
  "word_limit": "500",
  "prompt_selection_type": "required",
  "school_program_type": "Undergraduate"
}
```

### 2. Sync to Database

Run the sync script to update the database:

```bash
npm run sync-essay-prompts
```

Or run directly:

```bash
node scripts/sync-essay-prompts-to-db.js
```

## How Filtering Works

The system automatically filters essay prompts based on the user's program type:

1. **User Profile**: User sets their `applying_to` field during onboarding
2. **Automatic Filtering**: When a user selects a school, only prompts matching their program type are shown
3. **Program Type Mapping**:
   - "Undergraduate Colleges" → "Undergraduate"
   - "MBA" → "MBA"
   - "LLM" → "LLM"
   - "PhD" → "PhD"
   - "Masters" → "Masters"

## Database Schema

The essay prompts are stored in the `essay_prompts` table with the following key fields:
- `college_name`: Name of the college
- `prompt_number`: Prompt identifier
- `prompt`: The essay prompt text
- `word_limit`: Word limit
- `school_program_type`: Program type for filtering

## Script Features

The sync script (`scripts/sync-essay-prompts-to-db.js`) provides:

- **Validation**: Checks for required fields and valid program types
- **Upsert Logic**: Updates existing prompts or creates new ones
- **Error Handling**: Reports validation errors and database issues
- **Summary**: Shows total prompts processed and database count

## Environment Variables

Make sure you have these environment variables in your `.env.local` file:

```
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**: Ensure `.env.local` has the required Supabase credentials
2. **Invalid Program Type**: Use only valid values: "Undergraduate", "MBA", "LLM", "PhD", "Masters"
3. **Missing Required Fields**: Ensure all required fields are present in your JSON data

### Validation Errors

The script will warn you about:
- Missing required fields
- Invalid program types
- Database connection issues

## Best Practices

1. **Consistent Naming**: Use consistent college names across prompts
2. **Program Type**: Always include the correct `school_program_type`
3. **Word Limits**: Use consistent format for word limits (e.g., "250-650")
4. **Regular Syncs**: Run the sync script after adding new prompts
5. **Backup**: Keep your JSON files in version control

## Example Workflow

1. Add new MBA prompts to `public/mba_essay_prompts.json`
2. Run `npm run sync-essay-prompts`
3. Check the output for any errors
4. Test the filtering in the application
5. Commit your changes to version control

This system ensures that MBA students only see MBA essay prompts and undergraduate students only see undergraduate prompts, providing a better user experience.

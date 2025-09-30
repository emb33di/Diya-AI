# Essay Prompt Scraper

A system to scrape essay prompts from university websites and transform them into the exact format needed for the Supabase database.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Set the environment variable:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

## Usage

### 1. Scrape All Universities
```bash
node scraper.js
```
**Output**: `data/scraped-essay-prompts-{timestamp}.json`

### 2. Transform with AI Agent
```bash
node ai-transform-agent.js data/scraped-essay-prompts-{timestamp}.json
```
**Output**: `data/scraped-essay-prompts-{timestamp}-transformed.json`

### 3. Test Single School (Scrape + Transform)
```bash
node test_prompt_scraper.js "Harvard University"
```
**Output**: 
- `data/test-scraped-harvard-university-{timestamp}.json`
- `data/test-transformed-harvard-university-{timestamp}.json`

## File Structure

```
essay-prompt-scraper/
├── scraper.js                    # Main scraper for all universities
├── ai-transform-agent.js         # AI agent to transform data
├── test_prompt_scraper.js        # Test script for single school
├── src/
│   └── collegeEssayAdvisorsExtractor.js  # Core scraping logic
├── data/
│   ├── cea-universities-list.json        # List of 184 universities
│   └── scraped-essay-prompts-*.json      # Scraped data output
└── README.md                     # This file
```

## Output Formats

### Scraped Data Format
```json
{
  "extraction_metadata": {
    "source": "College Essay Advisors",
    "extraction_date": "2025-09-30T13:20:41.141Z",
    "total_universities_processed": 5
  },
  "universities": [
    {
      "university_url": "https://www.collegeessayadvisors.com/supplemental-essay/harvard-university-supplemental-essay-prompt-guide/",
      "requirements": {
        "raw_text": "The Requirements: Five essays of 150 words or fewer",
        "how_many_essays": "5",
        "word_limit": "150 words or fewer"
      },
      "essay_prompts": [
        {
          "prompt_number": "1",
          "prompt_text": "Harvard has long recognized the importance...",
          "word_limit": "150 words or fewer",
          "category": "diversity_contribution",
          "themes": ["diversity", "community"]
        }
      ]
    }
  ]
}
```

### Final Database Format (After AI Transformation)
```json
{
  "essay_prompts": [
    {
      "college_name": "Harvard University",
      "how_many": "5",
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

## Integration with Database

The final transformed JSON can be directly used with the existing database sync script:

```bash
# After transformation, sync to database
node ../scripts/sync-essay-prompts-to-db.js data/scraped-essay-prompts-{timestamp}-transformed.json
```

## Examples

### Complete Workflow
```bash
# 1. Scrape all universities
node scraper.js

# 2. Transform with AI
node ai-transform-agent.js data/scraped-essay-prompts-2025-09-30T13-20-41-144Z.json

# 3. Sync to database
node ../scripts/sync-essay-prompts-to-db.js data/scraped-essay-prompts-2025-09-30T13-20-41-144Z-transformed.json
```

### Test Single School
```bash
# Test Harvard University
node test_prompt_scraper.js "Harvard University"

# Test Stanford University
node test_prompt_scraper.js "Stanford University"

# Test MIT
node test_prompt_scraper.js "MIT"
```

## Troubleshooting

### Missing API Key
```
❌ GEMINI_API_KEY environment variable is required
```
**Solution**: Set the environment variable with your Gemini API key

### School Not Found
```
❌ School "XYZ" not found in the university list
```
**Solution**: Check the school name spelling or use a partial name

### Scraping Failed
```
❌ Scraping failed: Error message
```
**Solution**: Check internet connection and try again

## Performance

- **Scraping Speed**: ~2-3 seconds per university
- **AI Processing**: ~1-2 seconds per university
- **Total Time**: ~5-10 minutes for all 184 universities
- **API Costs**: ~$0.001 per 1000 tokens (very affordable)

## Features

- **Overinclusive Scraping**: Captures all potential prompts from `<b>` tags
- **AI Filtering**: Intelligently removes non-prompt content
- **Format Enforcement**: Ensures exact database schema compliance
- **Error Handling**: Robust error recovery and logging
- **Batch Processing**: Handles multiple universities efficiently

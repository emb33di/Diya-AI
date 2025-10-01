# Targeted School Scraper

This script scrapes essay prompts **only for schools that are already in your school list** from `undergraduate-schools.json`. It matches your schools with available data on College Essay Advisors and processes only those matches.

## What it does

1. **Loads your school list** from `../public/undergraduate-schools.json`
2. **Scrapes CEA** to find available universities
3. **Matches schools** from your list with CEA availability
4. **Scrapes essay prompts** only for matched schools
5. **Uses AI** to transform the data into the correct format
6. **Generates a report** showing what was processed

## Setup

1. **Install dependencies** (if not already done):
   ```bash
   cd essay-prompt-scraper
   npm install
   ```

2. **Set up Google API key**:
   ```bash
   export GOOGLE_API_KEY="your-google-api-key"
   ```
   
   Get your API key from: https://makersuite.google.com/app/apikey

## Usage

### Option 1: Simple runner (recommended)
```bash
node run-targeted-scraper.js
```

### Option 2: Direct execution
```bash
node targeted-school-scraper.js
```

## Output

The script creates several files in the `data/` folder:

- `cea-targeted-scraped-data-{timestamp}.json` - Raw scraped data
- `cea-targeted-essay-prompts-{timestamp}.json` - Final AI-transformed essay prompts

**Note**: These files have unique names and will NOT overwrite your existing `undergrad_essay_prompts.json` file.

## Example Output

```
🚀 TARGETED SCHOOL SCRAPER
==========================
This script will only scrape schools that are already in your school list.

📋 Loading school list from undergraduate-schools.json...
✅ Loaded 194 schools from your list

🌐 Scraping College Essay Advisors for available schools...
✅ Found 150 schools available on CEA

🔍 Matching schools from your list with CEA availability...
✅ Found 45 matches out of 194 schools
❌ 149 schools not available on CEA

🎯 Matched schools:
   1. Princeton University → Princeton University
   2. Harvard University → Harvard University
   3. Stanford University → Stanford University
   ...

🎓 Starting to scrape 45 matched schools...
📦 BATCH 1/9: Processing 5 schools
   Schools in this batch:
   1. Princeton University
   2. Harvard University
   ...

🤖 Transforming scraped data with AI...
✅ AI transformation completed!

📊 TARGETED SCRAPING SUMMARY REPORT
=====================================
📋 Total schools in your list: 194
🎯 Schools matched with CEA: 45
✅ Schools successfully scraped: 45
❌ Schools not available on CEA: 149
📝 Total essay prompts extracted: 127
📊 Average prompts per school: 2.8

🎉 TARGETED SCRAPING COMPLETED SUCCESSFULLY!
📁 Final essay prompts file: data/cea-targeted-essay-prompts-2024-01-15T10-30-45-123Z.json
```

## Benefits

- **Efficient**: Only processes schools you actually care about
- **Focused**: No wasted time on irrelevant schools
- **Accurate**: Uses your exact school names and data
- **Smart matching**: Handles variations in school names
- **AI-powered**: Transforms data into the correct format automatically

## Troubleshooting

### No matches found
If you see "No schools from your list are available on CEA", it could mean:
- Your school names don't match CEA's naming convention
- The schools aren't covered by CEA
- There's a temporary issue with the CEA website

### API key issues
Make sure your `GOOGLE_API_KEY` is:
- Valid and active
- Has access to Gemini API
- Properly exported in your environment

### Network issues
The script includes delays and retries, but if you encounter issues:
- Check your internet connection
- Try running again (sometimes it's temporary)
- The script processes schools in batches to be respectful to the website

## Files Created

- `targeted-school-scraper.js` - Main scraper class
- `run-targeted-scraper.js` - Simple runner script
- `README.md` - This documentation

## Next Steps

After running the scraper:
1. Review the generated essay prompts in the `data/` folder
2. Import the data into your database if needed
3. Update your application with the new prompts
4. Use the prompts to help students with their applications

# Essay Prompt Scraper

A comprehensive web scraper for collecting essay prompts from university websites.

## 🚀 Quick Start

1. **Install dependencies:**
```bash
cd essay-prompt-scraper
npm install
```

2. **Run the scraper:**
```bash
npm start
```

3. **Check results:**
Results are saved to the `data/` directory in JSON and CSV formats.

## 📁 Project Structure

```
essay-prompt-scraper/
├── src/
│   ├── scraper.js          # Main scraper class
│   ├── dataProcessor.js    # Data processing utilities
│   ├── customExtractors.js # Custom extraction logic
│   └── index.js           # Entry point
├── config/
│   ├── scraper-config.json # Main configuration
│   └── README.md          # Configuration guide
├── examples/
│   ├── basic-examples.js   # Basic usage examples
│   ├── advanced-scraper.js # Advanced techniques
│   └── README.md          # Examples guide
├── data/                  # Output directory
├── package.json
└── README.md
```

## ⚙️ Configuration

Edit `config/scraper-config.json` to:
- Add new university websites
- Configure scraping parameters
- Set output formats
- Adjust rate limiting

### Example Configuration
```json
{
  "scraper": {
    "concurrentRequests": 3,
    "delayBetweenRequests": 2000,
    "requestTimeout": 30000
  },
  "targets": [
    {
      "name": "Harvard University",
      "url": "https://college.harvard.edu/admissions/apply/essay-requirements",
      "type": "undergraduate",
      "selectors": {
        "promptContainer": ".essay-prompt",
        "promptText": "p",
        "wordLimit": ".word-limit"
      }
    }
  ]
}
```

## 🎯 Features

- **Multi-target scraping**: Support for various university websites
- **Rate limiting**: Respectful scraping with configurable delays
- **Data cleaning**: Automatic processing and formatting
- **Multiple output formats**: JSON, CSV, and structured data
- **Error handling**: Robust error recovery and logging
- **Custom extractors**: Specialized logic for specific websites
- **Data analysis**: Automatic categorization and statistics

## 📊 Output Formats

### JSON Output
```json
{
  "university": "Harvard University",
  "url": "https://college.harvard.edu/...",
  "type": "undergraduate",
  "prompts": [
    {
      "id": "prompt_1",
      "title": "Personal Statement",
      "text": "Tell us about yourself...",
      "wordLimit": "650 words",
      "category": "personal_statement",
      "keywords": ["personal", "experience", "growth"]
    }
  ],
  "scrapedAt": "2024-01-15T10:30:00.000Z"
}
```

### CSV Output
| University | Type | Prompt ID | Title | Text | Word Limit | Category |
|------------|------|-----------|-------|------|------------|----------|
| Harvard University | undergraduate | prompt_1 | Personal Statement | Tell us about yourself... | 650 words | personal_statement |

## 🔧 Usage Examples

### Basic Scraping
```javascript
import EssayPromptScraper from './src/scraper.js';

const scraper = new EssayPromptScraper();
await scraper.run();
```

### With Data Processing
```javascript
import EssayPromptScraper from './src/scraper.js';
import DataProcessor from './src/dataProcessor.js';

const scraper = new EssayPromptScraper();
const processor = new DataProcessor();

await scraper.initialize();
await scraper.scrapeAll();

const processedData = processor.processResults(scraper.results);
await processor.saveProcessedData(processedData, './data/processed');
```

### Custom Configuration
```javascript
const scraper = new EssayPromptScraper('./config/custom-config.json');
await scraper.run();
```

## 🛠️ Advanced Features

### Custom Extractors
Implement custom extraction logic for specific websites:

```javascript
// In customExtractors.js
static async harvardExtractor(page) {
  return await page.evaluate(() => {
    // Custom extraction logic
    const prompts = [];
    // ... extraction code
    return prompts;
  });
}
```

### Data Processing
Automatic data cleaning and analysis:
- Text normalization
- Word count extraction
- Category classification
- Keyword extraction
- Statistics generation

### Error Handling
Robust error handling with retry logic:
- Automatic retries for failed requests
- Detailed error logging
- Graceful degradation

## 📈 Statistics

The scraper generates comprehensive statistics:
- Total universities scraped
- Total prompts collected
- Word count analysis
- Category distribution
- University breakdown
- Success/failure rates

## 🔒 Best Practices

1. **Respectful Scraping**: Use appropriate delays between requests
2. **Rate Limiting**: Don't overwhelm target websites
3. **Error Handling**: Implement proper error recovery
4. **Data Validation**: Verify scraped data quality
5. **Legal Compliance**: Respect robots.txt and terms of service

## 🚨 Important Notes

- Always check robots.txt before scraping
- Respect website terms of service
- Use appropriate delays between requests
- Monitor for changes in website structure
- Keep scrapers updated with website changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your improvements
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the examples directory
2. Review the configuration guide
3. Open an issue on GitHub

---

**Happy Scraping! 🎓**
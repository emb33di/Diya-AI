# Scraper Configuration

This directory contains configuration files for the essay prompt scraper.

## Files

- `scraper-config.json` - Main configuration file with scraping targets and settings
- `custom-extractors.js` - Custom extraction logic for specific websites
- `user-agents.json` - List of user agents for rotation

## Configuration Options

### Scraper Settings
- `concurrentRequests`: Number of simultaneous requests (default: 3)
- `delayBetweenRequests`: Delay between requests in milliseconds (default: 2000)
- `requestTimeout`: Request timeout in milliseconds (default: 30000)
- `retryAttempts`: Number of retry attempts for failed requests (default: 3)
- `retryDelay`: Delay between retry attempts in milliseconds (default: 5000)

### Target Configuration
Each target includes:
- `name`: University name
- `url`: Target URL to scrape
- `type`: Application type (undergraduate/graduate)
- `selectors`: CSS selectors for extracting data
- `customExtractor`: Optional custom extraction function

### Output Settings
- `formats`: Output formats (json, csv, xml)
- `directory`: Output directory
- `filename`: Base filename for output files
- `includeMetadata`: Include scraping metadata
- `includeRawHtml`: Include raw HTML in output

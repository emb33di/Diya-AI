import fs from 'fs-extra';
import path from 'path';

export class DataProcessor {
  constructor() {
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
  }

  /**
   * Clean and normalize text content
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\t+/g, ' ') // Replace tabs with spaces
      .trim()
      .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove special characters except basic punctuation
      .replace(/\s+/g, ' ') // Clean up spaces again
      .trim();
  }

  /**
   * Extract word count from text
   */
  extractWordCount(text) {
    if (!text) return 0;
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Extract character count from text
   */
  extractCharacterCount(text) {
    if (!text) return 0;
    return text.length;
  }

  /**
   * Parse word limit from text (e.g., "250 words", "500-750 words")
   */
  parseWordLimit(text) {
    if (!text) return null;
    
    const wordMatch = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*words?/i);
    if (wordMatch) {
      const min = parseInt(wordMatch[1]);
      const max = wordMatch[2] ? parseInt(wordMatch[2]) : min;
      return { min, max, type: 'words' };
    }
    
    const charMatch = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*characters?/i);
    if (charMatch) {
      const min = parseInt(charMatch[1]);
      const max = charMatch[2] ? parseInt(charMatch[2]) : min;
      return { min, max, type: 'characters' };
    }
    
    return null;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text, maxKeywords = 10) {
    if (!text) return [];
    
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.stopWords.has(word));
    
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Categorize prompt by type based on content
   */
  categorizePrompt(text) {
    if (!text) return 'unknown';
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('personal statement') || lowerText.includes('personal essay')) {
      return 'personal_statement';
    }
    if (lowerText.includes('why') && lowerText.includes('school')) {
      return 'why_school';
    }
    if (lowerText.includes('why') && lowerText.includes('major')) {
      return 'why_major';
    }
    if (lowerText.includes('challenge') || lowerText.includes('difficulty')) {
      return 'challenge';
    }
    if (lowerText.includes('leadership') || lowerText.includes('leader')) {
      return 'leadership';
    }
    if (lowerText.includes('diversity') || lowerText.includes('diverse')) {
      return 'diversity';
    }
    if (lowerText.includes('future') || lowerText.includes('goal')) {
      return 'future_goals';
    }
    if (lowerText.includes('community') || lowerText.includes('service')) {
      return 'community_service';
    }
    if (lowerText.includes('academic') || lowerText.includes('research')) {
      return 'academic';
    }
    if (lowerText.includes('creative') || lowerText.includes('imagine')) {
      return 'creative';
    }
    
    return 'general';
  }

  /**
   * Process a single prompt
   */
  processPrompt(prompt) {
    const cleanedText = this.cleanText(prompt.text);
    const wordCount = this.extractWordCount(cleanedText);
    const charCount = this.extractCharacterCount(cleanedText);
    const wordLimit = this.parseWordLimit(prompt.wordLimit);
    const keywords = this.extractKeywords(cleanedText);
    const category = this.categorizePrompt(cleanedText);
    
    return {
      ...prompt,
      text: cleanedText,
      wordCount,
      charCount,
      wordLimit,
      keywords,
      category,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Process all prompts from scraping results
   */
  processResults(results) {
    console.log('🔄 Processing scraped data...');
    
    const processedResults = results.map(result => ({
      ...result,
      prompts: result.prompts.map(prompt => this.processPrompt(prompt)),
      processedAt: new Date().toISOString()
    }));
    
    // Generate statistics
    const stats = this.generateStatistics(processedResults);
    
    return {
      results: processedResults,
      statistics: stats,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Generate statistics from processed results
   */
  generateStatistics(results) {
    const stats = {
      totalUniversities: results.length,
      totalPrompts: 0,
      totalWords: 0,
      averageWordCount: 0,
      categories: {},
      universities: {},
      wordLimits: {
        withLimits: 0,
        withoutLimits: 0,
        averageMin: 0,
        averageMax: 0
      }
    };
    
    let totalWordLimits = 0;
    let totalMinLimits = 0;
    let totalMaxLimits = 0;
    
    results.forEach(result => {
      stats.totalPrompts += result.prompts.length;
      
      const universityStats = {
        name: result.university,
        promptCount: result.prompts.length,
        totalWords: 0,
        categories: {}
      };
      
      result.prompts.forEach(prompt => {
        stats.totalWords += prompt.wordCount;
        universityStats.totalWords += prompt.wordCount;
        
        // Category statistics
        stats.categories[prompt.category] = (stats.categories[prompt.category] || 0) + 1;
        universityStats.categories[prompt.category] = (universityStats.categories[prompt.category] || 0) + 1;
        
        // Word limit statistics
        if (prompt.wordLimit) {
          stats.wordLimits.withLimits++;
          totalMinLimits += prompt.wordLimit.min;
          totalMaxLimits += prompt.wordLimit.max;
          totalWordLimits++;
        } else {
          stats.wordLimits.withoutLimits++;
        }
      });
      
      stats.universities[result.university] = universityStats;
    });
    
    stats.averageWordCount = stats.totalPrompts > 0 ? Math.round(stats.totalWords / stats.totalPrompts) : 0;
    stats.wordLimits.averageMin = totalWordLimits > 0 ? Math.round(totalMinLimits / totalWordLimits) : 0;
    stats.wordLimits.averageMax = totalWordLimits > 0 ? Math.round(totalMaxLimits / totalWordLimits) : 0;
    
    return stats;
  }

  /**
   * Save processed data to files
   */
  async saveProcessedData(processedData, outputDir) {
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save processed results
    const resultsPath = path.join(outputDir, `processed-results-${timestamp}.json`);
    await fs.writeJson(resultsPath, processedData.results, { spaces: 2 });
    
    // Save statistics
    const statsPath = path.join(outputDir, `statistics-${timestamp}.json`);
    await fs.writeJson(statsPath, processedData.statistics, { spaces: 2 });
    
    // Save summary report
    const reportPath = path.join(outputDir, `summary-report-${timestamp}.txt`);
    const report = this.generateSummaryReport(processedData.statistics);
    await fs.writeFile(reportPath, report);
    
    console.log(`✓ Processed data saved to: ${outputDir}`);
    console.log(`  - Results: ${resultsPath}`);
    console.log(`  - Statistics: ${statsPath}`);
    console.log(`  - Report: ${reportPath}`);
  }

  /**
   * Generate a human-readable summary report
   */
  generateSummaryReport(stats) {
    let report = 'ESSAY PROMPT SCRAPING SUMMARY REPORT\n';
    report += '=====================================\n\n';
    
    report += `Total Universities Scraped: ${stats.totalUniversities}\n`;
    report += `Total Prompts Collected: ${stats.totalPrompts}\n`;
    report += `Total Words Processed: ${stats.totalWords.toLocaleString()}\n`;
    report += `Average Word Count per Prompt: ${stats.averageWordCount}\n\n`;
    
    report += 'PROMPT CATEGORIES:\n';
    report += '------------------\n';
    Object.entries(stats.categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        report += `${category.replace(/_/g, ' ').toUpperCase()}: ${count} prompts\n`;
      });
    
    report += '\nWORD LIMITS:\n';
    report += '------------\n';
    report += `Prompts with word limits: ${stats.wordLimits.withLimits}\n`;
    report += `Prompts without word limits: ${stats.wordLimits.withoutLimits}\n`;
    report += `Average minimum limit: ${stats.wordLimits.averageMin} words\n`;
    report += `Average maximum limit: ${stats.wordLimits.averageMax} words\n\n`;
    
    report += 'UNIVERSITY BREAKDOWN:\n';
    report += '--------------------\n';
    Object.entries(stats.universities)
      .sort(([,a], [,b]) => b.promptCount - a.promptCount)
      .forEach(([name, data]) => {
        report += `${name}: ${data.promptCount} prompts, ${data.totalWords} words\n`;
      });
    
    report += `\nReport generated at: ${new Date().toISOString()}\n`;
    
    return report;
  }
}

export default DataProcessor;

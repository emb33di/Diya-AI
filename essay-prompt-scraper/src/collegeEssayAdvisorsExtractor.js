import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Specialized extractor for College Essay Advisors website
 * Handles the specific structure of their supplemental essay guide
 */
export class CollegeEssayAdvisorsExtractor {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  /**
   * Extract university information and essay prompts from CEA website
   */
  async extractUniversityData(universityName, universityUrl) {
    console.log(`\n🎓 STEP 1: Navigated to ${universityName} supplemental essays URL`);
    console.log(`📍 URL: ${universityUrl}`);
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto(universityUrl, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`✅ Successfully loaded ${universityName} page`);

      const rawData = await page.evaluate((name) => {
        const result = {
          university_info: {
            college_name: name,
            school_program_type: "Undergraduate",
            university_url: window.location.href,
            acceptance_rate: null,
            location: null,
            university_type: null,
            ranking: null
          },
          essay_requirements: {
            raw_text: null,
            essay_types: null
          },
          raw_prompts: [],
          additional_info: {
            essay_advice: null,
            common_mistakes: [],
            success_tips: []
          }
        };

        // Extract requirements section - looking for "The Requirements:" format
        const requirementsElements = document.querySelectorAll('p.supp-prompt');
        let requirementsElement = null;
        
        for (const element of requirementsElements) {
          if (element.textContent.includes('The Requirements:')) {
            requirementsElement = element;
            break;
          }
        }
        
        if (requirementsElement) {
          result.essay_requirements.raw_text = requirementsElement.textContent;
        }

        // Extract supplemental essay types
        let essayTypesElement = null;
        for (const element of requirementsElements) {
          if (element.textContent.includes('Supplemental Essay Type(s):')) {
            essayTypesElement = element;
            break;
          }
        }
        
        if (essayTypesElement) {
          result.essay_requirements.essay_types = essayTypesElement.textContent.replace('Supplemental Essay Type(s):', '').trim();
        }

        // Extract university metadata
        const acceptanceRateElement = document.querySelector('.acceptance-rate, [class*="acceptance"], [class*="rate"]');
        if (acceptanceRateElement) {
          result.university_info.acceptance_rate = acceptanceRateElement.textContent.trim();
        }

        const locationElement = document.querySelector('.location, [class*="location"], [class*="address"]');
        if (locationElement) {
          result.university_info.location = locationElement.textContent.trim();
        }

        // Enhanced prompt extraction with multiple strategies
        const promptStrategies = [
          // Strategy 1: Guide content with h3 bold elements
          () => {
            const guideContent = document.querySelector('.guide-content');
            if (!guideContent) return [];
            
            const promptHeadings = guideContent.querySelectorAll('h3 b, h3 strong, h2 b, h2 strong');
            const prompts = [];
            
            promptHeadings.forEach((heading, index) => {
              const promptText = heading.textContent.trim();
              
              // More robust prompt detection
              if (promptText.length > 20 && (
                promptText.includes('?') || 
                promptText.toLowerCase().includes('describe') || 
                promptText.toLowerCase().includes('how') || 
                promptText.toLowerCase().includes('what') ||
                promptText.toLowerCase().includes('explain') ||
                promptText.toLowerCase().includes('tell') ||
                promptText.toLowerCase().includes('reflect')
              )) {
                prompts.push({
                  text: promptText,
                  source: 'guide-content-h3',
                  index: index
                });
              }
            });
            
            return prompts;
          },
          
          // Strategy 2: Look for numbered prompts
          () => {
            const numberedPrompts = document.querySelectorAll('h3, h4, h5');
            const prompts = [];
            
            numberedPrompts.forEach((element, index) => {
              const text = element.textContent.trim();
              
              // Look for numbered prompts (1., 2., etc.)
              if (text.match(/^\d+\./) && text.length > 20) {
                prompts.push({
                  text: text,
                  source: 'numbered-heading',
                  index: index
                });
              }
            });
            
            return prompts;
          },
          
          // Strategy 3: Look for prompt-specific classes
          () => {
            const promptElements = document.querySelectorAll('.essay-prompt, .prompt-text, .essay-content, .writing-prompt, [class*="prompt"], [class*="essay"]');
            const prompts = [];
            
            promptElements.forEach((element, index) => {
              const title = element.querySelector('h2, h3, h4, h5, h6, .title, .prompt-title')?.textContent?.trim();
              const text = element.querySelector('p, .prompt-text, .essay-text, .content')?.textContent?.trim() || element.textContent?.trim();
              
              if (text && text.length > 20) {
                prompts.push({
                  text: title ? `${title}: ${text}` : text,
                  source: 'prompt-class',
                  index: index
                });
              }
            });
            
            return prompts;
          },
          
          // Strategy 4: Look for paragraphs with question marks
          () => {
            const paragraphs = document.querySelectorAll('p');
            const prompts = [];
            
            paragraphs.forEach((element, index) => {
              const text = element.textContent.trim();
              
              if (text.includes('?') && text.length > 30 && text.length < 500) {
                prompts.push({
                  text: text,
                  source: 'question-paragraph',
                  index: index
                });
              }
            });
            
            return prompts;
          }
        ];

        // Try each strategy and collect unique prompts
        const allPrompts = [];
        const seenPrompts = new Set();
        
        promptStrategies.forEach(strategy => {
          try {
            const prompts = strategy();
            prompts.forEach(prompt => {
              // Deduplicate based on text similarity
              const normalizedText = prompt.text.toLowerCase().replace(/[^\w\s]/g, '').trim();
              if (!seenPrompts.has(normalizedText) && normalizedText.length > 10) {
                seenPrompts.add(normalizedText);
                allPrompts.push(prompt);
              }
            });
          } catch (error) {
            console.warn('Strategy failed:', error);
          }
        });

        // Sort prompts by index and assign numbers
        allPrompts.sort((a, b) => a.index - b.index);
        result.raw_prompts = allPrompts.map((prompt, index) => ({
          prompt_number: (index + 1).toString(),
          text: prompt.text,
          source: prompt.source
        }));

        // Extract essay advice and tips
        const adviceElement = document.querySelector('.advice, .tips, .guidance, [class*="advice"]');
        if (adviceElement) {
          result.additional_info.essay_advice = adviceElement.textContent.trim();
        }

        // Extract common mistakes
        const mistakesElements = document.querySelectorAll('.mistake, .common-mistake, [class*="mistake"]');
        mistakesElements.forEach(element => {
          result.additional_info.common_mistakes.push(element.textContent.trim());
        });

        // Extract success tips
        const tipsElements = document.querySelectorAll('.tip, .success-tip, [class*="tip"]');
        tipsElements.forEach(element => {
          result.additional_info.success_tips.push(element.textContent.trim());
        });

        return result;
      });

      // Process raw data in Node.js context
      const universityData = this.processRawData(rawData, universityName);

      console.log(`📋 STEP 2: Scraped requirements section`);
      console.log(`   - Raw requirements text: ${universityData.essay_requirements.raw_text || 'Not found'}`);
      console.log(`   - Additional content: ${universityData.additional_info.essay_advice ? 'Found' : 'Not found'}`);

      this.results.push(universityData);
      
      console.log(`✅ STEP 3: Scraping complete for ${universityName}`);
      
      return universityData;

    } catch (error) {
      console.error(`Error extracting data for ${universityName}:`, error.message);
      return {
        university_info: {
          college_name: universityName,
          school_program_type: "Undergraduate",
          university_url: universityUrl,
          error: error.message
        },
        prompts: [],
        essay_requirements: { how_many: "0" }
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape the main CEA supplemental essay guide page
   */
  async scrapeMainPage() {
    console.log('📚 Scraping College Essay Advisors main page...');
    
    const page = await this.browser.newPage();
    
    try {
      await page.goto('https://www.collegeessayadvisors.com/supplemental-essay-guide/', {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      // Wait for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      const universities = await page.evaluate(() => {
        const universityLinks = [];
        
        // Extract from the specific ul.supp-essays structure
        const universityList = document.querySelector('ul.supp-essays');
        if (universityList) {
          const links = universityList.querySelectorAll('li a');
          links.forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();
            
            if (href && text && href.includes('collegeessayadvisors.com')) {
              universityLinks.push({
                name: text,
                url: href
              });
            }
          });
        }

        return universityLinks;
      });

      console.log(`✓ Found ${universities.length} university links`);
      
      // Process universities in batches for better performance
      const batchSize = 10;
      const delayBetweenBatches = 5000;
      
      console.log(`\n🚀 Starting to scrape ${universities.length} universities in batches of ${batchSize}`);
      
      for (let i = 0; i < universities.length; i += batchSize) {
        const batch = universities.slice(i, i + batchSize);
        const batchNumber = Math.floor(i/batchSize) + 1;
        const totalBatches = Math.ceil(universities.length/batchSize);
        
        console.log(`\n📦 BATCH ${batchNumber}/${totalBatches}: Processing ${batch.length} universities`);
        console.log(`   Universities in this batch:`);
        batch.forEach((uni, idx) => console.log(`   ${idx + 1}. ${uni.name}`));
        
        // Process batch concurrently (with limit)
        const promises = batch.map(async (university, index) => {
          // Stagger requests within batch
          await new Promise(resolve => setTimeout(resolve, index * 1000));
          return this.extractUniversityData(university.name, university.url);
        });
        
        await Promise.allSettled(promises);
        
        // Delay between batches
        if (i + batchSize < universities.length) {
          console.log(`\n⏳ Waiting ${delayBetweenBatches/1000}s before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      
      console.log(`\n🎉 All batches completed! Processed ${universities.length} universities total.`);

    } catch (error) {
      console.error('Error scraping main CEA page:', error.message);
    } finally {
      await page.close();
    }
  }

  /**
   * Process raw data extracted from browser context
   */
  processRawData(rawData, universityName) {
    const universityData = {
      university_info: rawData.university_info,
      essay_requirements: {
        how_many: null,
        selection_type: "required",
        total_word_limit: null,
        deadline: null,
        application_platform: "Common Application",
        raw_text: rawData.essay_requirements.raw_text,
        essay_types: rawData.essay_requirements.essay_types
      },
      prompts: [],
      additional_info: rawData.additional_info
    };

    // Process requirements text to extract structured data
    if (rawData.essay_requirements.raw_text) {
      const requirementsText = rawData.essay_requirements.raw_text;
      
      // Extract number of essays
      const essayCountMatch = requirementsText.match(/(\d+)\s+essays?/i);
      if (essayCountMatch) {
        universityData.essay_requirements.how_many = essayCountMatch[1];
      }
      
      // Extract word limit
      const wordLimitMatch = requirementsText.match(/(\d+)\s+words?\s+or\s+fewer/i);
      if (wordLimitMatch) {
        universityData.essay_requirements.total_word_limit = wordLimitMatch[1] + ' words or fewer';
      }
    }

    // Process raw prompts and apply business logic
    rawData.raw_prompts.forEach((rawPrompt, index) => {
      const processedPrompt = {
        prompt_number: rawPrompt.prompt_number,
        title: `Prompt ${rawPrompt.prompt_number}`,
        prompt: rawPrompt.text,
        word_limit: universityData.essay_requirements.total_word_limit || 'Not specified',
        selection_type: 'required',
        prompt_selection_type: 'required',
        category: this.categorizePrompt(rawPrompt.text),
        prompt_type: 'supplemental',
        difficulty_level: this.assessDifficulty(rawPrompt.text),
        common_themes: this.extractThemes(rawPrompt.text),
        tips: [],
        source: rawPrompt.source
      };

      universityData.prompts.push(processedPrompt);
    });

    // Update essay requirements based on processed prompts
    universityData.essay_requirements.how_many = universityData.prompts.length.toString();
    universityData.essay_requirements.total_word_limit = this.extractTotalWordLimit(universityData.prompts);

    return universityData;
  }

  /**
   * Categorize prompt based on content
   */
  categorizePrompt(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('diversity') || lowerText.includes('contribute')) {
      return 'diversity_contribution';
    }
    if (lowerText.includes('intellectual') || lowerText.includes('learning')) {
      return 'intellectual_curiosity';
    }
    if (lowerText.includes('challenge') || lowerText.includes('obstacle')) {
      return 'challenge';
    }
    if (lowerText.includes('leadership') || lowerText.includes('leader')) {
      return 'leadership';
    }
    if (lowerText.includes('community') || lowerText.includes('service')) {
      return 'community_service';
    }
    if (lowerText.includes('future') || lowerText.includes('goal')) {
      return 'future_goals';
    }
    if (lowerText.includes('personal') || lowerText.includes('yourself')) {
      return 'personal_introduction';
    }
    
    return 'general';
  }

  /**
   * Assess difficulty level of prompt
   */
  assessDifficulty(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('reflect') || lowerText.includes('analyze') || lowerText.includes('evaluate')) {
      return 'high';
    }
    if (lowerText.includes('describe') || lowerText.includes('explain') || lowerText.includes('tell')) {
      return 'medium';
    }
    
    return 'medium';
  }

  /**
   * Extract common themes from prompt text
   */
  extractThemes(text) {
    const themes = [];
    const lowerText = text.toLowerCase();
    
    const themeKeywords = {
      'diversity': ['diverse', 'diversity', 'different', 'unique'],
      'leadership': ['lead', 'leader', 'leadership', 'initiative'],
      'community': ['community', 'service', 'volunteer', 'help'],
      'academic': ['academic', 'learning', 'study', 'research'],
      'personal': ['personal', 'yourself', 'identity', 'background'],
      'challenge': ['challenge', 'obstacle', 'difficulty', 'struggle'],
      'future': ['future', 'goal', 'plan', 'aspiration']
    };

    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        themes.push(theme);
      }
    });

    return themes;
  }

  /**
   * Extract total word limit from prompts
   */
  extractTotalWordLimit(prompts) {
    const limits = prompts.map(p => p.word_limit).filter(Boolean);
    if (limits.length === 0) return 'Not specified';
    
    // Try to find a range or use the most common limit
    const ranges = limits.filter(limit => limit.includes('-'));
    if (ranges.length > 0) {
      return ranges[0];
    }
    
    return limits[0];
  }

  /**
   * Save results in the format compatible with your database
   */
  async saveResults() {
    const outputDir = path.join(__dirname, '../data');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save in your database format
    const databaseFormat = {
      scraping_metadata: {
        source_website: "https://www.collegeessayadvisors.com/supplemental-essay-guide/",
        scraped_at: new Date().toISOString(),
        scraper_version: "1.0.0",
        total_universities_found: this.results.length
      },
      universities: this.results,
      scraping_statistics: this.generateStatistics()
    };

    const filepath = path.join(outputDir, `cea-supplemental-essays-${timestamp}.json`);
    await fs.writeJson(filepath, databaseFormat, { spaces: 2 });
    
    console.log(`✓ Results saved to: ${filepath}`);
    
    // Also save in flat format for easy database import
    const flatFormat = this.convertToFlatFormat();
    const flatFilepath = path.join(outputDir, `cea-flat-format-${timestamp}.json`);
    await fs.writeJson(flatFilepath, flatFormat, { spaces: 2 });
    
    console.log(`✓ Flat format saved to: ${flatFilepath}`);
  }

  /**
   * Convert to flat format compatible with your essay_prompts table
   */
  convertToFlatFormat() {
    const flatPrompts = [];
    
    this.results.forEach(university => {
      university.prompts.forEach(prompt => {
        flatPrompts.push({
          college_name: university.university_info.college_name,
          how_many: university.essay_requirements.how_many,
          selection_type: university.essay_requirements.selection_type,
          prompt_number: prompt.prompt_number,
          prompt: prompt.prompt,
          word_limit: prompt.word_limit,
          prompt_selection_type: prompt.prompt_selection_type,
          school_program_type: university.university_info.school_program_type,
          // Additional fields for enhanced data
          title: prompt.title,
          category: prompt.category,
          difficulty_level: prompt.difficulty_level,
          common_themes: prompt.common_themes,
          university_url: university.university_info.university_url,
          acceptance_rate: university.university_info.acceptance_rate,
          scraped_at: new Date().toISOString()
        });
      });
    });
    
    return flatPrompts;
  }

  /**
   * Generate scraping statistics
   */
  generateStatistics() {
    const totalPrompts = this.results.reduce((sum, uni) => sum + uni.prompts.length, 0);
    const categories = {};
    const difficultyLevels = {};
    
    this.results.forEach(university => {
      university.prompts.forEach(prompt => {
        categories[prompt.category] = (categories[prompt.category] || 0) + 1;
        difficultyLevels[prompt.difficulty_level] = (difficultyLevels[prompt.difficulty_level] || 0) + 1;
      });
    });
    
    return {
      total_universities_scraped: this.results.length,
      total_prompts_collected: totalPrompts,
      average_prompts_per_university: Math.round(totalPrompts / this.results.length * 100) / 100,
      prompt_categories: categories,
      difficulty_levels: difficultyLevels
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Run the complete scraping process
   */
  async run() {
    console.log('🚀 Starting College Essay Advisors Scraping');
    console.log('==========================================\n');
    
    try {
      await this.initialize();
      await this.scrapeMainPage();
      await this.saveResults();
      
      console.log('\n📊 Scraping Summary:');
      console.log(`Total Universities: ${this.results.length}`);
      console.log(`Total Prompts: ${this.results.reduce((sum, uni) => sum + uni.prompts.length, 0)}`);
      
    } catch (error) {
      console.error('❌ CEA scraping failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const extractor = new CollegeEssayAdvisorsExtractor();
  extractor.run().catch(console.error);
}

export default CollegeEssayAdvisorsExtractor;

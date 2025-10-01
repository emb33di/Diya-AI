import CollegeEssayAdvisorsExtractor from './src/collegeEssayAdvisorsExtractor.js';
import EssayPromptTransformAgent from './ai-transform-agent.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Targeted scraper that only processes schools already in the school list
 * Matches schools from undergraduate-schools.json with CEA data
 */
class TargetedSchoolScraper {
  constructor() {
    this.extractor = new CollegeEssayAdvisorsExtractor();
    this.aiAgent = new EssayPromptTransformAgent();
    this.schoolsList = [];
    this.matchedSchools = [];
    this.results = [];
  }

  /**
   * Load and process the school list from undergraduate-schools.json
   */
  async loadSchoolList() {
    console.log('📋 Loading school list from undergraduate-schools.json...');
    
    const schoolListPath = path.join(__dirname, '../public/undergraduate-schools.json');
    const schoolData = await fs.readJson(schoolListPath);
    
    this.schoolsList = schoolData.schools.map(school => ({
      name: school.name,
      city: school.city,
      state: school.state,
      country: school.country,
      website_url: school.website_url,
      ranking: school.ranking
    }));
    
    console.log(`✅ Loaded ${this.schoolsList.length} schools from your list`);
    
    // Log first few schools for verification
    console.log('\n📝 Sample schools from your list:');
    this.schoolsList.slice(0, 5).forEach((school, index) => {
      console.log(`   ${index + 1}. ${school.name} (${school.city}, ${school.state})`);
    });
    
    return this.schoolsList;
  }

  /**
   * Scrape the CEA main page to get available universities
   */
  async getAvailableCEASchools() {
    console.log('\n🌐 Scraping College Essay Advisors for available schools...');
    
    await this.extractor.initialize();
    
    const page = await this.extractor.browser.newPage();
    
    try {
      await page.goto('https://www.collegeessayadvisors.com/supplemental-essay-guide/', {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      // Wait for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      const ceaSchools = await page.evaluate(() => {
        const universityLinks = [];
        
        // Extract from the search-filter-results div (updated structure)
        const universityList = document.querySelector('div.search-filter-results');
        if (universityList) {
          const links = universityList.querySelectorAll('a');
          links.forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();
            
            // Extract university name from the link text (remove "2025-26 Supplemental Essay Prompt Guide" etc.)
            const universityName = text.replace(/\s+\d{4}-\d{2}\s+Supplemental Essay Prompt Guide.*$/, '').trim();
            
            if (href && universityName && href.includes('collegeessayadvisors.com') && universityName.length > 0) {
              universityLinks.push({
                name: universityName,
                url: href
              });
            }
          });
        }

        return universityLinks;
      });

      console.log(`✅ Found ${ceaSchools.length} schools available on CEA`);
      
      // Log first few CEA schools for verification
      console.log('\n📝 Sample schools from CEA:');
      ceaSchools.slice(0, 5).forEach((school, index) => {
        console.log(`   ${index + 1}. ${school.name}`);
      });
      
      return ceaSchools;

    } catch (error) {
      console.error('❌ Error scraping CEA main page:', error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Match schools from your list with available CEA schools
   */
  matchSchools(yourSchools, ceaSchools) {
    console.log('\n🔍 Matching schools from your list with CEA availability...');
    
    const matches = [];
    const unmatched = [];
    
    for (const yourSchool of yourSchools) {
      // Try exact match first
      let match = ceaSchools.find(ceaSchool => 
        ceaSchool.name.toLowerCase() === yourSchool.name.toLowerCase()
      );
      
      // Try partial match if exact match fails
      if (!match) {
        match = ceaSchools.find(ceaSchool => {
          const yourName = yourSchool.name.toLowerCase();
          const ceaName = ceaSchool.name.toLowerCase();
          
          // Check if your school name is contained in CEA name or vice versa
          return yourName.includes(ceaName) || ceaName.includes(yourName) ||
                 // Handle common variations
                 yourName.replace(/university|college|institute|school/gi, '').trim() === 
                 ceaName.replace(/university|college|institute|school/gi, '').trim();
        });
      }
      
      if (match) {
        matches.push({
          yourSchool,
          ceaSchool: match,
          matchType: 'matched'
        });
      } else {
        unmatched.push({
          yourSchool,
          matchType: 'unmatched'
        });
      }
    }
    
    this.matchedSchools = matches;
    
    console.log(`✅ Found ${matches.length} matches out of ${yourSchools.length} schools`);
    console.log(`❌ ${unmatched.length} schools not available on CEA`);
    
    if (matches.length > 0) {
      console.log('\n🎯 Matched schools:');
      matches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.yourSchool.name} → ${match.ceaSchool.name}`);
      });
    }
    
    if (unmatched.length > 0) {
      console.log('\n❌ Unmatched schools (not available on CEA):');
      unmatched.forEach((unmatch, index) => {
        console.log(`   ${index + 1}. ${unmatch.yourSchool.name}`);
      });
    }
    
    return { matches, unmatched };
  }

  /**
   * Scrape essay prompts for matched schools only
   */
  async scrapeMatchedSchools() {
    if (this.matchedSchools.length === 0) {
      console.log('⚠️  No matched schools to scrape');
      return;
    }
    
    console.log(`\n🎓 Starting to scrape ${this.matchedSchools.length} matched schools...`);
    
    const batchSize = 5; // Smaller batches for targeted scraping
    const delayBetweenBatches = 3000;
    
    for (let i = 0; i < this.matchedSchools.length; i += batchSize) {
      const batch = this.matchedSchools.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(this.matchedSchools.length/batchSize);
      
      console.log(`\n📦 BATCH ${batchNumber}/${totalBatches}: Processing ${batch.length} schools`);
      console.log(`   Schools in this batch:`);
      batch.forEach((match, idx) => console.log(`   ${idx + 1}. ${match.yourSchool.name}`));
      
      // Process batch concurrently (with limit)
      const promises = batch.map(async (match, index) => {
        // Stagger requests within batch
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        
        console.log(`\n🎓 Scraping: ${match.yourSchool.name}`);
        console.log(`📍 CEA URL: ${match.ceaSchool.url}`);
        
        return this.extractor.extractUniversityData(match.yourSchool.name, match.ceaSchool.url);
      });
      
      const batchResults = await Promise.allSettled(promises);
      
      // Process results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
          console.log(`✅ Successfully scraped: ${batch[index].yourSchool.name}`);
        } else {
          console.error(`❌ Failed to scrape: ${batch[index].yourSchool.name} - ${result.reason?.message}`);
        }
      });
      
      // Delay between batches
      if (i + batchSize < this.matchedSchools.length) {
        console.log(`\n⏳ Waiting ${delayBetweenBatches/1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    console.log(`\n🎉 Scraping completed! Processed ${this.results.length} schools successfully.`);
  }

  /**
   * Transform scraped data using AI (optional)
   */
  async transformWithAI() {
    if (this.results.length === 0) {
      console.log('⚠️  No scraped data to transform');
      return null;
    }
    
    // Check if Google API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.log('\n⚠️  GOOGLE_API_KEY not found - skipping AI transformation');
      console.log('📁 Raw scraped data will be saved without AI processing');
      return await this.saveRawData();
    }
    
    console.log('\n🤖 Transforming scraped data with AI...');
    
    // Safety check: Ensure we never overwrite existing prompts file
    const existingPromptsPath = path.join(__dirname, '../public/undergrad_essay_prompts.json');
    console.log(`🔒 Safety check: Will NOT overwrite existing prompts file at ${existingPromptsPath}`);
    
    // Create the data structure for AI transformation
    const scrapedData = {
      extraction_metadata: {
        source: "College Essay Advisors",
        extraction_date: new Date().toISOString(),
        total_universities_processed: this.results.length,
        format_version: "1.0",
        purpose: "AI processing to create essay prompts JSON for targeted schools"
      },
      universities: this.results.map(result => ({
        university_url: result.university_info.university_url,
        requirements: {
          raw_text: result.essay_requirements.raw_text,
          how_many_essays: result.essay_requirements.how_many,
          word_limit: result.essay_requirements.total_word_limit,
          essay_types: result.essay_requirements.essay_types
        },
        essay_prompts: result.prompts.map(prompt => ({
          prompt_number: prompt.prompt_number,
          prompt_text: prompt.prompt,
          word_limit: prompt.word_limit,
          category: prompt.category,
          themes: prompt.common_themes
        }))
      }))
    };
    
    // Save intermediate data
    const outputDir = path.join(__dirname, 'data');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const intermediateFile = path.join(outputDir, `cea-targeted-scraped-data-${timestamp}.json`);
    await fs.writeJson(intermediateFile, scrapedData, { spaces: 2 });
    
    console.log(`💾 Intermediate data saved to: ${intermediateFile}`);
    
    // Process in smaller batches to avoid API limits
    const batchSize = 5; // Process 5 universities at a time
    const allTransformedPrompts = [];
    
    for (let i = 0; i < scrapedData.universities.length; i += batchSize) {
      const batch = scrapedData.universities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(scrapedData.universities.length / batchSize);
      
      console.log(`\n📦 Processing AI batch ${batchNumber}/${totalBatches} (${batch.length} universities)...`);
      
      try {
        const batchData = {
          ...scrapedData,
          universities: batch,
          extraction_metadata: {
            ...scrapedData.extraction_metadata,
            total_universities_processed: batch.length,
            purpose: `AI transformation batch ${batchNumber}/${totalBatches}`
          }
        };
        
        const transformedBatch = await this.aiAgent.transformScrapedData(batchData);
        if (transformedBatch && transformedBatch.essay_prompts) {
          allTransformedPrompts.push(...transformedBatch.essay_prompts);
          console.log(`✅ Batch ${batchNumber} completed: ${transformedBatch.essay_prompts.length} prompts`);
        }
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < scrapedData.universities.length) {
          console.log('⏳ Waiting 2s before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, error.message);
        console.log('⚠️  Continuing with remaining batches...');
      }
    }
    
    if (allTransformedPrompts.length === 0) {
      console.log('❌ No prompts were successfully transformed. Saving raw data instead.');
      return await this.saveRawData();
    }
    
    // Create final transformed data structure
    const finalTransformedData = {
      essay_prompts: allTransformedPrompts
    };
    
    // Save final transformed data with a unique name to avoid overwriting existing files
    const finalFile = path.join(outputDir, `cea-targeted-essay-prompts-${timestamp}.json`);
    await fs.writeJson(finalFile, finalTransformedData, { spaces: 2 });
    
    console.log(`\n🎉 AI transformation completed successfully!`);
    console.log(`📁 Final essay prompts file: ${finalFile}`);
    console.log(`📊 Total prompts generated: ${allTransformedPrompts.length}`);
    
    return finalFile;
  }

  /**
   * Save raw scraped data without AI transformation
   */
  async saveRawData() {
    console.log('\n💾 Saving raw scraped data...');
    
    // Create the data structure for raw output
    const rawData = {
      extraction_metadata: {
        source: "College Essay Advisors",
        extraction_date: new Date().toISOString(),
        total_universities_processed: this.results.length,
        format_version: "1.0",
        purpose: "Raw scraped data without AI transformation",
        note: "To transform this data, set GOOGLE_API_KEY and run the AI transformation"
      },
      universities: this.results.map(result => ({
        university_info: result.university_info,
        essay_requirements: result.essay_requirements,
        prompts: result.prompts,
        additional_info: result.additional_info
      }))
    };
    
    // Save raw data
    const outputDir = path.join(__dirname, 'data');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawFile = path.join(outputDir, `cea-targeted-raw-data-${timestamp}.json`);
    await fs.writeJson(rawFile, rawData, { spaces: 2 });
    
    console.log(`✅ Raw data saved to: ${rawFile}`);
    console.log(`📊 Summary:`);
    console.log(`   - Schools processed: ${this.results.length}`);
    console.log(`   - Total prompts: ${this.results.reduce((sum, school) => sum + (school.prompts?.length || 0), 0)}`);
    
    return rawFile;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport() {
    console.log('\n📊 TARGETED SCRAPING SUMMARY REPORT');
    console.log('=====================================');
    console.log(`📋 Total schools in your list: ${this.schoolsList.length}`);
    console.log(`🎯 Schools matched with CEA: ${this.matchedSchools.length}`);
    console.log(`✅ Schools successfully scraped: ${this.results.length}`);
    console.log(`❌ Schools not available on CEA: ${this.schoolsList.length - this.matchedSchools.length}`);
    
    if (this.results.length > 0) {
      const totalPrompts = this.results.reduce((sum, school) => sum + (school.prompts?.length || 0), 0);
      console.log(`📝 Total essay prompts extracted: ${totalPrompts}`);
      console.log(`📊 Average prompts per school: ${(totalPrompts / this.results.length).toFixed(1)}`);
    }
    
    console.log('\n🎯 Successfully processed schools:');
    this.results.forEach((school, index) => {
      const promptCount = school.prompts?.length || 0;
      console.log(`   ${index + 1}. ${school.university_info.college_name} (${promptCount} prompts)`);
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.extractor.cleanup();
  }

  /**
   * Run the complete targeted scraping process
   */
  async run() {
    console.log('🚀 TARGETED SCHOOL SCRAPER');
    console.log('==========================');
    console.log('This script will only scrape schools that are already in your school list.\n');
    
    try {
      // Step 1: Load your school list
      await this.loadSchoolList();
      
      // Step 2: Get available CEA schools
      const ceaSchools = await this.getAvailableCEASchools();
      
      // Step 3: Match schools
      const { matches, unmatched } = this.matchSchools(this.schoolsList, ceaSchools);
      
      if (matches.length === 0) {
        console.log('\n⚠️  No schools from your list are available on CEA. Exiting.');
        return;
      }
      
      // Step 4: Scrape matched schools
      await this.scrapeMatchedSchools();
      
      // Step 5: Transform with AI
      const finalFile = await this.transformWithAI();
      
      // Step 6: Generate summary
      this.generateSummaryReport();
      
      if (finalFile) {
        console.log(`\n🎉 TARGETED SCRAPING COMPLETED SUCCESSFULLY!`);
        console.log(`📁 Final essay prompts file: ${finalFile}`);
        console.log(`\n💡 Next steps:`);
        console.log(`   1. Review the generated essay prompts`);
        console.log(`   2. Import the data into your database if needed`);
        console.log(`   3. Update your application with the new prompts`);
      }
      
    } catch (error) {
      console.error('❌ Targeted scraping failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  // Check for API key
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY environment variable is required');
    console.log('Please set it with: export GOOGLE_API_KEY="your-api-key"');
    process.exit(1);
  }

  const scraper = new TargetedSchoolScraper();
  
  try {
    await scraper.run();
  } catch (error) {
    console.error('❌ Targeted scraping failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default TargetedSchoolScraper;

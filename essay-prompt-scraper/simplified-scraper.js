import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RobustEssayPromptScraper {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  slug(text) {
    return text.trim().toLowerCase()
      .replace(/[^0-9a-zA-Z\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
  }

  async parsePrompts(url, school, year) {
    console.log(`\n🎓 Scraping ${school} essay prompts...`);
    console.log(`📍 URL: ${url}`);

    const page = await this.browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const prompts = await page.evaluate(() => {
        // Utility functions
        function cleanString(s) {
          return (s || '').replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        }
        
        function slug(text) {
          return text.trim().toLowerCase()
            .replace(/[^0-9a-zA-Z\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);
        }

        function isProgramHeading(txt) {
          return /\bcollege\b|\bschool\b|\bdivision\b|\bmajor\b|\btrack\b/i.test(txt) && txt.length < 100;
        }

        // Enhanced word limit detection with comprehensive regex patterns
        function getWordLimit(text) {
          if (!text) return null;
          
          const patterns = [
            /(\d{2,4})\s*words?/i,
            /max\.?\s*(\d{2,4})\s*words?/i,
            /limit(ed)?\s*to\s*(\d{2,4})\s*words?/i,
            /(\d{2,4})\s*word\s*limit/i,
            /maximum\s*(\d{2,4})\s*words?/i,
            /up\s*to\s*(\d{2,4})\s*words?/i
          ];
          
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
              return parseInt(match[1] || match[2]);
            }
          }
          return null;
        }

        // Check if text contains actionable instruction
        function isActionableInstruction(text) {
          const instructionPatterns = [
            /^(describe|tell us|why|share|write|explain|discuss|reflect|analyze)/i,
            /\?$/,
            /^(choose|select|pick)/i,
            /(essay|prompt|question|response)/i,
            /how does the university/i,
            /if you could uninvent/i,
            /the penny is on its way/i,
            /from michelin/i,
            /statistically speaking/i,
            /choose your own adventure/i,
            /in an ideal world/i,
            /left can mean remaining/i
          ];
          
          return instructionPatterns.some(pattern => pattern.test(text));
        }

        // Check if text is commentary/advice (to filter out)
        function isCommentary(text) {
          const commentaryPatterns = [
            /tips?|advice|analysis|our take|guidance/i,
            /how to write|writing tips|essay tips/i,
            /inspired by|class of|contact us/i,
            /supplemental essay|optional essay/i,
            /facebook|twitter|instagram|youtube|linkedin/i,
            /img src|alt=|width=|height=/i,
            /one-on-one advising|common app essay guide/i,
            /school stats|acceptance rate|undergrad population/i,
            /want free stuff|sign up for free/i,
            /view all posts by|about kat stubing/i,
            /we thought you might|cea parent/i,
            /document\.getElementById|ak_js_/i
          ];
          
          return commentaryPatterns.some(pattern => pattern.test(text)) || text.length > 500;
        }

        // Extract "choose X" pattern
        function extractChoosePattern(text) {
          const patterns = [
            /choose\s*(\d+)\s*(of)?/i,
            /select\s*(\d+)\s*(of)?/i,
            /pick\s*(\d+)\s*(of)?/i
          ];
          
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return parseInt(match[1]);
          }
          return 1;
        }

        // 1. Pull All Potential Prompt Elements - Focus on main content area
        const mainContent = document.querySelector('main') || 
                          document.querySelector('.entry-content') || 
                          document.querySelector('article') || 
                          document.querySelector('.post-content') ||
                          document.body;
        
        const allElements = [];
        const walker = document.createTreeWalker(
          mainContent,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: function(node) {
              const tagName = node.tagName.toLowerCase();
              const className = node.className.toLowerCase();
              const id = node.id.toLowerCase();
              
              // Skip navigation, footer, sidebar elements
              if (className.includes('nav') || className.includes('footer') || 
                  className.includes('sidebar') || className.includes('menu') ||
                  id.includes('nav') || id.includes('footer') || id.includes('sidebar')) {
                return NodeFilter.FILTER_SKIP;
              }
              
              if (['h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'p', 'div', 'li'].includes(tagName)) {
                return NodeFilter.FILTER_ACCEPT;
              }
              return NodeFilter.FILTER_SKIP;
            }
          }
        );

        let node;
        while (node = walker.nextNode()) {
          const text = cleanString(node.textContent);
          if (text && text.length > 5 && !isCommentary(text)) {
            allElements.push({
              element: node,
              tagName: node.tagName.toLowerCase(),
              text: text,
              isHeading: ['h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b'].includes(node.tagName.toLowerCase())
            });
          }
        }

        // 2. Identify Prompts Using Heuristics
        const potentialPrompts = [];
        let currentProgram = null;

        for (let i = 0; i < allElements.length; i++) {
          const element = allElements[i];
          const text = element.text;

          // Track program headings
          if (isProgramHeading(text)) {
            currentProgram = text;
            continue;
          }

          // Skip commentary
          if (isCommentary(text)) {
            continue;
          }

          // Check if this is a prompt heading or instruction
          const isPromptHeading = element.isHeading && (
            /question \d+|essay option \d+|required|optional|essay option|question|prompt|essay/i.test(text) ||
            isActionableInstruction(text)
          );

          // Check if this is a standalone prompt (UChicago format)
          const isStandalonePrompt = !element.isHeading && (
            isActionableInstruction(text) && text.length > 20 &&
            !text.match(/^think of this|^this prompt allows|^this open-ended|^a highly philosophical|^option \d+ serves|^a great prompt|^this is a great/i)
          );

          // Special case for UChicago: Look for actual essay prompts that start with questions
          const isUChicagoPrompt = text.match(/^(how does|if you could|the penny|from michelin|statistically speaking|in an ideal world|left can mean)/i) && text.length > 50;

          if (isPromptHeading || isStandalonePrompt || isUChicagoPrompt) {
            // Look for word limit in current element and nearby elements
            let wordLimit = getWordLimit(text);
            let instructions = text;
            let promptText = text;

            // Check next few elements for word limit or additional instructions
            for (let j = i + 1; j < Math.min(i + 3, allElements.length); j++) {
              const nextElement = allElements[j];
              const nextText = nextElement.text;
              
              if (!wordLimit) {
                wordLimit = getWordLimit(nextText);
              }
              
              // If next element contains word limit info, include it in instructions
              if (nextText && /word|limit|max/i.test(nextText) && nextText.length < 100) {
                instructions += ' ' + nextText;
              }
            }

            potentialPrompts.push({
              text: promptText,
              instructions: instructions,
              wordLimit: wordLimit,
              program: currentProgram,
              isHeading: isPromptHeading,
              elementIndex: i
            });
          }
        }

        // 3. Detect and Extract Word Limits (already done above)
        // 4. Clean and Filter
        const cleanedPrompts = potentialPrompts.filter(prompt => {
          return !isCommentary(prompt.text) && 
                 prompt.text.length > 15 && 
                 !prompt.text.match(/^choose|^instructions|^required|^respond|^answer|^essay option|^question/i) &&
                 !prompt.text.match(/common app|university of california|university of texas|graduate essays/i);
        });

        // 5. Flexible Grouping
        const results = [];
        let currentGroup = null;
        let currentOptions = [];

        for (let i = 0; i < cleanedPrompts.length; i++) {
          const prompt = cleanedPrompts[i];
          const text = prompt.text.toLowerCase();

          // Check for grouping signals
          const hasChoosePattern = /choose|select|pick|option/i.test(prompt.text);
          const isNewQuestion = /question \d+|essay \d+|prompt \d+/i.test(prompt.text);

          if (hasChoosePattern || isNewQuestion) {
            // Save previous group if exists
            if (currentGroup) {
              if (currentOptions.length > 0) {
                currentGroup.type = currentOptions.length > 1 ? "choose_one" : "single";
                currentGroup.min_required = extractChoosePattern(currentGroup.instructions);
                currentGroup.options = currentOptions;
              }
              results.push(currentGroup);
            }

            // Start new group
            currentGroup = {
              id: slug(prompt.text + (prompt.program || '')),
              title: prompt.text,
              instructions: prompt.instructions,
              word_limit: prompt.wordLimit,
              required: true,
              type: "single",
              min_required: extractChoosePattern(prompt.text),
              ...(prompt.program ? { program: prompt.program } : {})
            };
            currentOptions = [];

            // Look for options following this instruction
            for (let j = i + 1; j < Math.min(i + 10, cleanedPrompts.length); j++) {
              const optionPrompt = cleanedPrompts[j];
              const optionText = optionPrompt.text.toLowerCase();

              // Stop if we hit another instruction/question
              if (/choose|select|question \d+|essay \d+|prompt \d+/i.test(optionText) && optionText !== prompt.text.toLowerCase()) {
                break;
              }

              // Add as option if it looks like a valid prompt
              if (optionPrompt.text.length > 20 && !isCommentary(optionPrompt.text)) {
                currentOptions.push({
                  id: slug(optionPrompt.text),
                  prompt: optionPrompt.text
                });
              }
            }
          } else {
            // Standalone prompt
            results.push({
              id: slug(prompt.text + (prompt.program || '')),
              title: prompt.text,
              instructions: prompt.instructions,
              word_limit: prompt.wordLimit,
              required: true,
              type: "single",
              prompt: prompt.text,
              ...(prompt.program ? { program: prompt.program } : {})
            });
          }
        }

        // Save the last group
        if (currentGroup) {
          if (currentOptions.length > 0) {
            currentGroup.type = currentOptions.length > 1 ? "choose_one" : "single";
            currentGroup.min_required = extractChoosePattern(currentGroup.instructions);
            currentGroup.options = currentOptions;
          }
          results.push(currentGroup);
        }

        // Deduplicate
        const seen = new Set();
        return results.filter(p => {
          const key = (p.prompt || p.title || '') + (p.program || '');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });

      const validPrompts = prompts.filter(p => (p.options && p.options.length > 0) || (p.prompt && p.prompt.length > 20));
      console.log(`✅ Extracted ${validPrompts.length} prompts for ${school}`);

      return {
        school,
        year,
        prompts: validPrompts
      };

    } catch (error) {
      console.error(`❌ Error scraping ${school}:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async processSchools(schools) {
    console.log(`🚀 Processing ${schools.length} schools...`);
    const results = [];
    for (const schoolData of schools) {
      try {
        const data = await this.parsePrompts(schoolData.url, schoolData.school, schoolData.year);
        results.push(data);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to process ${schoolData.school}:`, error.message);
        results.push({
          school: schoolData.school,
          year: schoolData.year,
          prompts: [],
          error: error.message
        });
      }
    }
    return results;
  }

  async saveResults(results, outputPath) {
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, results, { spaces: 2 });
    console.log(`\n💾 Results saved to: ${outputPath}`);
    // Summary
    const successful = results.filter(r => r.prompts && r.prompts.length > 0);
    const failed = results.filter(r => !r.prompts || r.prompts.length === 0);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successful: ${successful.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(`   📝 Total prompts: ${successful.reduce((sum, r) => sum + r.prompts.length, 0)}`);
    if (failed.length > 0) {
      console.log(`\n❌ Failed schools:`);
      failed.forEach(f => console.log(`   - ${f.school}: ${f.error || 'No prompts found'}`));
    }
  }
}

async function loadSchoolsConfig(configPath = './schools-config.json') {
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config.schools;
  } catch (error) {
    console.error('❌ Failed to load schools configuration:', error.message);
    process.exit(1);
  }
}

async function main() {
  const scraper = new RobustEssayPromptScraper();
  try {
    await scraper.initialize();
    const schools = await loadSchoolsConfig();
    console.log(`📚 Loaded ${schools.length} schools from configuration`);
    const results = await scraper.processSchools(schools);
    const outputPath = path.join(__dirname, 'data', `scraped-prompts-${Date.now()}.json`);
    await scraper.saveResults(results, outputPath);
    console.log('\n🎉 Scraping completed successfully!');
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default RobustEssayPromptScraper;

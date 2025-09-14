import requests
from bs4 import BeautifulSoup
import json
import re
import os
from typing import List, Dict, Any

def scrape_essay_prompts():
    """
    Scrape essay prompts from the International College Counselors website
    """
    url = "https://internationalcollegecounselors.com/in-the-essay/"
    
    try:
        # Send request with headers to mimic browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the accordion container
        accordion = soup.find('div', class_='su-accordion')
        if not accordion:
            print("Could not find accordion container")
            return []
        
        # Extract all spoiler elements (each represents a university or essay type)
        spoilers = accordion.find_all('div', class_='su-spoiler')
        
        results = []
        
        for spoiler in spoilers:
            # Get the title (school name)
            title_element = spoiler.find('div', class_='su-spoiler-title')
            if not title_element:
                continue
                
            school_name = title_element.get_text(strip=True)
            
            # Skip the general essay types (Common Application, Coalition Application)
            if any(keyword in school_name.lower() for keyword in ['common application', 'coalition application']):
                continue
            
            # Get the content (prompts)
            content_element = spoiler.find('div', class_='su-spoiler-content')
            if not content_element:
                continue
                
            prompts = content_element.get_text(strip=True)
            
            # Clean up the prompts text
            prompts = clean_prompts_text(prompts)
            
            results.append({
                "Name of School": school_name,
                "Prompts": prompts
            })
        
        # Save to JSON file in the same directory as the script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(script_dir, 'all_essay_prompts_2025.json')
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully scraped data for {len(results)} universities")
        print(f"Results saved to {output_file}")
        return results
        
    except requests.RequestException as e:
        print(f"Error fetching the webpage: {e}")
        return []
    except Exception as e:
        print(f"Error processing the webpage: {e}")
        return []

def clean_prompts_text(text: str) -> str:
    """
    Clean up the prompts text by removing extra whitespace and formatting
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove common prefixes that might appear in the content
    prefixes_to_remove = [
        'Supplemental Short Answer',
        'Writing Supplement',
        'Essay Questions',
        'Short Answer Questions',
        'Essay Prompts',
        'Writing Questions',
        'Short-Essay Prompts',
        'Supplemental Essays',
        'Supplemental Essay Prompts',
        'Application Essay Information',
        'Writing Supplements',
        'Short Answer Prompts',
        'Essay Prompt',
        'Writing Prompt',
        'Personal Insight Questions',
        'Short-Answer Question'
    ]
    
    for prefix in prefixes_to_remove:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    
    return text.strip()

if __name__ == "__main__":
    results = scrape_essay_prompts()
    print(f"Scraped {len(results)} universities") 
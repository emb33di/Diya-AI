// Template service to load and manage PDF templates from the templates folder
export interface TemplateDocument {
  id: string;
  title: string;
  description: string;
  category: 'essay' | 'resume' | 'lor';
  programType: 'MBA' | 'Masters' | 'Undergraduate' | 'Law' | 'PhD';
  type: string;
  school?: string;
  rating: number;
  url: string;
  thumbnail?: string;
  fileName: string;
  folderPath: string;
}

export interface TemplateIndex {
  templates: string[];
  lastUpdated: string;
}

// Function to extract metadata from filename and path
function extractMetadataFromPath(filePath: string): Partial<TemplateDocument> {
  const pathParts = filePath.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const fileNameWithoutExt = fileName.replace('.pdf', '');
  
  // Extract category from path
  const category = pathParts.includes('essays') ? 'essay' : 
                   pathParts.includes('resumes') ? 'resume' : 
                   pathParts.includes('LORs') ? 'lor' : 'essay';
  
  // Extract program type from path
  const programType = pathParts.includes('Undergraduate') ? 'Undergraduate' :
                     pathParts.includes('MBA') ? 'MBA' :
                     pathParts.includes('Masters') ? 'Masters' :
                     pathParts.includes('Law') ? 'Law' :
                     pathParts.includes('PhD') ? 'PhD' : 'Undergraduate';
  
  // Generate title from filename
  const title = fileNameWithoutExt
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
  
  // Extract school name if present
  const schoolMatch = fileNameWithoutExt.match(/(UChicago|University of California|Stanford|Harvard|MIT|Yale|Princeton|Columbia|Penn|Duke|Northwestern|Cornell|Brown|Rice|Vanderbilt|Washington|Georgetown|Emory|Carnegie Mellon|NYU|USC|UCLA|Berkeley|Michigan|Virginia|UNC|Wake Forest|Tufts|Brandeis|Northeastern|Boston University|Boston College|Tulane|Lehigh|RPI|Rensselaer|WPI|Worcester Polytechnic|Case Western|Ohio State|Penn State|Rutgers|Maryland|Florida|Georgia Tech|Georgia|Texas|Texas A&M|UT Austin|Rice|SMU|Baylor|TCU|Texas Tech|Arizona|Arizona State|Colorado|Colorado State|Utah|BYU|Oregon|Oregon State|Washington|Washington State|Montana|Idaho|Nevada|New Mexico|Oklahoma|Kansas|Nebraska|Iowa|Minnesota|Wisconsin|Illinois|Indiana|Purdue|Ohio|Kentucky|Tennessee|Alabama|Mississippi|Louisiana|Arkansas|Missouri|South Dakota|North Dakota|Wyoming|Alaska|Hawaii)/i);
  const school = schoolMatch ? schoolMatch[1] : undefined;
  
  // Generate description based on type and school, with special handling for LOR templates
  let description = '';
  if (category === 'lor') {
    // Custom descriptions for LOR templates based on filename
    if (fileNameWithoutExt.toLowerCase().includes('initial outreach')) {
      description = 'Use this template to reach out to your teacher to ask for a letter of recommendation. This is meant to be a formal request over email, if they need one.';
    } else if (fileNameWithoutExt.toLowerCase().includes('follow-up after they agree')) {
      description = 'If your teacher agrees to write you a letter of recommendation, you will need to guide them on next steps and how to write an effective letter for you. This requires providing them with solid information about you and your achievements.';
    } else if (fileNameWithoutExt.toLowerCase().includes('check in email')) {
      description = 'It has been a few weeks since you asked for the letter, now is the time for a gentle reminder';
    } else if (fileNameWithoutExt.toLowerCase().includes('submission instructions')) {
      description = 'Now that you know the teacher has started writing or has finished, it is time to give them instructions on exactly how to submit. These may vary for Common App, UCAS, or Canadian schools, so be sure to research before sending!';
    } else {
      description = `A successful ${category} template for ${programType} applications`;
    }
  } else {
    description = school ? 
      `A successful ${category} example for ${school} applications` :
      `A successful ${category} template for ${programType} applications`;
  }
  
  // Determine type based on filename patterns
  let type = 'Essay';
  if (fileNameWithoutExt.toLowerCase().includes('supplement')) {
    type = 'Essay Supplement';
  } else if (fileNameWithoutExt.toLowerCase().includes('personal statement')) {
    type = 'Personal Statement';
  } else if (fileNameWithoutExt.toLowerCase().includes('common app')) {
    type = 'Common App Essay';
  } else if (fileNameWithoutExt.toLowerCase().includes('creative')) {
    type = 'Creative Essay';
  } else if (fileNameWithoutExt.toLowerCase().includes('why')) {
    type = 'Why School Essay';
  } else if (fileNameWithoutExt.toLowerCase().includes('diversity')) {
    type = 'Diversity Essay';
  } else if (fileNameWithoutExt.toLowerCase().includes('leadership')) {
    type = 'Leadership Essay';
  } else if (fileNameWithoutExt.toLowerCase().includes('challenge')) {
    type = 'Challenge Essay';
  } else if (fileNameWithoutExt.toLowerCase().includes('resume')) {
    type = 'Resume Template';
  } else if (fileNameWithoutExt.toLowerCase().includes('lor')) {
    type = 'Letter of Recommendation';
  }
  
  return {
    title,
    description,
    category,
    programType,
    type,
    school,
    rating: 4.5 + Math.random() * 0.5, // Random rating between 4.5-5.0
    fileName,
    folderPath: filePath
  };
}

// Function to load a single template file metadata
export async function loadTemplateMetadata(filePath: string): Promise<TemplateDocument | null> {
  try {
    // Extract metadata from the file path
    const metadata = extractMetadataFromPath(filePath);
    
    // Generate URL for the template
    const url = `/templates/${filePath}`;
    
    // Generate unique ID from file path
    const id = filePath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    const template: TemplateDocument = {
      id,
      title: metadata.title || 'Untitled Template',
      description: metadata.description || 'A successful template example',
      category: metadata.category || 'essay',
      programType: metadata.programType || 'Undergraduate',
      type: metadata.type || 'Essay',
      school: metadata.school,
      rating: metadata.rating || 4.5,
      url,
      fileName: metadata.fileName || '',
      folderPath: filePath
    };
    
    return template;
  } catch (error) {
    console.error(`Error loading template metadata for ${filePath}:`, error);
    return null;
  }
}

// Function to load all templates from the index
export async function loadAllTemplates(): Promise<TemplateDocument[]> {
  try {
    // Get list of available template files
    const response = await fetch('/templates/index.json');
    if (!response.ok) {
      console.warn('Templates index not found, falling back to hardcoded templates');
      return getHardcodedTemplates();
    }
    
    const templateIndex: TemplateIndex = await response.json();
    const templates: TemplateDocument[] = [];
    
    // Load metadata for each template
    for (const filePath of templateIndex.templates) {
      const template = await loadTemplateMetadata(filePath);
      if (template) {
        templates.push(template);
      }
    }
    
    // Sort by category, then by program type, then by custom order for LOR templates
    return templates.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      if (a.programType !== b.programType) {
        return a.programType.localeCompare(b.programType);
      }
      
      // Custom ordering for LOR templates
      if (a.category === 'lor' && b.category === 'lor') {
        const lorOrder = [
          'Initial Outreach Email Template',
          'Follow-up After They Agree',
          'Check In Email',
          'Submission Instructions Email'
        ];
        
        const aIndex = lorOrder.findIndex(title => {
          const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
          return a.title.toLowerCase().replace(/\s+/g, '').includes(normalizedTitle) ||
                 a.fileName.toLowerCase().replace(/\s+/g, '').includes(normalizedTitle);
        });
        const bIndex = lorOrder.findIndex(title => {
          const normalizedTitle = title.toLowerCase().replace(/\s+/g, '');
          return b.title.toLowerCase().replace(/\s+/g, '').includes(normalizedTitle) ||
                 b.fileName.toLowerCase().replace(/\s+/g, '').includes(normalizedTitle);
        });
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
      }
      
      return a.title.localeCompare(b.title);
    });
  } catch (error) {
    console.error('Error loading templates:', error);
    return getHardcodedTemplates();
  }
}

// Fallback hardcoded templates (current implementation)
function getHardcodedTemplates(): TemplateDocument[] {
  return [
    {
      id: 'uchicago-essay',
      title: 'UChicago Essay Supplement',
      description: 'A successful essay supplement for University of Chicago applications',
      category: 'essay',
      programType: 'Undergraduate',
      type: 'Essay Supplement',
      school: 'University of Chicago',
      rating: 4.8,
      url: '/templates/essays/Undergraduate/UChicago%20Essay%20Supplement.pdf',
      fileName: 'UChicago Essay Supplement.pdf',
      folderPath: 'essays/Undergraduate/UChicago Essay Supplement.pdf'
    },
    {
      id: 'common-app-response-1',
      title: 'Common App Response 1',
      description: 'A successful Common Application essay example',
      category: 'essay',
      programType: 'Undergraduate',
      type: 'Common App Essay',
      school: undefined,
      rating: 4.7,
      url: '/templates/essays/Undergraduate/Common%20App%20Response%201.pdf',
      fileName: 'Common App Response 1.pdf',
      folderPath: 'essays/Undergraduate/Common App Response 1.pdf'
    },
    {
      id: 'uc-creative-essay',
      title: 'University of California Creative Essay',
      description: 'A successful creative essay example for University of California applications',
      category: 'essay',
      programType: 'Undergraduate',
      type: 'Creative Essay',
      school: 'University of California',
      rating: 4.6,
      url: '/templates/essays/Undergraduate/University%20of%20California%20Creative%20Essay.pdf',
      fileName: 'University of California Creative Essay.pdf',
      folderPath: 'essays/Undergraduate/University of California Creative Essay.pdf'
    }
  ];
}

// Function to generate templates index (for build scripts)
export function generateTemplatesIndex(templatePaths: string[]): string {
  const index: TemplateIndex = {
    templates: templatePaths,
    lastUpdated: new Date().toISOString()
  };
  return JSON.stringify(index, null, 2);
}

// Function to get templates by category
export async function getTemplatesByCategory(category: 'essay' | 'resume' | 'lor'): Promise<TemplateDocument[]> {
  const allTemplates = await loadAllTemplates();
  return allTemplates.filter(template => template.category === category);
}

// Function to get templates by program type
export async function getTemplatesByProgramType(programType: string): Promise<TemplateDocument[]> {
  const allTemplates = await loadAllTemplates();
  return allTemplates.filter(template => template.programType === programType);
}

// Function to search templates
export async function searchTemplates(query: string): Promise<TemplateDocument[]> {
  const allTemplates = await loadAllTemplates();
  const lowercaseQuery = query.toLowerCase();
  
  return allTemplates.filter(template => 
    template.title.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.school?.toLowerCase().includes(lowercaseQuery) ||
    template.type.toLowerCase().includes(lowercaseQuery)
  );
}

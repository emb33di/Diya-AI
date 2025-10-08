# Automatic Template Discovery System

This system automatically discovers and displays PDF templates from the `public/templates` folder without requiring manual code updates.

## How It Works

### 1. Template Service (`src/services/templateService.ts`)
- Automatically loads templates from the `public/templates/index.json` file
- Extracts metadata from file paths (title, category, program type, school, etc.)
- Provides fallback templates if the index is not available
- Supports filtering by category, program type, and search functionality

### 2. Template Index (`public/templates/index.json`)
- Maintains a list of all available PDF templates
- Automatically updated when new PDFs are added
- Includes timestamp for tracking when templates were last updated

### 3. Build Script (`scripts/generate-template-index.js`)
- Scans the `public/templates` directory recursively
- Finds all PDF files and generates the index
- Can run in watch mode to automatically update when files change
- Available via npm scripts: `npm run generate-template-index` and `npm run watch-templates`

### 4. Updated UI (`src/pages/SuccessfulExamples.tsx`)
- Uses the template service instead of hardcoded templates
- Automatically displays all discovered templates
- Maintains the same UI/UX but with dynamic content

## Adding New Templates

### Method 1: Manual (Recommended)
1. Add your PDF file to the appropriate folder in `public/templates/`
   - Essays: `public/templates/essays/[ProgramType]/`
   - Resumes: `public/templates/resumes/[ProgramType]/`
   - LORs: `public/templates/LORs/[ProgramType]/`
2. Run `npm run generate-template-index` to update the index
3. The template will automatically appear in the UI

### Method 2: Automatic (Development)
1. Run `npm run watch-templates` to start watching for changes
2. Add your PDF file to the templates folder
3. The index will be automatically updated and the template will appear

## File Structure

```
public/templates/
├── index.json                    # Auto-generated template index
├── essays/
│   ├── Undergraduate/
│   │   ├── Common App Response 1.pdf
│   │   ├── UC Creative Essay.pdf
│   │   └── UChicago Essay Supplement.pdf
│   ├── MBA/
│   ├── Masters/
│   ├── Law/
│   └── PhD/
├── resumes/
│   ├── Undergraduate/
│   ├── MBA/
│   ├── Masters/
│   ├── Law/
│   └── PhD/
└── LORs/
    ├── Undergraduate/
    ├── MBA/
    ├── Masters/
    ├── Law/
    └── PhD/
```

## Template Metadata Extraction

The system automatically extracts metadata from file paths:

- **Title**: Generated from filename (e.g., "UChicago Essay Supplement.pdf" → "UChicago Essay Supplement")
- **Category**: Determined by parent folder (`essays`, `resumes`, `LORs`)
- **Program Type**: Determined by subfolder (`Undergraduate`, `MBA`, `Masters`, `Law`, `PhD`)
- **School**: Extracted from filename if it contains school names
- **Type**: Determined by filename patterns (e.g., "Supplement" → "Essay Supplement")
- **Rating**: Randomly generated between 4.5-5.0
- **URL**: Automatically generated from file path

## Benefits

1. **Zero Code Changes**: Adding new templates requires no code modifications
2. **Automatic Discovery**: Templates are automatically detected and displayed
3. **Consistent Metadata**: Standardized metadata extraction from file paths
4. **Scalable**: Works with any number of templates in any folder structure
5. **Maintainable**: Clear separation between content and code

## Future Enhancements

- Add support for template thumbnails
- Implement template search and filtering
- Add template categories and tags
- Support for template ratings and reviews
- Integration with CMS for template management

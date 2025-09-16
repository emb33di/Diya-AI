# School Data Sync to Supabase

This document explains how to manage school data using JSON files and sync them to the Supabase database.

## Overview

The school data is organized into three JSON files based on program types:
- `public/undergraduate-schools.json` - Undergraduate programs
- `public/mba-schools.json` - MBA programs  
- `public/graduate-schools.json` - LLM, Masters, and PhD programs

## JSON File Structure

Each JSON file follows this structure:

```json
{
  "schools": [
    {
      "ranking": 1,
      "name": "School Name",
      "city": "City",
      "state": "State",
      "country": "USA",
      "school_program_type": "Undergraduate|MBA|LLM|PhD|Masters",
      "institutional_type": "public|private|liberal_arts|research_university|community_college|technical_institute|ivy_league",
      "climate": "cold|temperate|hot",
      "tier": "Tier Description",
      "acceptance_rate": "X.X%",
      "sat_range": "XXXX-XXXX",
      "act_range": "XX-XX",
      "annual_tuition_usd": 50000,
      "total_estimated_cost_usd": 80000,
      "average_scholarship_usd": 30000,
      "percent_international_aid": 25.0,
      "need_blind_for_internationals": false,
      "website_url": "https://www.school.edu"
    }
  ]
}
```

### Field Descriptions

- **ranking**: Numeric ranking (optional)
- **name**: School name (required, must be unique)
- **city**: City location
- **state**: State abbreviation
- **country**: Country (defaults to "USA")
- **school_program_type**: Program type (required) - must be one of: Undergraduate, MBA, LLM, PhD, Masters
- **institutional_type**: Institution type - must be one of: public, private, liberal_arts, research_university, community_college, technical_institute, ivy_league
- **climate**: Climate type - cold, temperate, hot
- **tier**: Tier classification (e.g., "Ivy League", "M7", "T14", "Top Tier")
- **acceptance_rate**: Acceptance rate as percentage string
- **sat_range**: SAT score range (for undergraduate programs)
- **act_range**: ACT score range (for undergraduate programs)
- **annual_tuition_usd**: Annual tuition in USD
- **total_estimated_cost_usd**: Total estimated cost including room/board
- **average_scholarship_usd**: Average scholarship amount
- **percent_international_aid**: Percentage of international students receiving aid
- **need_blind_for_internationals**: Boolean indicating if need-blind for internationals
- **website_url**: School website URL

## Adding New Schools

To add a new school:

1. **Edit the appropriate JSON file** based on program type:
   - Undergraduate programs → `public/undergraduate-schools.json`
   - MBA programs → `public/mba-schools.json`
   - LLM/Masters/PhD programs → `public/graduate-schools.json`

2. **Add the school object** to the `schools` array with all required fields

3. **Run the sync script** to update the database:
   ```bash
   npm run sync-schools
   ```

## Sync Script

The sync script (`scripts/sync-schools-to-db.js`) performs the following operations:

1. **Validates** each school's data structure
2. **Upserts** schools to the Supabase `schools` table (updates if exists, inserts if new)
3. **Reports** success/failure for each school
4. **Provides** summary statistics

### Prerequisites

Before running the sync script, ensure you have:

1. **Environment variables** set in `.env` file:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Required dependencies** installed:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

### Running the Sync

```bash
# Run the sync script
npm run sync-schools

# Or run directly
node scripts/sync-schools-to-db.js
```

### Script Output

The script provides detailed output:
- ✅ Successfully processed schools
- ⚠️ Warnings for validation issues
- ❌ Errors for failed operations
- 📊 Summary statistics

## Database Schema

The schools are stored in the `schools` table with the following key constraints:

- **Primary Key**: `id` (UUID, auto-generated)
- **Unique Constraint**: `name` (school names must be unique)
- **Enum Constraints**: 
  - `school_program_type` must be one of: Undergraduate, MBA, LLM, PhD, Masters
  - `institutional_type` must be one of: public, private, liberal_arts, research_university, community_college, technical_institute, ivy_league

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing required environment variables:
      SUPABASE_URL or VITE_SUPABASE_URL
      SUPABASE_SERVICE_ROLE_KEY
   ```
   **Solution**: Add the required variables to your `.env` file

2. **Invalid Program Type**
   ```
   ⚠️ School "School Name" has invalid school_program_type: InvalidType
   ```
   **Solution**: Use one of: Undergraduate, MBA, LLM, PhD, Masters

3. **Invalid Institutional Type**
   ```
   ⚠️ School "School Name" has invalid institutional_type: InvalidType
   ```
   **Solution**: Use one of: public, private, liberal_arts, research_university, community_college, technical_institute, ivy_league

4. **Connection Errors**
   ```
   ❌ Failed to connect to Supabase: [error message]
   ```
   **Solution**: Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

### Getting Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "service_role" key (not the "anon" key)
4. Add it to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY`

## Best Practices

1. **Always validate** your JSON before running the sync script
2. **Use unique school names** to avoid conflicts
3. **Include all required fields** for each school
4. **Test with a small dataset** first if making bulk changes
5. **Keep backups** of your JSON files
6. **Run the sync script** after any JSON file changes

## File Locations

- JSON files: `public/`
- Sync script: `scripts/sync-schools-to-db.js`
- Package script: `npm run sync-schools`
- Documentation: `SCHOOL_SYNC_README.md`

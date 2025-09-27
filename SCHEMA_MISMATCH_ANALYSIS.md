# Database Schema vs Edge Function Column Mapping Analysis

## ✅ CORRECTLY MAPPED COLUMNS

| Edge Function Column | Database Schema Column | Status |
|---------------------|----------------------|---------|
| `full_name` | `full_name` | ✅ Match |
| `preferred_name` | `preferred_name` | ✅ Match |
| `email_address` | `email_address` | ✅ Match |
| `phone_number` | `phone_number` | ✅ Match |
| `citizenship_status` | `citizenship_status` | ✅ Match |
| `high_school_name` | `high_school_name` | ✅ Match |
| `high_school_graduation_year` | `high_school_graduation_year` | ✅ Match |
| `gpa_unweighted` | `gpa_unweighted` | ✅ Match |
| `gpa_weighted` | `gpa_weighted` | ✅ Match |
| `class_rank` | `class_rank` | ✅ Match |
| `intended_majors` | `intended_majors` | ✅ Match |
| `secondary_major_minor_interests` | `secondary_major_minor_interests` | ✅ Match |
| `sat_score` | `sat_score` | ✅ Match |
| `act_score` | `act_score` | ✅ Match |
| `career_interests` | `career_interests` | ✅ Match |
| `ideal_college_size` | `ideal_college_size` | ✅ Match |
| `ideal_college_setting` | `ideal_college_setting` | ✅ Match |
| `geographic_preference` | `geographic_preference` | ✅ Match |
| `must_haves` | `must_haves` | ✅ Match |
| `deal_breakers` | `deal_breakers` | ✅ Match |
| `college_budget` | `college_budget` | ✅ Match |
| `financial_aid_importance` | `financial_aid_importance` | ✅ Match |
| `scholarship_interests` | `scholarship_interests` | ✅ Match |

## ❌ MISSING COLUMNS IN DATABASE SCHEMA

| Edge Function Column | Database Schema Column | Issue |
|---------------------|----------------------|--------|
| `college_name` | ❌ Missing | Edge function tries to save graduate school data |
| `college_graduation_year` | ❌ Missing | Edge function tries to save graduate school data |
| `college_gpa` | ❌ Missing | Edge function tries to save graduate school data |
| `masters_field_of_focus` | ❌ Missing | Edge function tries to save graduate school data |
| `test_type` | ❌ Missing | Edge function tries to save test type |
| `test_score` | ❌ Missing | Edge function tries to save test score |

## 🔧 RECOMMENDED FIXES

### Option 1: Add Missing Columns to Database
Add these columns to your `user_profiles` table:
```sql
ALTER TABLE user_profiles ADD COLUMN college_name TEXT;
ALTER TABLE user_profiles ADD COLUMN college_graduation_year INTEGER;
ALTER TABLE user_profiles ADD COLUMN college_gpa DECIMAL(3,2);
ALTER TABLE user_profiles ADD COLUMN masters_field_of_focus TEXT;
ALTER TABLE user_profiles ADD COLUMN test_type TEXT;
ALTER TABLE user_profiles ADD COLUMN test_score INTEGER;
```

### Option 2: Remove Missing Columns from Edge Function
Comment out or remove the lines that try to save to non-existent columns.

## 📊 SUMMARY
- **Total columns used by Edge Function**: 29
- **Columns that exist in database**: 23
- **Missing columns**: 6
- **Match rate**: 79.3%

The main issue is that the Edge Function supports graduate school data (MBA, Masters, PhD) but your database schema only has undergraduate-focused columns.

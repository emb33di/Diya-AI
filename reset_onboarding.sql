-- Reset onboarding status for specific user
UPDATE user_profiles 
SET onboarding_complete = false 
WHERE user_id = '9f4789df-8a5f-42c0-aa67-f567c51bd2fa';

-- Also reset cumulative onboarding time to allow fresh start
UPDATE user_profiles 
SET cumulative_onboarding_time = 0 
WHERE user_id = '9f4789df-8a5f-42c0-aa67-f567c51bd2fa';

-- Show the updated record
SELECT user_id, full_name, onboarding_complete, cumulative_onboarding_time 
FROM user_profiles 
WHERE user_id = '9f4789df-8a5f-42c0-aa67-f567c51bd2fa';

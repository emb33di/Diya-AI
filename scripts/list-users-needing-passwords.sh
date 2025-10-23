#!/bin/bash

# Script to list all early access users who need password setup
# This helps identify users who signed up before the password feature was added

set -e

echo "🔍 Early Access Users - Password Setup Required"
echo "=============================================="
echo ""

# Function to query the database for early access users
list_early_access_users() {
    echo "📊 Querying database for early access users..."
    echo ""
    echo "To get the list of users who need password setup, run this SQL query in your Supabase Dashboard:"
    echo ""
    echo "🔗 Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/editor"
    echo ""
    echo "📝 Run this SQL query:"
    echo ""
    echo "SELECT "
    echo "  email_address,"
    echo "  full_name,"
    echo "  early_user_signup_date,"
    echo "  user_tier,"
    echo "  CASE "
    echo "    WHEN early_user_trial_end_date::date < CURRENT_DATE THEN 'Trial Expired'"
    echo "    ELSE 'Trial Active'"
    echo "  END as trial_status"
    echo "FROM user_profiles"
    echo "WHERE is_early_user = true"
    echo "ORDER BY early_user_signup_date ASC;"
    echo ""
    echo "📋 This will show you:"
    echo "   • Email addresses"
    echo "   • Full names"
    echo "   • Signup dates"
    echo "   • User tier (Pro/Free)"
    echo "   • Trial status (Active/Expired)"
    echo ""
    echo "💡 Copy the email addresses and names from the results, then use:"
    echo "   ./scripts/send-password-setup-emails.sh email@example.com \"Full Name\""
    echo ""
}

# Function to show example usage
show_example_usage() {
    echo "📧 Example Usage:"
    echo ""
    echo "If your SQL query returns these results:"
    echo "  email_address          | full_name    | early_user_signup_date"
    echo "  ----------------------|--------------|----------------------"
    echo "  john@example.com      | John Doe     | 2025-01-10"
    echo "  jane@example.com      | Jane Smith   | 2025-01-12"
    echo "  bob@example.com       | Bob Johnson  | 2025-01-15"
    echo ""
    echo "Then run:"
    echo "  ./scripts/send-password-setup-emails.sh \\"
    echo "    john@example.com \"John Doe\" \\"
    echo "    jane@example.com \"Jane Smith\" \\"
    echo "    bob@example.com \"Bob Johnson\""
    echo ""
}

# Function to show alternative approaches
show_alternatives() {
    echo "🔄 Alternative Approaches:"
    echo ""
    echo "1. 📧 Send Individual Emails:"
    echo "   ./scripts/send-password-setup-emails.sh user@example.com \"User Name\""
    echo ""
    echo "2. 🔗 Direct Users to Password Reset:"
    echo "   Tell users to go to: https://www.meetdiya.com/auth"
    echo "   Click 'Forgot Password?' and enter their email"
    echo ""
    echo "3. 📱 Contact Users Directly:"
    echo "   Send them a personal message with password reset instructions"
    echo ""
}

# Main script logic
echo "This script helps you identify early access users who need password setup."
echo ""

list_early_access_users
show_example_usage
show_alternatives

echo "🎯 Next Steps:"
echo "   1. Run the SQL query above in Supabase Dashboard"
echo "   2. Copy the email addresses and names from the results"
echo "   3. Use the send-password-setup-emails.sh script to send emails"
echo "   4. Or direct users to use the 'Forgot Password' feature on your website"
echo ""
echo "📞 Need help? Check the Supabase Dashboard logs or contact support."

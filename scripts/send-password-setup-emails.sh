#!/bin/bash

# Script to send password setup emails to early access users
# This helps users who signed up before the password feature was added

set -e

echo "🔑 Password Setup Email Tool for Early Access Users"
echo "=================================================="
echo ""

# Function to send password setup email to a specific user
send_password_setup_email() {
    local email="$1"
    local firstName="$2"
    
    echo "📧 Sending password setup email to: $email"
    
    # Extract first name from full name if needed
    if [[ "$firstName" == *" "* ]]; then
        firstName=$(echo "$firstName" | cut -d' ' -f1)
    fi
    
    # Call the edge function
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-bulk-password-reset' \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
      -d "{
        \"email\": \"$email\",
        \"firstName\": \"$firstName\"
      }")
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Email sent successfully to $email"
        return 0
    else
        echo "❌ Failed to send email to $email (HTTP $HTTP_CODE)"
        echo "   Response: $RESPONSE_BODY"
        return 1
    fi
}

# Function to get list of early access users from database
get_early_access_users() {
    echo "📊 Getting list of early access users..."
    echo ""
    echo "To get the list of users who need password setup, you can:"
    echo ""
    echo "1. Go to your Supabase Dashboard:"
    echo "   https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/editor"
    echo ""
    echo "2. Run this SQL query:"
    echo "   SELECT email_address, full_name, early_user_signup_date"
    echo "   FROM user_profiles"
    echo "   WHERE is_early_user = true"
    echo "   ORDER BY early_user_signup_date ASC;"
    echo ""
    echo "3. Copy the email addresses and names, then use this script:"
    echo ""
    echo "Usage examples:"
    echo "  ./scripts/send-password-setup-emails.sh user@example.com \"John Doe\""
    echo "  ./scripts/send-password-setup-emails.sh user1@example.com \"Jane Smith\" user2@example.com \"Bob Johnson\""
    echo ""
}

# Main script logic
if [ $# -eq 0 ]; then
    get_early_access_users
    exit 0
fi

# Check if we have the required environment variable
if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: VITE_SUPABASE_ANON_KEY environment variable is not set"
    echo "   Please set it in your .env file or export it in your shell"
    exit 1
fi

echo "🚀 Starting password setup email process..."
echo ""

# Process arguments in pairs (email, firstName)
success_count=0
total_count=0

while [ $# -gt 0 ]; do
    if [ $# -lt 2 ]; then
        echo "❌ Error: Missing first name for email: $1"
        echo "   Usage: email \"First Name\""
        exit 1
    fi
    
    email="$1"
    firstName="$2"
    shift 2
    
    total_count=$((total_count + 1))
    
    if send_password_setup_email "$email" "$firstName"; then
        success_count=$((success_count + 1))
    fi
    
    echo ""
done

echo "📊 Summary:"
echo "   Total emails attempted: $total_count"
echo "   Successfully sent: $success_count"
echo "   Failed: $((total_count - success_count))"
echo ""

if [ $success_count -eq $total_count ]; then
    echo "🎉 All password setup emails sent successfully!"
else
    echo "⚠️  Some emails failed. Check the error messages above."
fi

echo ""
echo "📝 Next steps:"
echo "   1. Users will receive emails with instructions to set up passwords"
echo "   2. They'll click the link to go to the password reset page"
echo "   3. They'll create new passwords and can then log in normally"
echo ""
echo "🔍 To monitor the process:"
echo "   - Check Supabase function logs for any issues"
echo "   - Users can also use the regular 'Forgot Password' flow on your website"

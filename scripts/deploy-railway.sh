#!/bin/bash

# Railway Deployment Script for CLIRDEC: PRESENCE
# This script helps you deploy the application to Railway

set -e  # Exit on error

echo "🚀 CLIRDEC: PRESENCE - Railway Deployment Script"
echo "================================================"
echo ""

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo "📝 You have uncommitted changes. Let's commit them first."
    echo ""
    git status -s
    echo ""
    read -p "Commit message (or press Enter to skip): " commit_msg
    
    if [[ -n "$commit_msg" ]]; then
        git add .
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    else
        echo "⚠️  Skipping commit. You can commit manually later."
    fi
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo "=============================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found"
    echo ""
    echo "Install it with:"
    echo "  npm i -g @railway/cli"
    echo "  or"
    echo "  brew install railway"
    echo ""
    exit 1
else
    echo "✅ Railway CLI installed"
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway"
    echo ""
    echo "Please login with:"
    echo "  railway login"
    echo ""
    exit 1
else
    echo "✅ Logged in to Railway"
fi

echo ""
echo "🔑 Environment Variables Check"
echo "=============================="
echo ""
echo "Please ensure these environment variables are set in Railway:"
echo ""
echo "  ✓ BREVO_API_KEY       - Your Brevo API key"
echo "  ✓ FROM_EMAIL          - Verified sender email"
echo "  ✓ NODE_ENV            - Set to 'production'"
echo "  ✓ DATABASE_URL        - (Auto-configured by Railway)"
echo "  ✓ RAILWAY_PUBLIC_DOMAIN - (Auto-configured by Railway)"
echo ""

read -p "Are all environment variables configured in Railway? (y/n): " env_configured

if [[ "$env_configured" != "y" ]]; then
    echo ""
    echo "⚠️  Please configure environment variables first:"
    echo ""
    echo "1. Go to Railway Dashboard"
    echo "2. Select your project"
    echo "3. Click on 'Variables' tab"
    echo "4. Add the required variables"
    echo ""
    echo "Or use Railway CLI:"
    echo "  railway variables set BREVO_API_KEY=your_api_key"
    echo "  railway variables set FROM_EMAIL=your_email@clsu2.edu.ph"
    echo "  railway variables set NODE_ENV=production"
    echo ""
    exit 1
fi

echo ""
echo "📊 Database Migration"
echo "===================="
echo ""

read -p "Do you want to run database migration (creates password_reset_tokens table)? (y/n): " run_migration

if [[ "$run_migration" == "y" ]]; then
    echo ""
    echo "Running database migration..."
    
    # Try normal push first
    if railway run npm run db:push; then
        echo "✅ Database migration successful"
    else
        echo "⚠️  Normal migration failed. Trying with --force flag..."
        railway run npm run db:push -- --force
        echo "✅ Database migration successful (forced)"
    fi
fi

echo ""
echo "🚢 Deploying to Railway"
echo "======================"
echo ""

# Push to GitHub (Railway auto-deploys from GitHub)
read -p "Push to GitHub and trigger Railway deployment? (y/n): " do_deploy

if [[ "$do_deploy" == "y" ]]; then
    echo ""
    echo "Pushing to GitHub..."
    
    # Get current branch
    current_branch=$(git branch --show-current)
    
    git push origin "$current_branch"
    
    echo ""
    echo "✅ Code pushed to GitHub"
    echo ""
    echo "Railway will automatically deploy the latest changes."
    echo ""
    echo "Monitor deployment:"
    echo "  railway logs"
    echo ""
    echo "Or visit Railway Dashboard:"
    echo "  railway open"
    echo ""
else
    echo ""
    echo "⚠️  Deployment skipped. You can deploy manually later with:"
    echo "  git push origin main"
    echo ""
fi

echo ""
echo "🧪 Testing the Deployment"
echo "========================"
echo ""
echo "After deployment completes, test the password reset feature:"
echo ""
echo "1. Open your Railway app URL"
echo "2. Click 'Forgot Password'"
echo "3. Enter a registered email"
echo "4. Check email inbox for reset link"
echo "5. Complete password reset flow"
echo ""

read -p "Open Railway Dashboard now? (y/n): " open_dashboard

if [[ "$open_dashboard" == "y" ]]; then
    railway open
fi

echo ""
echo "✨ Deployment script completed!"
echo ""

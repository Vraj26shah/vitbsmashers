#!/bin/bash

echo "🚀 VIT Bhopal Student Portal - Update & Deploy Workflow"
echo "=================================================="

# Check if there are changes to commit
if [[ -z $(git status --porcelain) ]]; then
    echo "✅ No changes to commit"
    echo "💡 Make some changes to your files first!"
    exit 0
fi

# Show what files have changed
echo "📝 Changes detected:"
git status --short

# Ask for commit message
echo ""
read -p "💬 Enter commit message: " commit_message

if [[ -z "$commit_message" ]]; then
    commit_message="Update website"
fi

# Commit and push
echo "📤 Committing and pushing changes..."
git add .
git commit -m "$commit_message"
git push origin main

echo ""
echo "✅ Changes pushed to GitHub!"
echo "🔄 Vercel will automatically deploy in 1-2 minutes"
echo "🌐 Check your deployment at: https://vercel.com/dashboard"
echo ""
echo "📱 Your live site will be updated automatically!" 
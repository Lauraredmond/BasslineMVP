#!/bin/bash

# Automated deployment script for Bassline MVP
echo "🚀 Starting deployment..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git initialized"
fi

# Add all files
git add .
echo "✅ Files staged"

# Commit with timestamp
git commit -m "Deploy Bassline MVP - $(date)"
echo "✅ Changes committed"

# Ask for repo name if not set
if [ -z "$REPO_NAME" ]; then
    read -p "Enter your GitHub repository name (e.g., BasslineMVP): " REPO_NAME
fi

# Ask for GitHub username if not set
if [ -z "$GITHUB_USER" ]; then
    read -p "Enter your GitHub username: " GITHUB_USER
fi

# Set remote origin
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git
echo "✅ Remote set to https://github.com/$GITHUB_USER/$REPO_NAME.git"

# Push to main branch
git branch -M main
git push -u origin main
echo "🎉 Deployed successfully!"

echo "Now go to Netlify and connect this repo with:"
echo "Build command: npm run build"
echo "Publish directory: dist"
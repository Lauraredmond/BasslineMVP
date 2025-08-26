#!/bin/bash

# Enhanced deployment script for Bassline MVP with debug tools
echo "🚀 Starting enhanced deployment with debug tools..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "No package.json found. Make sure you're in the MVP directory."
    exit 1
fi

print_info "Current directory: $(pwd)"

# Check for required files
if [ ! -f "src/components/TestComponents.tsx" ]; then
    print_warning "Debug components not found - they may not be available on deployment"
else
    print_status "Debug components found"
fi

if [ ! -f "src/lib/integration-test-suite.ts" ]; then
    print_warning "Integration test suite not found"
else
    print_status "Integration test suite found"
fi

if [ ! -f "netlify/functions/rapidapi-track-analysis.js" ]; then
    print_warning "Netlify function not found - secure API calls may not work"
else
    print_status "Netlify function found"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
fi

# Build the project
print_info "Building project..."
npm run build
if [ $? -eq 0 ]; then
    print_status "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Check if dist directory was created
if [ ! -d "dist" ]; then
    print_error "Build directory 'dist' not found"
    exit 1
fi

print_status "Build directory created: $(du -sh dist | cut -f1) total size"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    print_status "Git initialized"
fi

# Add all files
git add .
print_status "Files staged for commit"

# Check for uncommitted changes
if git diff --staged --quiet; then
    print_info "No changes to commit"
else
    # Commit with timestamp
    commit_message="Deploy Bassline MVP with debug tools - $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$commit_message"
    print_status "Changes committed: $commit_message"
fi

# Set defaults for your repository
if [ -z "$REPO_NAME" ]; then
    REPO_NAME="BasslineMVP"
fi

if [ -z "$GITHUB_USER" ]; then
    GITHUB_USER="Lauraredmond"
fi

# Set remote origin
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git
print_status "Remote set to https://github.com/$GITHUB_USER/$REPO_NAME.git"

# Push to main branch
git branch -M main
print_info "Pushing to GitHub..."
git push -u origin main
if [ $? -eq 0 ]; then
    print_status "Code pushed to GitHub successfully"
else
    print_error "Failed to push to GitHub"
    exit 1
fi

echo ""
echo "🎉 ${GREEN}DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo ""
echo "📋 ${BLUE}NEXT STEPS:${NC}"
echo "1. Your code is now on GitHub"
echo "2. Netlify will auto-deploy from your GitHub repo"
echo "3. Wait 2-3 minutes for deployment to complete"
echo ""
echo "🔧 ${BLUE}TO ACCESS DEBUG TOOLS ON NETLIFY:${NC}"
echo "1. Go to your Netlify app URL"
echo "2. Navigate to the Music Sync page"
echo "3. Add ?debug=true to the URL:"
echo "   ${YELLOW}https://your-app.netlify.app/music-sync?debug=true${NC}"
echo "4. Look for the 🔧 Debug Panel in the bottom-right corner"
echo "5. Or look for the 🧪 Quick Test button in the top-right corner"
echo ""
echo "🌐 ${BLUE}NETLIFY DEPLOYMENT SETTINGS:${NC}"
echo "Build command: npm run build"
echo "Publish directory: dist"
echo "Functions directory: netlify/functions"
echo ""
echo "🔑 ${BLUE}ENVIRONMENT VARIABLES NEEDED ON NETLIFY:${NC}"
echo "- RAPIDAPI_KEY (your RapidAPI key - keep this secure!)"
echo "- All VITE_* variables should already be in your code"
echo ""

# Check if Netlify CLI is installed
if command -v netlify >/dev/null 2>&1; then
    print_info "Netlify CLI detected. You can also deploy directly with:"
    echo "  netlify deploy --prod"
else
    print_info "Install Netlify CLI for direct deployments:"
    echo "  npm install -g netlify-cli"
    echo "  netlify login"
    echo "  netlify link"
    echo "  netlify deploy --prod"
fi

echo ""
print_status "Deployment script completed!"
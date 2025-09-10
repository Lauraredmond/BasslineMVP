#!/bin/bash

# GitHub Authentication Setup Helper
echo "🔐 GitHub Authentication Setup for Bassline MVP"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "To deploy to GitHub, you need a Personal Access Token (PAT)."
echo ""
echo "📋 Steps to create a GitHub token:"
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token' → 'Generate new token (classic)'"
echo "3. Set expiration (recommend 90 days or No expiration)"
echo "4. Select these scopes:"
echo "   ✓ repo (Full control of private repositories)"
echo "   ✓ workflow (Update GitHub Action workflows)"
echo "5. Click 'Generate token'"
echo "6. Copy the token (you won't see it again!)"
echo ""

read -p "Have you created your GitHub token? (y/n): " created_token

if [ "$created_token" != "y" ] && [ "$created_token" != "Y" ]; then
    echo "Please create your token first, then run this script again."
    exit 1
fi

echo ""
echo "Now you have two options to use your token:"
echo ""
echo "🔧 Option 1: Set environment variable (temporary, this session only)"
read -s -p "Enter your GitHub token: " github_token
echo ""
export GITHUB_TOKEN=$github_token
print_status "Token set for this session"
echo ""
echo "Now run: ./deploy-with-debug.sh"
echo ""

echo "🔧 Option 2: Store in git credentials (permanent, but less secure)"
echo "This will prompt you for username and token when you push"
echo "Username: your GitHub username"
echo "Password: paste your GitHub token"
echo ""
print_warning "Only use Option 2 if you understand the security implications"
echo ""

read -p "Which option do you prefer? (1/2): " option

if [ "$option" = "1" ]; then
    echo ""
    print_status "Environment variable set! Now run:"
    echo "  ./deploy-with-debug.sh"
    echo ""
    print_info "Note: You'll need to set the token again if you close this terminal"
    
elif [ "$option" = "2" ]; then
    git config --global credential.helper store
    print_status "Git configured to store credentials"
    echo ""
    print_info "When you run ./deploy-with-debug.sh, enter:"
    print_info "Username: Lauraredmond"
    print_info "Password: [paste your GitHub token]"
    
else
    echo "Invalid option. Please run this script again."
    exit 1
fi

echo ""
print_status "Setup complete! Ready to deploy."
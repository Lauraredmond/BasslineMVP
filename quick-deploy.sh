#!/bin/bash

# Quick deploy script - minimal version for fast deployments
echo "⚡ Quick deploying to Netlify..."

# Build and commit
npm run build && \
git add . && \
git commit -m "Quick deploy - $(date '+%H:%M:%S')" && \
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Quick deploy completed!"
    echo "🌐 Check your Netlify dashboard for deployment progress"
    echo "🔧 Access debug tools: add ?debug=true to your URL"
else
    echo "❌ Quick deploy failed"
fi
#!/bin/bash

# Deploy Bassline MVP Database Schema
# This script applies all database changes to fix PGRST200 errors

echo "🚀 Deploying Bassline MVP Database Schema..."

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Missing environment variables"
    echo "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "📋 Applying database setup..."

# Apply the main setup script
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"$(cat setup-database.sql | tr '\n' ' ' | sed 's/"/\\"/g')\"}"

echo ""
echo "✅ Database schema deployed!"
echo ""
echo "🧪 Testing BPM=100 → climb mapping..."

# Test the Slide Away mapping
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/workout_phases?target_tempo_min=lte.100&target_tempo_max=gte.100&order=target_tempo_max-target_tempo_min.asc&limit=1"

echo ""
echo ""
echo "🔍 Verifying v_workout_phases view..."

# Test the view
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/v_workout_phases?limit=3"

echo ""
echo ""
echo "📊 Database deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check your Supabase dashboard to confirm tables exist"
echo "2. Test the REST API examples in REST-API-Examples.md" 
echo "3. Verify PGRST200 errors are gone in your application"
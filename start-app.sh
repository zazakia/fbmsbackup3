#!/bin/bash

echo "🚀 Starting Filipino Business Management System"
echo "================================================"

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*dev" 2>/dev/null || true

# Clean build cache
echo "🗑️  Clearing build cache..."
rm -rf node_modules/.vite dist .vite 2>/dev/null || true

# Verify configuration
echo "📋 Configuration Check:"
if [ -f .env.local ]; then
    SUPABASE_URL=$(grep VITE_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)
    echo "   Supabase URL: $SUPABASE_URL"
    
    if [[ $SUPABASE_URL == *"supabase.co"* ]]; then
        echo "   ✅ Using remote Supabase (recommended)"
    elif [[ $SUPABASE_URL == *"127.0.0.1"* ]]; then
        echo "   ⚠️  Using local Supabase"
    else
        echo "   ❌ Invalid Supabase URL"
        exit 1
    fi
else
    echo "   ❌ .env.local not found"
    exit 1
fi

# Test database connectivity
echo "🔍 Testing database connectivity..."
if node test-database-loader.js >/dev/null 2>&1; then
    echo "   ✅ Database connection successful"
else
    echo "   ❌ Database connection failed"
    echo "   Please check your internet connection and Supabase configuration"
    exit 1
fi

# Start the development server
echo "🎯 Starting development server..."
echo "   URL: http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""

# Start with optimal settings
npm run dev -- --port 3000 --host 0.0.0.0

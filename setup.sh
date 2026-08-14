#!/bin/bash

# CyberX - Quick Start Setup Script
# This script sets up the development environment

echo "🚀 Starting CyberX Setup..."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
  echo "❌ Frontend installation failed"
  exit 1
fi
echo "✅ Frontend dependencies installed"

# Build frontend
echo "🔨 Building frontend..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi
echo "✅ Frontend built successfully"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd ../backend
npm install
if [ $? -ne 0 ]; then
  echo "❌ Backend installation failed"
  exit 1
fi
echo "✅ Backend dependencies installed"

# Generate types
echo "🔧 Generating Cloudflare types..."
npm run cf-typegen
if [ $? -ne 0 ]; then
  echo "⚠️ Type generation warning (non-critical)"
fi
echo "✅ Setup complete!"

echo ""
echo "📋 Next steps:"
echo "1. Frontend development: cd frontend && npm run dev"
echo "2. Backend development: cd backend && npm run dev"
echo "3. Deploy frontend: cd frontend && npm run build"
echo "4. Deploy backend: cd backend && npm run deploy"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"

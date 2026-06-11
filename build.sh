#!/bin/bash

# Build script for Notes App backend

set -e

echo "🔨 Building Notes App Backend..."

# Copy shared utilities to each lambda directory before compiling anything
echo "📋 Copying shared utilities to lambda directories..."
for lambda_dir in lambdas/create-note lambdas/read-note lambdas/update-note lambdas/delete-note lambdas/list-notes lambdas/search-notes; do
  if [ -d "$lambda_dir" ]; then
    cp lambdas/shared-utils.ts "$lambda_dir/" || true
  fi
done

# Build main CDK stack
echo "📦 Building CDK infrastructure..."
npm run build

# Build Lambda functions
echo "📦 Organizing Lambda source code..."
cd lambdas

echo "📦 Compiling Lambda functions..."
# Compile TypeScript
npm run build

# Copy compiled code to CDK asset directories
echo "📋 Organizing compiled Lambda code for CDK..."
for lambda_dir in create-note read-note update-note delete-note list-notes search-notes; do
  if [ -d "$lambda_dir" ]; then
    if [ -d "dist/$lambda_dir" ]; then
      # Copy index.js, shared-utils.js and any maps directly into the lambda folder
      cp -r dist/$lambda_dir/* "$lambda_dir/" 2>/dev/null || true
    fi
  fi
done

cd ..

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. Configure AWS credentials: aws configure"
echo "2. Deploy: npx cdk deploy"
echo "3. Test endpoints using the API endpoint from CDK outputs"

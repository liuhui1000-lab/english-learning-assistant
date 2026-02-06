#!/bin/bash
set -e

echo "Starting build script..."

# The previous script appeared to exit early (likely success code 0) before running the actual build.
# This caused Netlify to think the build was complete without generating artifacts.

echo "Running next build..."
# Ensure NODE_ENV is production
export NODE_ENV=production

# Run build using local next binary
npx next build

echo "Build script finished."
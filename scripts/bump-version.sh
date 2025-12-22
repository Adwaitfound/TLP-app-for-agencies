#!/bin/bash

# Auto-increment version in package.json before git push
# This script uses semantic versioning: major.minor.patch

set -e

VERSION=$(node -p "require('./package.json').version")
echo "Current version: $VERSION"

# Parse current version
IFS='.' read -r -a parts <<< "$VERSION"
MAJOR=${parts[0]}
MINOR=${parts[1]}
PATCH=${parts[2]}

# Increment patch version (for every deploy)
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "New version: $NEW_VERSION"

# Update package.json
node -e "
const fs = require('fs');
const pkg = require('./package.json');
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "✓ Version bumped to $NEW_VERSION in package.json"

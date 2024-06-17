#!/bin/sh

# Ensure the .git/hooks directory exists
mkdir -p .git/hooks

# Copy the pre-push hook to the .git/hooks directory
# For most people, the .git folder is hidden, you can unhide it if you want
cp lib/scripts/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push

echo "Git hooks installed."

#!/bin/bash
# backup.sh

# Ensure there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to backup."
  exit 0
fi

TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
SUMMARY=$(git diff --stat)

echo "Backing up to GitHub..."

# Add all changes
git add .

# Commit with summary
git commit -m "Automated backup $TIMESTAMP

Summary of changes:
$SUMMARY"

# Push to the updated remote repository
git push origin main

echo "Backup complete and pushed to GitHub (main branch)."
echo "Summary of changes:"
echo "$SUMMARY"

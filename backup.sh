#!/bin/bash
# backup.sh

# Ensure there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to backup."
  exit 0
fi

TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
BRANCH_NAME="backup-$TIMESTAMP"

echo "Creating backup branch: $BRANCH_NAME"

# Create and switch to a new branch for this backup
git checkout -b "$BRANCH_NAME"

# Generate a summary of changes
SUMMARY=$(git diff --stat)

# Commit all changes with the summary
git add .
git commit -m "Automated backup $TIMESTAMP
Summary of changes:
$SUMMARY"

# Push the new backup branch to GitHub
git push origin "$BRANCH_NAME"

# Switch back to the main branch
git checkout main

echo "Backup complete: $BRANCH_NAME pushed to GitHub."
echo "Summary of changes:"
echo "$SUMMARY"

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

# Add and commit changes directly to the current branch (main)
git add .
git commit -m "Automated backup $TIMESTAMP

Summary of changes:
$SUMMARY"

# Push the changes to the current branch (main)
git push origin main

echo "------------------------------------------"
echo "Backup complete and pushed to GitHub."
echo "------------------------------------------"
echo "SUMMARY OF CHANGES:"
echo "$SUMMARY"
echo "------------------------------------------"


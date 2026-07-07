#!/bin/bash

# Backup script for Sector 93 game
# Creates local timestamped backup and pushes to GitHub

set -e

BACKUP_DIR="."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="index.html.backup.${TIMESTAMP}"

echo "🔄 Creating local backup..."
cp index.html "${BACKUP_FILE}"
echo "✅ Local backup created: ${BACKUP_FILE}"

echo "📦 Staging changes..."
git add index.html
git status

echo "💾 Committing to git..."
COMMIT_MSG="Backup: $(date +%Y-%m-%d\ %H:%M:%S)"
git commit -m "${COMMIT_MSG}" || echo "⚠️  No changes to commit"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Backup complete! Local and remote synchronized."

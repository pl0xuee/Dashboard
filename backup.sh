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

echo "Backup complete and pushed to GitHub (main branch)."

# --- Network Drive Backup ---
echo "Backing up to network drive..."
NETWORK_DIR="/mnt/backup_media_pc"

# Ensure mount point exists
if [ ! -d "$NETWORK_DIR" ]; then
    sudo mkdir -p "$NETWORK_DIR"
fi

# Attempt to mount (assumes cifs-utils is installed)
# Note: You may need to provide the password or have it in a credentials file
sudo mount -t cifs //192.168.1.212/Backup/Backup/Website_Test/ "$NETWORK_DIR" -o username=media-pc

# Copy files
rsync -av --exclude='.git' . "$NETWORK_DIR/"

# Unmount
sudo umount "$NETWORK_DIR"

echo "Network drive backup complete."

echo "Summary of changes:"
echo "$SUMMARY"

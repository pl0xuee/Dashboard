#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<'EOF'
Usage:
  ./backup_to_github_and_local.sh [options]

Options:
  -m, --message MESSAGE       Commit message (default: Backup <timestamp>)
  -d, --destination DIR       Local backup folder (default: ~/Backups/<project-name>)
  -r, --repo-url URL          GitHub remote URL to set as origin if missing
      --remote NAME           Remote name (default: origin)
      --branch NAME           Branch to push (default: current branch, else main)
      --no-push               Skip GitHub push and only make local backup
  -h, --help                  Show this help

Environment variables (optional):
  LOCAL_BACKUP_DIR            Same as --destination
  GITHUB_REPO_URL             Same as --repo-url
  REMOTE_NAME                 Same as --remote
  REMOTE_BRANCH               Same as --branch
EOF
}

log() {
  printf '[backup] %s\n' "$*"
}

warn() {
  printf '[backup][warn] %s\n' "$*" >&2
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$script_dir"
project_name="$(basename "$project_dir")"
timestamp="$(date +%Y%m%d_%H%M%S)"

commit_message="Backup ${timestamp}"
local_backup_dir="${LOCAL_BACKUP_DIR:-$HOME/Backups/$project_name}"
github_repo_url="${GITHUB_REPO_URL:-}"
remote_name="${REMOTE_NAME:-origin}"
remote_branch="${REMOTE_BRANCH:-}"
no_push=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    -m|--message)
      shift
      commit_message="${1:-}"
      ;;
    -d|--destination)
      shift
      local_backup_dir="${1:-}"
      ;;
    -r|--repo-url)
      shift
      github_repo_url="${1:-}"
      ;;
    --remote)
      shift
      remote_name="${1:-}"
      ;;
    --branch)
      shift
      remote_branch="${1:-}"
      ;;
    --no-push)
      no_push=1
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      warn "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
  shift
done

mkdir -p "$local_backup_dir"
archive_path="$local_backup_dir/${project_name}_${timestamp}.tar.gz"

log "Creating local archive backup at: $archive_path"
tar --exclude='.git' -czf "$archive_path" -C "$project_dir" .
log "Local backup complete"

cd "$project_dir"

if ! command -v git >/dev/null 2>&1; then
  warn "git is not installed; skipping GitHub backup"
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "No git repository found here. Initializing one..."
  git init >/dev/null
fi

if [ -z "$(git config --get user.name || true)" ] || [ -z "$(git config --get user.email || true)" ]; then
  warn "git user.name or user.email is not set. Local backup was created, but GitHub backup is skipped."
  warn "Set identity with: git config --global user.name \"Your Name\" and git config --global user.email \"you@example.com\""
  exit 0
fi

if ! git remote get-url "$remote_name" >/dev/null 2>&1; then
  if [ -n "$github_repo_url" ]; then
    log "Adding remote $remote_name -> $github_repo_url"
    git remote add "$remote_name" "$github_repo_url"
  else
    warn "No remote '$remote_name' exists and no --repo-url provided."
    warn "GitHub push skipped. Re-run with --repo-url <your-github-repo-url>."
    no_push=1
  fi
fi

git add -A

did_commit=0
if git diff --cached --quiet; then
  log "No file changes to commit"
else
  log "Creating commit: $commit_message"
  git commit -m "$commit_message"
  did_commit=1
fi

if [ "$no_push" -eq 1 ]; then
  log "Push disabled; finished with local backup${did_commit:+ and git commit}."
  exit 0
fi

if [ -z "$remote_branch" ]; then
  remote_branch="$(git branch --show-current || true)"
fi

if [ -z "$remote_branch" ]; then
  remote_branch="main"
  log "No current branch detected; creating branch '$remote_branch'"
  git checkout -b "$remote_branch" >/dev/null 2>&1 || git switch -c "$remote_branch"
fi

log "Pushing to $remote_name/$remote_branch"
git push -u "$remote_name" "$remote_branch"

log "GitHub backup complete"
log "Done: local archive + GitHub backup finished"
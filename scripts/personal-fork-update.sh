#!/usr/bin/env bash
# Update this Rerun fork checkout from upstream release tags and redeploy via docker compose.
#
# Usage:
#   scripts/personal-fork-update.sh check
#   scripts/personal-fork-update.sh update [--tag vX.Y.Z] [--no-build]
#   scripts/personal-fork-update.sh rebuild
#
# Expects remotes: upstream = rerun-build/rerun, origin = personal fork.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="$(git -C "$REPO" branch --show-current)"
ACTION="${1:-check}"
shift || true

TAG=""
DO_BUILD="yes"

while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="${2:-}"; shift 2 ;;
    --no-build) DO_BUILD="no"; shift ;;
    -h|--help)
      sed -n '1,20p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

latest_tag() {
  git -C "$REPO" tag --list 'v*' --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1
}

current_base() {
  git -C "$REPO" describe --tags --abbrev=0 2>/dev/null || echo "none"
}

fetch_upstream() {
  echo "-- fetching upstream --"
  git -C "$REPO" fetch upstream --tags --prune
  git -C "$REPO" fetch origin --prune >/dev/null 2>&1 || true
}

compose_redeploy() {
  if [ "$DO_BUILD" != "yes" ]; then
    echo "-- skipping docker build/restart (--no-build) --"
    return
  fi
  echo "-- rebuilding and restarting docker compose services --"
  (cd "$REPO" && docker compose up -d --build)
}

case "$ACTION" in
  check)
    fetch_upstream
    latest="$(latest_tag || true)"
    base="$(current_base)"
    echo "branch: $BRANCH"
    echo "current tag/base: $base"
    echo "latest upstream release: ${latest:-none}"
    if [ -n "${latest:-}" ] && git -C "$REPO" merge-base --is-ancestor "$latest" HEAD; then
      echo "status: up to date with $latest"
    elif [ -n "${latest:-}" ]; then
      echo "status: update available -> $latest"
      echo "run: scripts/personal-fork-update.sh update${TAG:+ --tag $TAG}"
    else
      echo "status: no release tags found"
    fi
    ;;
  rebuild)
    compose_redeploy
    ;;
  update)
    fetch_upstream
    target="$TAG"
    if [ -z "$target" ]; then
      target="$(latest_tag || true)"
    fi
    if [ -z "$target" ]; then
      echo "ERROR: no upstream release tag found" >&2
      exit 1
    fi
    if git -C "$REPO" merge-base --is-ancestor "$target" HEAD; then
      echo "Already includes $target. Redeploying current state."
      compose_redeploy
      exit 0
    fi
    echo "-- merging $target into $BRANCH --"
    backup="backup/personal-pre-update-$(date -u +%Y%m%d-%H%M%S)"
    git -C "$REPO" branch "$backup" "$BRANCH" >/dev/null 2>&1 || true
    if ! git -C "$REPO" merge --no-edit "$target"; then
      conflicts="$(git -C "$REPO" diff --name-only --diff-filter=U | paste -sd, -)"
      git -C "$REPO" merge --abort
      echo "CONFLICT: merge of $target stopped and was aborted (backup branch: $backup)." >&2
      echo "Conflicts: ${conflicts:-unknown}" >&2
      echo "Resolve in the repo (git rerere replays recorded fixes), merge $target again, then run: scripts/personal-fork-update.sh rebuild" >&2
      exit 2
    fi
    echo "-- merged $target (backup: $backup) --"
    if git -C "$REPO" remote get-url origin >/dev/null 2>&1; then
      git -C "$REPO" push origin "$BRANCH" || echo "WARN: push to fork failed; merge is local"
    fi
    compose_redeploy
    echo "Updated to $target on $BRANCH"
    ;;
  *)
    echo "Unknown action: $ACTION (use check|update|rebuild)" >&2
    exit 1
    ;;
esac

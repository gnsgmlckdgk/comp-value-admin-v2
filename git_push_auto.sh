#!/bin/sh
set -e

current_branch=$(git branch --show-current)

if [ -z "$1" ]; then
    echo "git message 입력 필요함"
    exit 1
fi

if [ "$current_branch" = "feature-ai" ]; then
    # 실행할 명령어들
    git add .
    git commit -m "$1"
    git checkout main
    git pull origin main
    git merge feature-ai
    git push origin main
    git checkout feature-ai
fi

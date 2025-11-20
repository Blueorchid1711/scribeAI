#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

REPO_NAME=${1:-scribeai}
VIS=${2:-public}

echo "1) creating .env.local from .env.example (if missing)"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "# Edit .env.local and add your GEMINI_API_KEY before running the app." >> .env.local
else
  echo ".env.local already exists — leaving as-is"
fi

echo "2) starting postgres container (docker-compose)"
docker compose -f docker/docker-compose.yml up -d

echo "3) installing npm deps"
npm install

echo "4) prisma generate"
npx prisma generate || true

echo "5) prisma migrate"
npx prisma migrate dev --name init || true

echo "6) preparing git branch"
git checkout -B feat/local-setup

echo "7) ignore .env.local"
if ! grep -q '^.env.local' .gitignore 2>/dev/null; then
  echo ".env.local" >> .gitignore
  git add .gitignore
  git commit -m "chore: ignore env" || true
fi

echo "8) commit safe files"
git add -A
git reset -- .env.local || true
git commit -m "chore: local setup" || true

echo "9) Done preparing. Create your GitHub repo manually if needed."
echo "Then run:"
echo "git remote add origin https://github.com/YOUR_USERNAME/${REPO_NAME}.git"
echo "git push -u origin feat/local-setup"

echo "DONE!"


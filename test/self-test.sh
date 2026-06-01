#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
mkdir -p "$tmp/bin"
cp "$ROOT/bin/evolution-review.js" "$tmp/bin/evolution-review.js"
cd "$tmp"
node bin/evolution-review.js --self-test

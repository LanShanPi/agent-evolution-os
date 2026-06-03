# Publish Checklist

Repository: `git@github.com:LanShanPi/agent-evolution-os.git`

## Local Verification

- [ ] `node --check bin/evolution-review.js`
- [ ] `npm run verify`
- [ ] `npm pack --dry-run`

## Privacy / Safety Scan

Run from repo root:

```bash
grep -RIn -E '蓝山|志理|/Users/hzl|hzl|secret|token|password|api[_-]?key' . \
  --exclude-dir=.git \
  --exclude=PUBLISH_CHECKLIST.md
```

Expected: no private user/workspace references.

## Package Content Check

Confirm `npm pack --dry-run` includes only expected files:

- `bin/`
- `docs/` including `RUNTIME_LOOP.md`
- `templates/` including `templates/memory/evolution-os/RUNTIME_LOOP.md`
- `examples/`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `package.json`

It should not include local runtime records from real usage:

- real `reports/`
- real `archive/`
- real `promoted/`
- personal memory files

## First Git Commit

```bash
git init
git branch -M main
git add .
git commit -m "initial agent evolution os draft"
git remote add origin git@github.com:LanShanPi/agent-evolution-os.git
```

## Push

Push only after user confirmation:

```bash
git push -u origin main
```

## Not Publishing Yet

Do not run these until explicitly approved:

```bash
npm publish
# or any ClawHub / skill registry publish command
```

## Current Release Boundary

`0.1.0-draft` is a file-system-first draft:

- review/draft CLI;
- init/self-check/self-test;
- templates;
- examples;
- docs, including Runtime Loop theory;
- no automatic apply;
- no deletion;
- no uploads;
- no training.

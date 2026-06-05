# Evolution OS Examples

这些 examples 用来演示 Evolution OS 的核心审计能力，也可以作为后续 GitHub repo / CI fixture 的种子。

## 内容

```text
examples/
  README.md
  inbox/
    candidate-duplicate-a.md
    candidate-duplicate-b.md
    candidate-expired.md
  memory/
    MEMORY.before.md
  skills/
    fixture-large-skill/SKILL.md
  expected/
    review-snippet.md
    memory-distill-snippet.md
    skill-audit-snippet.md
```

## 使用方式

建议只在临时 workspace 里使用 examples，不要直接复制到真实 inbox。

```bash
tmp=$(mktemp -d)
mkdir -p "$tmp/tools"
cp tools/evolution-review.js "$tmp/tools/evolution-review.js"
cd "$tmp"
node tools/evolution-review.js --init
```

复制 examples：

```bash
cp /path/to/repo/memory/evolution-os/examples/inbox/*.md memory/evolution-os/inbox/
cp /path/to/repo/memory/evolution-os/examples/memory/MEMORY.before.md MEMORY.md
mkdir -p skills/fixture-large-skill
cp /path/to/repo/memory/evolution-os/examples/skills/fixture-large-skill/SKILL.md skills/fixture-large-skill/SKILL.md
```

运行：

```bash
node tools/evolution-review.js --write-report
node tools/evolution-review.js --memory-distill
node tools/evolution-review.js --skill-audit
```

## 期望看到

- review 报告中出现 3 个 inbox candidates；
- `candidate-expired.md` 被标记 expired；
- duplicate A/B 被识别为 `exact-distilled-rule`；
- `MEMORY.before.md` 触发 workflow-like / many-bullets / large-section；
- fixture skill 触发 long-description / many-lines / large-skill。

## 边界

examples 是演示数据，不是推荐写入真实 memory 的内容。


## Built-in demo

Run a disposable end-to-end demo without touching your current workspace:

```bash
evolution-review --demo-run
```

The demo performs safe install, before-task, after-task with low-risk candidate capture, periodic usage, and readiness report inside a temporary directory.

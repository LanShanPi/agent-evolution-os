# Evolution OS 命令手册

所有命令默认在 workspace 根目录运行。

```bash
node tools/evolution-review.js [command] [options]
```

## 通用选项

### `--help`

显示命令帮助。

```bash
node tools/evolution-review.js --help
```

### `--json`

输出 JSON，方便脚本处理。

```bash
node tools/evolution-review.js --json
```

### `--write-report`

把当前报告写入：

```text
memory/evolution-os/reports/
```

示例：

```bash
node tools/evolution-review.js --write-report
```

## 初始化 / 自检

### `--init`

初始化 Evolution OS 最小文件系统结构。

```bash
node tools/evolution-review.js --init
```

会创建缺失的：

- `memory/evolution-os/` 目录结构；
- `memory/evolution-os/policy.md`；
- `memory/evolution-os/DESIGN.md`；
- `memory/evolution-os/config.json`；
- `memory/evolution-os/schemas/candidate-template.md`；
- `skills/self-evolution-governor/SKILL.md`。

不会覆盖已有文件，不会修改核心记忆文件。

JSON：

```bash
node tools/evolution-review.js --init --json
```

### `--init-config`

创建默认配置：

```text
memory/evolution-os/config.json
```

如果文件已存在，不覆盖。

```bash
node tools/evolution-review.js --init-config
```

### `--self-check`

检查 Evolution OS 必要文件、目录、config 和安全边界。

```bash
node tools/evolution-review.js --self-check
```

写报告：

```bash
node tools/evolution-review.js --self-check --write-report
```

失败时说明安装不完整或边界配置异常。

### `--self-test`

运行 fixture-based smoke test，验证核心能力。

```bash
node tools/evolution-review.js --self-test
```

验证内容：

- `--init` 后必要文件存在；
- `--init` 幂等且不覆盖；
- `--self-check` 通过；
- review 能识别 fixture candidates；
- decay expired 检测；
- duplicate candidate 检测；
- archive draft classifier；
- memory-distill flags；
- skill-audit flags。

注意：`--self-test` 会写入 fixture 文件。建议在临时 workspace 或测试目录中运行，不要直接在真实用户 workspace 跑。

JSON：

```bash
node tools/evolution-review.js --self-test --json
```

## 总览审计

### 默认审计

```bash
node tools/evolution-review.js
```

检查：

- inbox candidate；
- promoted/archive 数量；
- `MEMORY.md` 预算；
- policy 关键规则；
- candidate decay；
- duplicate candidates；
- warnings；
- next suggested actions。

JSON：

```bash
node tools/evolution-review.js --json
```

## Candidate 相关

### `--candidate <id-or-file>`

选择 inbox candidate。

可传：

- candidate id；
- 相对路径；
- 文件名。

示例：

```bash
node tools/evolution-review.js --candidate evo-20260601-0936-evolution-os-bootstrap
```

默认会输出 promotion suggestion。

### `--suggest-promotion`

生成晋升建议，不写文件。

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --suggest-promotion
```

输出包括：

- decision；
- blockers；
- suggested targets；
- distilled rule；
- suggested action；
- draft diff；
- verification checklist。

### `--promote-draft`

生成晋升草案文件。

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --promote-draft
```

输出位置：

```text
memory/evolution-os/promoted/<candidate-id>.draft.md
```

注意：只生成草案，不自动修改目标文件。

### `--archive-draft`

生成归档草案文件。

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --archive-draft \
  --reason rejected|merged|expired|superseded|manual-review|promoted
```

输出位置：

```text
memory/evolution-os/archive/<candidate-id>.archive-draft.md
```

注意：只生成草案，不自动删除 inbox candidate。

### `--reason <reason>`

配合 `--archive-draft` 使用。

允许值：

- `rejected`：拒绝；
- `merged`：已合并；
- `expired`：过期；
- `superseded`：被替代；
- `manual-review`：保留人工复核；
- `promoted`：已晋升后归档。

非法值会回退为 `manual-review`。

## MEMORY.md 相关

### `--memory-distill`

输出 `MEMORY.md` 蒸馏建议。

```bash
node tools/evolution-review.js --memory-distill
```

检查：

- 当前 bytes；
- target / soft limit；
- 大 section；
- bullet 过多；
- operational detail；
- workflow-like 内容。

### `--memory-distill-draft`

生成 `MEMORY.md` 压缩草案。

```bash
node tools/evolution-review.js --memory-distill-draft --write-report
```

报告位置：

```text
memory/evolution-os/reports/YYYY-MM-DD-memory-distill-draft.md
```

注意：只给压缩方向和 checklist，不自动改 `MEMORY.md`。

## Skill 相关

### `--skill-audit`

审计 workspace 内 skills。

```bash
node tools/evolution-review.js --skill-audit
```

检查：

- frontmatter；
- name；
- description；
- description length；
- skill bytes / lines；
- code block 数量；
- duplicate names；
- similar trigger descriptions。

写报告：

```bash
node tools/evolution-review.js --skill-audit --write-report
```

### `--all-skills`

配合 `--skill-audit`，包含全局 skill 目录。

```bash
node tools/evolution-review.js --skill-audit --all-skills
```

当前会扫描：

```text
skills/
.agents/skills/
~/.agents/skills/
~/.openclaw/skills/
```

### `--suggest-cleanup-candidates`

配合 `--skill-audit`，把审计发现转换成 Evolution OS candidate 草案，写入：

```text
memory/evolution-os/inbox/
```

示例：

```bash
node tools/evolution-review.js --skill-audit --suggest-cleanup-candidates
```

也可以包含全局 skills：

```bash
node tools/evolution-review.js --skill-audit --all-skills --suggest-cleanup-candidates
```

会针对以下问题生成 cleanup candidate：

- flagged skill：frontmatter、description、体积、行数、code block 等问题；
- duplicate skill names；
- similar trigger descriptions。

边界：只生成 candidate 草案，不修改 skill，不删除或归档任何文件。

## 推荐工作流

### 新经验进入候选池

```text
写 candidate → node tools/evolution-review.js --write-report
```

### 候选准备晋升

```bash
node tools/evolution-review.js --candidate <id> --suggest-promotion
node tools/evolution-review.js --candidate <id> --promote-draft
```

### 候选不该晋升

```bash
node tools/evolution-review.js --candidate <id> --archive-draft --reason rejected
```

### 定期维护

```bash
node tools/evolution-review.js --write-report
node tools/evolution-review.js --memory-distill --write-report
node tools/evolution-review.js --skill-audit --write-report
```

## 当前不会做的事

命令不会：

- 自动修改 `MEMORY.md` / `AGENTS.md` / `SOUL.md`；
- 自动删除 inbox candidate；
- 自动发布 skill/plugin；
- 自动训练模型；
- 自动上传任何数据。

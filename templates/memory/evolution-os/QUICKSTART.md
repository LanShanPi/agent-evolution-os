# Evolution OS Quickstart

目标：5 分钟跑通文件系统版 Evolution OS。

## 1. 初始化 / 确认安装

如果 workspace 还没有 Evolution OS 目录，先运行：

```bash
node tools/evolution-review.js --init
```

然后安装 skill（默认写入 `~/.agents/skills/self-evolution-governor/SKILL.md`，不会覆盖已有文件）：

```bash
evolution-review --install-adapter
```

然后在 workspace 根目录运行：

```bash
node tools/evolution-review.js --self-check
```

看到：

```text
Overall: PASS
```

说明目录、配置和安全边界齐全。

## 2. 看当前状态

```bash
node tools/evolution-review.js
```

常见输出包括：

- inbox candidate 数量；
- promoted/archive 记录数量；
- `MEMORY.md` 大小；
- policy 检查；
- duplicate groups；
- warnings；
- next suggested actions。

写入报告：

```bash
node tools/evolution-review.js --write-report
```

## 3. 捕获一条候选经验

新经验不要直接写进核心文件，先在 `memory/evolution-os/inbox/` 新建 candidate。

建议从模板复制：

```text
memory/evolution-os/schemas/candidate-template.md
```

候选文件建议命名：

```text
memory/evolution-os/inbox/evo-YYYYMMDD-HHMM-short-topic.md
```

候选必须包含：

- frontmatter：`id/type/source/confidence/status/scope/created/decay/risk`；
- 正文：`Signal`、`Proposed Learning`、`Why It Matters`、`Promotion Criteria`、`Rejection Criteria`。

## 4. 审计候选

```bash
node tools/evolution-review.js --write-report
```

重点看：

- missing fields；
- missing sections；
- decay status；
- duplicate groups；
- warnings。

## 5. 生成晋升建议

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --suggest-promotion
```

如果只是想要草案包：

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --promote-draft
```

草案会写到：

```text
memory/evolution-os/promoted/<candidate-id>.draft.md
```

## 6. 归档不需要晋升的候选

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --archive-draft \
  --reason rejected|merged|expired|superseded|manual-review|promoted
```

归档草案会写到：

```text
memory/evolution-os/archive/<candidate-id>.archive-draft.md
```

注意：当前命令只生成草案，不会删除 inbox 原文件。

## 7. 审计 MEMORY.md

```bash
node tools/evolution-review.js --memory-distill
```

生成压缩草案：

```bash
node tools/evolution-review.js --memory-distill-draft --write-report
```

草案只给迁移/压缩建议，不自动改 `MEMORY.md`。

## 8. 审计 skills

```bash
node tools/evolution-review.js --skill-audit
```

包含全局 skills：

```bash
node tools/evolution-review.js --skill-audit --all-skills
```

重点看：

- missing frontmatter；
- description 过长；
- skill 体积过大；
- 重名 skill；
- trigger/description 高相似。

## 9. 日常使用节奏

推荐节奏：

```text
用户纠正 / 任务失败 / 重复流程
→ 写 candidate
→ review
→ promote/archive draft
→ 人或 Agent 手动应用最小变更
→ 再 review 验证
```

核心原则：

> 经验先候选，核心文件只收压缩后、会改变未来行为的规则。


## Runtime Hook 快速接入

如果宿主系统支持任务生命周期 hook，优先调用这些命令，而不是让模型手写 prepare/reflect。

任务前：

```bash
evolution-review --before-task --task "<task>"
```

任务后：

```bash
evolution-review --after-task --task "<task>" --outcome "<outcome>"
```

任务后如果允许低/中风险候选自动进入 inbox：

```bash
evolution-review --after-task --task "<task>" --outcome "<outcome>" --write-candidate
```

定期：

```bash
evolution-review --periodic-usage
```

这三个命令会把 usage 写入 `memory/evolution-os/runtime/usage-log.jsonl`，用于后续判断经验是否有效、过时或需要修订。

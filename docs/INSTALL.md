# Evolution OS 安装说明

_阶段：文件系统版 / 可复制套件草案_

## 前置条件

- Node.js 18+。
- 一个以项目根目录作为 workspace 的 Agent 工作区。
- 当前版本不需要网络、不上传数据、不训练模型。

## 安装内容

最小安装需要复制这些路径到目标 workspace：

```text
memory/evolution-os/
  README.md
  DESIGN.md
  PRODUCT.md
  policy.md
  config.json
  inbox/
  promoted/
  archive/
  reports/
  schemas/
  training-corpus/
skills/self-evolution-governor/SKILL.md
tools/evolution-review.js
```

如果目标 workspace 已有自己的 memory/skills/tools 结构，按目录合并，不要覆盖用户已有文件。

## 安装步骤

### 1. 复制文件

把上述目录复制到目标 workspace。

如果只复制了脚本，也可以先放到：

```text
tools/evolution-review.js
```

然后运行整套初始化：

```bash
node tools/evolution-review.js --init
```

`--init` 只创建缺失的 Evolution OS 文件/目录，不覆盖已有文件，也不会修改 `MEMORY.md` / `AGENTS.md` / `SOUL.md`。

### 2. 初始化配置

在目标 workspace 根目录运行：

```bash
node tools/evolution-review.js --init-config
```

如果 `memory/evolution-os/config.json` 已存在，命令不会覆盖。

### 3. 自检

```bash
node tools/evolution-review.js --self-check
```

期望输出：

```text
Overall: PASS
```

如需留报告：

```bash
node tools/evolution-review.js --self-check --write-report
```

报告会写入：

```text
memory/evolution-os/reports/YYYY-MM-DD-self-check.md
```

## 安全边界

当前文件系统版默认只做：

- 捕获候选；
- 审计；
- 生成建议；
- 生成 promotion/archive/distill 草案；
- 留痕。

默认不会：

- 自动修改 `MEMORY.md` / `AGENTS.md` / `SOUL.md`；
- 自动删除记忆；
- 自动发布 skill/plugin；
- 自动训练模型；
- 自动上传数据。

这些边界写在：

```text
memory/evolution-os/config.json
```

其中 `boundaries.*` 当前必须保持 `false`。

## 安装后第一条验证

```bash
node tools/evolution-review.js --write-report
node tools/evolution-review.js --memory-distill
node tools/evolution-review.js --skill-audit
```

如果没有 inbox candidate，review 应显示：

```text
Inbox candidates: 0
Warnings: None
```

## 卸载

当前没有自动卸载命令。手动卸载时只删除 Evolution OS 自己的文件：

```text
memory/evolution-os/
skills/self-evolution-governor/
tools/evolution-review.js
```

不要删除用户原有的 `MEMORY.md`、`AGENTS.md`、`SOUL.md`、`TOOLS.md` 或其它 skill。

## 当前限制

- 还不是 npm package。
- 还没有独立 `--init` 初始化整套目录。
- 还没有 fixture-based self-test。
- 还没有 OpenClaw tool plugin 强约束层。

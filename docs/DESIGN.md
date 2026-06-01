# Evolution OS 设计文档

_创建时间：2026-06-01_

## 1. 为什么要做

市面上很多“自进化”skill 或 memory 方案只解决了写入：发现经验后追加到核心文件、skill、长期记忆里。但它们缺少代谢机制，容易导致：

- 核心文件越来越长，启动上下文膨胀；
- 旧规则和新规则冲突；
- 一次性经验被误判成长期偏好；
- 失败草稿、临时状态、工具噪音污染长期记忆；
- skill 只增不减，流程越来越重；
- 如果未来做参数训练，脏数据会被固化进模型。

Evolution OS 的目标不是“让 Agent 更会往自己脑子里写东西”，而是建立一个可审计、可遗忘、可晋升、可回滚的进化代谢系统。

核心判断：

> 写入不是进化；经过分类、压缩、验证、晋升、使用、评估、遗忘后，才叫进化。

## 2. 设计原则

1. **默认候选池**：新经验先进入 `memory/evolution-os/inbox/`，不直接写核心文件。
2. **核心文件少而精**：`MEMORY.md`、`AGENTS.md`、`SOUL.md`、`TOOLS.md`、skill 只能接收会改变未来行为的蒸馏内容。
3. **遗忘是内建能力**：候选、记忆、skill 都必须允许归档、合并、降级或删除。
4. **高影响变更先审计**：涉及人格、全局协议、安全策略、权限、调度、外部发布、参数训练的变更必须先生成草案和 diff。
5. **参数进化靠后**：训练语料只能来自已验证、蒸馏后的经验，不直接使用原始对话。
6. **先文件系统，后插件，但目标是产品化**：早期用协议 + skill + 本地脚本跑通；中期补齐 init/config/help/test/quickstart，做到别人可复制使用；后期封装 OpenClaw plugin 做强约束工具。

## 3. 系统形态

Evolution OS 不是单个 skill，也不是一开始就做成插件。它分四层：

```text
Protocol  →  Skill  →  Review/Draft Tool  →  Future Plugin
规则层       执行层     审计/草案层            强约束层
```

### 3.1 Protocol：规则层

位置：`memory/evolution-os/policy.md`

负责定义：

- 什么可以写；
- 写到哪里；
- 什么必须进候选池；
- 什么需要人工确认；
- 什么应该遗忘；
- 什么可以进入训练语料；
- 风险分级；
- review 节奏。

### 3.2 Skill：执行层

位置：`skills/self-evolution-governor/SKILL.md`

负责让 Agent 在实际任务中遵守 Evolution OS：

- 用户纠正时触发；
- 任务失败时触发；
- 重复流程准备 skill 化时触发；
- 准备写核心文件前触发；
- 讨论自进化、遗忘、参数进化时触发。

### 3.3 Review/Draft Tool：审计层

位置：`tools/evolution-review.js`

当前是本地脚本，不是插件。职责：

- 扫描 inbox；
- 检查候选格式；
- 检查候选 decay 状态；
- 检查重复候选（同 ID、同蒸馏规则、同类型/范围的高相似候选）；
- 检查 `MEMORY.md` 大小；
- 检查 policy 关键规则；
- 生成 review report；
- 生成 promotion suggestion；
- 生成 promote draft 变更包；
- 生成 archive draft 归档草案；
- 生成 `MEMORY.md` 蒸馏建议（预算、分段、迁移建议），不自动修改；
- 生成 `MEMORY.md` 压缩草案，不自动修改；
- 生成 skill 审计报告（frontmatter、description 长度、体积、重复名称/触发相似度），不自动修改；
- 可将 skill 审计发现转换为 cleanup candidate 草案，仍不自动修改 skill；
- 提供 CLI help、config 初始化、自检，支撑后续产品化。

### 3.4 Productization：产品化层

位置：`memory/evolution-os/PRODUCT.md`

负责定义：

- 目标用户；
- 交付形态；
- 可用性标准；
- 从文件系统版到 skill package 再到 plugin 的路线；
- 发布前缺口。

### 3.5 Future Plugin：强约束层

暂不实现。等流程稳定后再做 OpenClaw plugin。

未来插件负责机械护栏：

- 写入前强制备份；
- 自动 diff；
- 核心文件大小限制；
- 候选状态迁移；
- 重复检测；
- 归档/回滚；
- 变更审计日志。

## 4. 目录结构

```text
memory/evolution-os/
  README.md
  DESIGN.md
  policy.md
  inbox/
  promoted/
  archive/
  reports/
  schemas/
  examples/
  training-corpus/
  config.json
skills/self-evolution-governor/
  SKILL.md
tools/
  evolution-review.js
```

说明：

- `inbox/`：候选经验默认入口。
- `promoted/`：晋升草案和晋升记录。
- `archive/`：过期、拒绝、合并、降级的内容。
- `reports/`：审计报告。
- `schemas/`：候选模板。
- `examples/`：演示/测试样例，可复制到临时 workspace 验证 review/distill/audit。
- `training-corpus/`：未来参数进化语料草案。
- `config.json`：预算、阈值、安全边界配置；默认边界不允许自动改核心文件、删除记忆、发布 skill/plugin、训练或上传数据。

## 5. 候选状态机

```text
candidate → validated → promoted → monitored → archived
          ↘ rejected  ↘ merged
```

含义：

- `candidate`：刚捕获，尚未验证。
- `validated`：确认有用，落点明确。
- `promoted`：已写入核心载体或转成 skill/tool note/hard case。
- `monitored`：已启用，观察是否真的改善行为。
- `merged`：和旧规则合并，不单独保留。
- `rejected`：不值得沉淀。
- `archived`：过期、低价值或被替代，保留可追溯记录。

## 6. 当前已完成

### 6.1 文件与目录

已创建：

- `memory/evolution-os/README.md`
- `memory/evolution-os/DESIGN.md`
- `memory/evolution-os/PRODUCT.md`
- `memory/evolution-os/INSTALL.md`
- `memory/evolution-os/QUICKSTART.md`
- `memory/evolution-os/COMMANDS.md`
- `memory/evolution-os/REPO_PLAN.md`
- `memory/evolution-os/CHANGELOG.md`
- `memory/evolution-os/VERSION`
- `memory/evolution-os/policy.md`
- `memory/evolution-os/config.json`
- `memory/evolution-os/examples/README.md`
- `memory/evolution-os/examples/inbox/candidate-duplicate-a.md`
- `memory/evolution-os/examples/inbox/candidate-duplicate-b.md`
- `memory/evolution-os/examples/inbox/candidate-expired.md`
- `memory/evolution-os/examples/memory/MEMORY.before.md`
- `memory/evolution-os/examples/skills/fixture-large-skill/SKILL.md`
- `memory/evolution-os/examples/expected/review-snippet.md`
- `memory/evolution-os/examples/expected/memory-distill-snippet.md`
- `memory/evolution-os/examples/expected/skill-audit-snippet.md`
- `memory/evolution-os/schemas/candidate-template.md`
- `memory/evolution-os/archive/evo-20260601-0936-evolution-os-bootstrap.md`
- `memory/evolution-os/promoted/evo-20260601-0936-evolution-os-bootstrap.draft.md`
- `memory/evolution-os/promoted/evo-20260601-0936-evolution-os-bootstrap.log.md`
- `memory/evolution-os/reports/2026-06-01-bootstrap.md`
- `memory/evolution-os/reports/2026-06-01-review.md`
- `memory/evolution-os/reports/2026-06-01-promotion-evo-20260601-0936-evolution-os-bootstrap.md`
- `skills/self-evolution-governor/SKILL.md`
- `tools/evolution-review.js`

### 6.2 已实现命令

审计：

```bash
node tools/evolution-review.js
node tools/evolution-review.js --json
node tools/evolution-review.js --write-report
node tools/evolution-review.js --help
node tools/evolution-review.js --init
node tools/evolution-review.js --init-config
node tools/evolution-review.js --self-check
node tools/evolution-review.js --self-test
node tools/evolution-review.js --self-check --write-report
```

晋升建议：

```bash
node tools/evolution-review.js \
  --candidate evo-20260601-0936-evolution-os-bootstrap \
  --suggest-promotion
```

生成晋升草案包：

```bash
node tools/evolution-review.js \
  --candidate evo-20260601-0936-evolution-os-bootstrap \
  --promote-draft
```

生成归档草案包：

```bash
node tools/evolution-review.js \
  --candidate <candidate-id> \
  --archive-draft \
  --reason rejected|merged|expired|superseded|manual-review|promoted
```

生成 `MEMORY.md` 蒸馏建议：

```bash
node tools/evolution-review.js --memory-distill
node tools/evolution-review.js --memory-distill --write-report
```

生成 `MEMORY.md` 压缩草案：

```bash
node tools/evolution-review.js --memory-distill-draft
node tools/evolution-review.js --memory-distill-draft --write-report
```

生成 skill cleanup candidate 草案：

```bash
node tools/evolution-review.js --skill-audit --suggest-cleanup-candidates
node tools/evolution-review.js --skill-audit --all-skills --suggest-cleanup-candidates
```

### 6.3 当前第一条候选

候选：`evo-20260601-0936-evolution-os-bootstrap`

蒸馏规则：

> Agent 自进化应采用“协议 + skill + 可选插件 + 训练语料出口”的形式：协议定义写入、晋升、遗忘、审计、风险分级；skill 指导 Agent 在具体任务中执行协议；插件留到流程稳定后再实现强约束工具；参数进化只使用已验证、蒸馏后的训练样本，不直接使用原始对话。

当前建议：已完成第一条完整闭环：candidate → review → promotion suggestion → promote draft → apply → promoted log → archive source → post-review。

### 6.4 产品化目标

产品化目标：目标不是停在 MVP，而是做成实际可用、可直接给别人用的 Evolution OS。

因此后续路线从“能跑”升级为“可安装、可解释、可测试、可分发”：

- 增加 `PRODUCT.md`；
- 补齐 CLI help、config、init/self-check；
- 去除个人上下文绑定描述，抽象成通用 Agent evolution governance；
- 后续整理为 skill package / OpenClaw plugin。

## 7. 正在做

当前阶段：**MVP / 文件系统治理阶段**。

正在补齐：

- duplicate candidates 检查已接入 review，可提示 merge/archive；
- 候选 decay 检查已接入 review，已用临时过期候选验证；
- archive draft 已实现，已用临时过期候选验证；
- `MEMORY.md` 蒸馏建议已实现，可输出预算、分段 flags、迁移建议；
- `MEMORY.md` 压缩草案已实现，可输出迁移方向和 apply checklist；
- skill 审计已实现，可检查 frontmatter、description、体积、重复名称/相似触发；
- skill cleanup candidate 已实现，可把 flagged/duplicate/similar skill 审计结果写入 inbox 候选；
- `config.json` 已实现，用于集中配置 memory/候选/skill 阈值和安全边界；
- CLI help 已实现，脚本可自描述；
- `--init` 已实现，可在新 workspace 创建缺失目录、policy、schema、governor skill、config；不会覆盖已有文件；
- self-check 已实现，可验证必要文件/目录/config/安全边界；
- self-test 已实现，可用 fixture 验证 init/review/decay/duplicate/archive/memory/skill 审计主链路；
- 产品化文档已建立，已补 `INSTALL.md` / `QUICKSTART.md` / `COMMANDS.md`；
- 下一步做 GitHub repo/package 结构整理；
- 暂不自动应用核心文件变更。

## 8. 后续计划

### Phase 1：闭环跑通

- [x] 建立 policy。
- [x] 建立 governor skill。
- [x] 建立 inbox / reports / promoted / archive / training-corpus。
- [x] 实现只读 review。
- [x] 实现 promotion suggestion。
- [x] 实现 promote draft。
- [x] 手动应用第一条 promotion，验证候选晋升流程。
- [x] 将源候选归档，并写 promoted log。

### Phase 2：代谢能力

- [x] 实现 `--archive-candidate` 草案模式（当前命令名：`--archive-draft`），用于拒绝/合并/过期归档。
- [x] 实现重复候选检测。
- [x] 实现候选 decay 检查。
- [x] 实现 `MEMORY.md` 蒸馏建议，不自动改。
- [x] 实现 `MEMORY.md` 压缩草案，不自动改。
- [x] 实现 skill 体积/重复规则审计。
- [x] 实现 `config.json` + CLI help + self-check。

### Phase 2.5：可复制工具化

- [x] 补 `INSTALL.md` / `QUICKSTART.md` / `COMMANDS.md`。
- [x] 做 `--init`，初始化目录、policy、schema、governor skill、config。
- [x] 做 self-test fixture，固定验证 duplicate/decay/archive/memory/skill 审计输出。
- [x] 增加 examples，用于演示 candidate/review/promote/archive。
- [x] 抽象掉个人上下文描述，形成通用 Agent evolution governance 包。
- [x] 增加 `REPO_PLAN.md` / `CHANGELOG.md` / `VERSION`。

### Phase 2.6：GitHub 项目化准备

- [x] 整理目标 repo 目录结构。
- [x] 生成 package.json / LICENSE / 顶层 README 草案。
- [x] 将脚本迁移映射到 `bin/evolution-review.js`。
- [x] 准备 GitHub Actions self-test。
- [x] `--init` 优先读取 package templates，缺失时回退内嵌模板。
- [x] 为 skill 审计增加“生成清理候选/归档草案”模式。

### Phase 2.7：Runtime 使用/评估闭环

- [x] 实现 `--prepare --task`，任务前检索相关经验与检查清单。
- [x] 实现 `--reflect --task --outcome`，任务后评估成功/失败/纠正信号与经验复用情况。
- [x] 实现 `--reflect --write-candidate`，显式把低/中风险反思写入 inbox candidate。
- [x] 增加 reflect → review → promote/archive 的端到端 fixture。
- [x] 增加 lesson reuse 统计与后续监控报告。
- [x] 为 prepared-but-not-applied lessons 生成 cleanup candidate，接入遗忘/压缩审查。
- [x] 增加 cleanup threshold，默认 prepared >= 3 且 applied = 0 才建议 cleanup。
- [x] 增加 effective promotion threshold，默认 applied >= 3 才建议强化触发位置。

### Phase 3：强约束工具

- [ ] 把稳定脚本封装成 OpenClaw tool plugin。
- [ ] 插件提供候选新增、审计、晋升草案、归档、回滚工具。
- [ ] 核心文件写入前强制 diff 与大小护栏。

### Phase 4：参数进化出口

- [ ] 定义 training sample schema。
- [ ] 从 hard-cases 和用户纠正中蒸馏训练样本。
- [ ] 区分 SFT / preference / RL 样本。
- [ ] 只使用验证后的样本进入训练语料。

## 9. 当前边界

Evolution OS 目前不会：

- 自动修改 `MEMORY.md`；
- 自动修改 `AGENTS.md` / `SOUL.md`；
- 自动删除记忆；
- 自动发布 skill/plugin；
- 自动训练模型；
- 自动上传任何数据。

它现在只做：

- 捕获；
- 审计；
- 建议；
- 生成草案；
- 留痕。

## 10. 下一步推荐动作

回到原始目标：先完成 runtime loop，而不是继续包装发布。

优先级：

1. 增加 reflect → write-candidate → review → promote/archive 的端到端 fixture；
2. 让 `--prepare` 能读取最近 reflect/promoted 结果，形成“用过/没用过”的反馈；
3. 再考虑 OpenClaw skill package / plugin 化。

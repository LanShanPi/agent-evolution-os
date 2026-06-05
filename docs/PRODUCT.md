# Evolution OS 产品化路线

_目标：从本地 MVP 演进为可实际使用、可安装、可审计、可交付给别人用的自进化治理系统。_

## 产品定位

Evolution OS 是给长期运行 Agent 用的“自进化治理层 + 运行时反馈层”。

它不替 Agent 做决定，而是提供一套安全代谢机制：

```text
治理闭环：捕获经验 → 候选池 → 审计 → 晋升/归档草案 → 人/Agent 审查 → 应用 → 留痕 → 遗忘/蒸馏
运行时闭环：任务前 prepare → 任务执行 → 任务后 reflect → usage report → 强化/修订/清理候选
```

核心卖点：

- 防止 memory/skill 只增不减；
- 防止核心文件被污染；
- 让自进化可审计、可回滚；
- 给未来参数进化提供干净训练语料；
- 可先作为文件系统工具使用，后续插件化；
- 通过 prepare/reflect/usage-report 验证经验是否真的影响未来行为；
- 明确进化对象和自动化边界，避免“自进化”变成任意自改。

## 目标用户

1. 使用 OpenClaw / Claude Code / Codex 类长期 Agent 的个人用户。
2. 有多个 agent / skill / memory 文件，需要治理的人。
3. 想做 agent 自进化，但担心无限写入和规则污染的开发者。
4. 未来需要把经验蒸馏成训练数据的团队。

## 交付形态

### v0：文件系统版

当前阶段。

包含：

- `memory/evolution-os/` 协议与数据目录；
- `skills/self-evolution-governor/SKILL.md`；
- `tools/evolution-review.js`；
- 文档、schema、报告；
- 实验性 runtime loop：`--prepare`、`--reflect`、`--usage-report`，用于让经验进入任务前检查并在任务后形成使用证据。

适合本地使用和快速迭代。

### v1：可复制套件

目标：别人可以复制一个目录到自己的 workspace，然后跑起来。

需要补齐：

- `INSTALL.md`；
- `QUICKSTART.md`；
- `COMMANDS.md`；
- 初始化脚本 `tools/evolution-init.js`；
- 配置文件 `memory/evolution-os/config.json`；
- 测试样例 `memory/evolution-os/examples/`；
- 最小测试命令。

### v2：OpenClaw skill package

目标：作为 agent adapter/package分发。

包含：

- governor agent adapter；
- review 脚本；
- 初始化模板；
- 使用说明。

限制：agent adapter 仍不能强约束写入，只能指导和调用脚本。它不是另一个项目，而是 `agent-evolution-os` 的语义入口层。

### v3：OpenClaw tool plugin

目标：提供强约束工具，让 agent 通过 typed tools 管理 evolution。

计划工具：

- `evolution_candidate_add`
- `evolution_review`
- `evolution_promote_draft`
- `evolution_archive_draft`
- `evolution_memory_distill`
- `evolution_skill_audit`
- `evolution_training_sample_draft`
- `evolution_status`

插件边界：

- 默认不直接改核心文件；
- apply 类工具必须显式确认；
- 高风险路径必须 block 或 require approval；
- 所有变更留审计记录。

## 可用性标准

Evolution OS 不是“能跑脚本”就算完成。可交付版本至少满足：

### 1. 安装可用

- 新 workspace 一条命令初始化；
- 不依赖个人私有路径；
- 能检测缺失目录并创建；
- 能解释每个文件用途。

### 2. 日常可用

- agent 被纠正后能生成 candidate；
- 能 review inbox；
- 能提示重复和过期；
- 能生成 promotion/archive draft；
- 能审计 memory 和 skills；
- 有清晰的人类确认边界。

### 3. 安全可用

- 不默认删除；
- 不默认覆盖核心文件；
- 不上传任何数据；
- 不自动训练；
- 高风险变更明确阻断。

`0.1.0-draft` 明确不包含自动修改全局人格/安全策略、自动发布、plugin 强制拦截、训练或上传训练数据。详见 `EVOLUTION_BOUNDARIES.md`。

### 4. 可维护

- 有设计文档；
- 有命令文档；
- 有测试样例；
- 有 changelog；
- 有版本号。

## 当前差距

当前已经有核心闭环和基础产品化文档，但还不是可分发产品。

缺口：

- Level 2 runtime hook commands 已实现；beforeTask / afterTask / periodicUsage 的宿主自动调用仍需集成；
- OpenClaw plugin 接口尚未实现；
- `--init` 仍主要使用内嵌模板，后续应优先读取 package templates。

## 近期路线

### Milestone A：可自用稳定版

- [x] candidate inbox
- [x] review report
- [x] promotion draft
- [x] archive draft
- [x] decay check
- [x] duplicate check
- [x] memory distill suggestions
- [x] skill audit
- [x] memory distill draft
- [x] CLI help
- [x] config.json
- [x] init-config/self-check

### Milestone B：可复制给别人用

- [x] `INSTALL.md`
- [x] GitHub installation docs for clone/npm/global install
- [x] `QUICKSTART.md`
- [x] `COMMANDS.md`
- [x] `examples/`
- [x] `evolution-init.js` 或 `--init`
- [x] `evolution-self-test.js` 或 fixture-based `--self-test`
- [x] 去除私有路径/个人上下文强绑定描述
- [x] version/changelog
- [x] repo plan

### Milestone C：可发布版本

- [x] 整理为独立目录/package 草案
- [x] package.json bin 命令草案
- [x] GitHub Actions self-test 草案
- [ ] 测试套件正式化
- [ ] OpenClaw agent adapter/package
- [ ] ClawHub 发布准备

### Milestone D：宿主融合 / 插件化

- [ ] 标准化 Core Entry 安装片段
- [ ] 安装 self-evolution-governor agent adapter
- [x] beforeTask / afterTask / periodicUsage hook commands
- [x] Optional OpenClaw typed lifecycle hooks (disabled by default)

### Milestone E：插件化

- [ ] OpenClaw tool plugin scaffold
- [ ] typed tools
- [ ] permission / approval policy
- [ ] integration tests
- [ ] 可回滚变更日志

## 产品原则

1. **先安全，再自动化**。
2. **先建议，再应用**。
3. **先文件系统透明，再插件封装**。
4. **所有进化都要可解释、可审计、可回滚**。
5. **真正的自进化必须包括遗忘**。


## Readiness additions

- One-command install: `evolution-review --install`.
- Unattended-safe install: `evolution-review --install --unattended-safe`.
- Unattended evolution is tiered: low-risk candidate capture can run automatically; core edits, deletion, publishing, external upload, training, and permission expansion require approval.

# Evolution OS 产品化路线

_目标：从本地 MVP 演进为可实际使用、可安装、可审计、可交付给别人用的自进化治理系统。_

## 产品定位

Evolution OS 是给长期运行 Agent 用的“自进化治理层”。

它不替 Agent 做决定，而是提供一套安全代谢机制：

```text
捕获经验 → 候选池 → 审计 → 晋升/归档草案 → 人/Agent 审查 → 应用 → 留痕 → 遗忘/蒸馏
```

核心卖点：

- 防止 memory/skill 只增不减；
- 防止核心文件被污染；
- 让自进化可审计、可回滚；
- 给未来参数进化提供干净训练语料；
- 可先作为文件系统工具使用，后续插件化。

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
- 文档、schema、报告。

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

目标：作为 skill 包分发。

包含：

- governor skill；
- review 脚本；
- 初始化模板；
- 使用说明。

限制：skill 仍不能强约束写入，只能指导和调用脚本。

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

### 4. 可维护

- 有设计文档；
- 有命令文档；
- 有测试样例；
- 有 changelog；
- 有版本号。

## 当前差距

当前已经有核心闭环和基础产品化文档，但还不是可分发产品。

缺口：

- 没有 `--init` / init 脚本初始化整套目录；
- 脚本路径和目录仍默认当前 workspace；
- 没有独立 package 结构；
- 没有 GitHub Actions；
- 没有 OpenClaw plugin 接口；
- 还没生成 package.json / LICENSE / 顶层 README 草案。

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
- [x] `QUICKSTART.md`
- [x] `COMMANDS.md`
- [x] `examples/`
- [x] `evolution-init.js` 或 `--init`
- [x] `evolution-self-test.js` 或 fixture-based `--self-test`
- [x] 去除私有路径/个人上下文强绑定描述
- [x] version/changelog
- [x] repo plan

### Milestone C：可发布版本

- [ ] 整理为独立目录/package
- [ ] package.json bin 命令
- [ ] 测试套件
- [ ] OpenClaw skill 包
- [ ] ClawHub 发布准备

### Milestone D：插件化

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

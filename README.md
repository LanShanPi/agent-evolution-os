# Evolution OS

Agent self-evolution governance system.

## Quick Install

From a target agent workspace:

```bash
npm install github:LanShanPi/agent-evolution-os
npx evolution-review --init
npx evolution-review --install-adapter
npx evolution-review --self-check
```

Then add the short Evolution OS entry from `docs/INSTALL.md` to your `AGENTS.md`, system prompt, or equivalent host instruction file.

Daily runtime hooks:

```bash
npx evolution-review --before-task --task "<task>"
npx evolution-review --after-task --task "<task>" --outcome "<outcome>"
npx evolution-review --periodic-usage
```

See `docs/INSTALL.md`, `docs/HOST_INTEGRATION.md`, and `docs/OPENCLAW_INTEGRATION.md`.

## Product Shape

`agent-evolution-os` is one project with multiple integration layers:

1. **CLI**: `evolution-review` for init, review, runtime hooks, reports, and audits.
2. **Workspace templates**: `memory/evolution-os/` policy, docs, schemas, and runtime directories.
3. **Agent adapter**: `self-evolution-governor`, installed into a skills directory so an agent knows when to call Evolution OS. This is not a separate project.
4. **Host integration docs**: how to connect Evolution OS to OpenClaw or another agent runtime.
5. **OpenClaw plugin scaffold**: `plugins/openclaw-evolution-os/` for command-based host integration now, future automatic lifecycle hooks and guardrails.

The agent adapter exists because current agent runtimes need a semantic trigger layer. The project remains a single package.

## 目录

- `policy.md`：自进化写入、晋升、遗忘、回滚规则。
- `inbox/`：候选经验默认入口。
- `promoted/`：已晋升记录和 promotion log。
- `archive/`：过期、合并、拒绝或降级内容。
- `reports/`：周期性审计报告。
- `schemas/`：候选、训练样本等模板。
- `examples/`：可复制到临时 workspace 的演示/测试样例。
- `training-corpus/`：未来参数进化数据草案，只放已验证蒸馏样本。
- `RUNTIME_LOOP.md`：运行时自进化闭环理论，定义 prepare/reflect/usage-report、usage log 与训练语料边界。
- `EVOLUTION_BOUNDARIES.md`：进化对象与自动化边界，回答到底进化什么、哪些必须确认、文件系统/plugin/参数训练边界。
- `HOST_INTEGRATION.md`：宿主集成指南，定义核心入口、skill、runtime hooks、plugin guardrails 如何让 Evolution OS 真正进入 Agent 行为链路。
- `OPENCLAW_INTEGRATION.md`：OpenClaw 集成蓝图，基于 OpenClaw internal hooks、typed plugin hooks、Plugin SDK host hooks 设计自动调用方案。
- `INSTALL.md`：安装/复制到新 workspace 的说明。
- `QUICKSTART.md`：日常最短使用流程。
- `COMMANDS.md`：命令参考手册。
- `REPO_PLAN.md`：未来 GitHub repo / package 结构草案。
- `repo-draft/`：当前 GitHub 项目骨架草案，不包含本地历史 reports/archive/promoted。
- `CHANGELOG.md`：版本变更记录。
- `VERSION`：当前草案版本号。

## 当前阶段

目标不是停在 MVP，而是做成实际可用、可复制给别人用、后续可插件化发布的 Evolution OS。

当前：文件系统版已跑通核心闭环；已补齐 config、CLI help、self-check/self-test、install/quickstart/commands 文档和 examples；已新增 Runtime Evolution Loop、Evolution Boundaries 与 Host Integration 文档，解释治理模式、运行时模式、进化对象、自动化权限、文件系统/plugin/参数训练边界，以及如何通过核心入口、skill、runtime hooks 和 plugin guardrails 真正接入宿主 Agent 行为链路。当前已提供 Level 2 runtime hook commands，并补充 OpenClaw 集成蓝图；下一步做 OpenClaw plugin scaffold 与 runtime 自动调用。

详见：`DESIGN.md`、`RUNTIME_LOOP.md`、`PRODUCT.md`、`INSTALL.md`、`QUICKSTART.md`、`COMMANDS.md`。


## OpenClaw Plugin Scaffold

This repo includes an early OpenClaw plugin scaffold under:

```text
plugins/openclaw-evolution-os/
```

It currently provides a native plugin manifest and command bridge:

```text
/evolution before <task>
/evolution after <task> -- <outcome>
/evolution usage
```

Local development install:

```bash
openclaw plugins install --link ./plugins/openclaw-evolution-os
openclaw plugins enable openclaw-evolution-os
openclaw gateway restart
openclaw plugins inspect openclaw-evolution-os --runtime --json
```

Automatic typed lifecycle hooks are intentionally left for the next implementation step.

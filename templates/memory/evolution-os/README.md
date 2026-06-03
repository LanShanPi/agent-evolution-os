# Evolution OS

Agent self-evolution governance system.

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
- `INSTALL.md`：安装/复制到新 workspace 的说明。
- `QUICKSTART.md`：日常最短使用流程。
- `COMMANDS.md`：命令参考手册。
- `REPO_PLAN.md`：未来 GitHub repo / package 结构草案。
- `repo-draft/`：当前 GitHub 项目骨架草案，不包含本地历史 reports/archive/promoted。
- `CHANGELOG.md`：版本变更记录。
- `VERSION`：当前草案版本号。

## 当前阶段

目标不是停在 MVP，而是做成实际可用、可复制给别人用、后续可插件化发布的 Evolution OS。

当前：文件系统版已跑通核心闭环；已补齐 config、CLI help、self-check/self-test、install/quickstart/commands 文档和 examples；已新增 Runtime Evolution Loop 理论文档，解释治理模式与运行时模式的边界；下一步做 GitHub repo/package 结构整理。

详见：`DESIGN.md`、`RUNTIME_LOOP.md`、`PRODUCT.md`、`INSTALL.md`、`QUICKSTART.md`、`COMMANDS.md`。

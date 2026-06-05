# OpenClaw Integration Blueprint

_创建时间：2026-06-05_

## 1. 目标

这份文档定义 Evolution OS 如何和 OpenClaw 原生扩展系统融合，让自进化不再依赖模型“想起来”，而是由宿主 runtime 在关键生命周期自动触发。

目标不是直接修改用户的 OpenClaw 安装包，而是给出可产品化的集成路线：

```text
Level 1: Core Entry + Skill
Level 2: Runtime Hook Commands
Level 2.5: OpenClaw internal hooks / typed plugin hooks
Level 3: Plugin Guardrails
```

当前 repo 已完成 Level 1 和 Level 2 文件系统版：

- `self-evolution-governor` skill；
- `--before-task`；
- `--after-task`；
- `--periodic-usage`。

本文件继续定义 OpenClaw 宿主侧如何自动调用这些能力。

## 2. OpenClaw 真实扩展面

基于本机 OpenClaw 文档与安装包：

- 插件文档：`/opt/homebrew/lib/node_modules/openclaw/docs/tools/plugin.md`
- 内部 hooks 文档：`/opt/homebrew/lib/node_modules/openclaw/docs/automation/hooks.md`
- Plugin SDK 文档：`/opt/homebrew/lib/node_modules/openclaw/docs/plugins/sdk-overview.md`

OpenClaw 有两类相关 hook 面。

### 2.1 Internal hooks

文档位置：`docs/automation/hooks.md`

适合：

- `/new`、`/reset`、`/stop`；
- `message:received`；
- `message:sent`；
- `agent:bootstrap`；
- `session:compact:before/after`；
- `gateway:startup/shutdown/pre-restart`；
- 粗粒度 command/lifecycle side effects。

文档明确：Internal hooks 是文件型自动化；如果需要 runtime lifecycle control，应优先 typed plugin hooks。

### 2.2 Typed plugin hooks

文档位置：`docs/tools/plugin.md` 与 `docs/plugins/sdk-overview.md`

OpenClaw 文档建议：

```text
Use typed hooks via api.on(...) for runtime lifecycle hooks.
```

Typed hooks 适合：

- middleware；
- policy；
- message rewriting；
- prompt shaping；
- tool control；
- 需要 priority / merge semantics / block-cancel 的 runtime 控制。

Plugin SDK 还提供 Host hooks / workflow plugin 相关能力：

- `api.session.workflow.enqueueNextTurnInjection(...)`
- `api.agent.events.registerAgentEventSubscription(...)`
- `api.runContext.setRunContext(...) / getRunContext(...) / clearRunContext(...)`
- `api.lifecycle.registerRuntimeLifecycle(...)`
- `api.session.workflow.registerSessionSchedulerJob(...)`
- `api.session.controls.registerControlUiDescriptor(...)`

这些能力适合把 Evolution OS 的 prepare 结果注入下一轮，把 reflect/usage 绑定到运行生命周期。

## 3. 集成原则

### 3.1 不直接改 OpenClaw 安装包

不要直接编辑：

```text
/opt/homebrew/lib/node_modules/openclaw/
```

原因：

- npm / Homebrew 更新会覆盖；
- 难以给别人复用；
- 难以通过插件 inspect / runtime 验证；
- 风险边界不清晰。

正确方式：

1. 先用 Core Entry + Skill；
2. 再用 Evolution OS CLI hook commands；
3. 再做 OpenClaw plugin；
4. 最后如有必要 upstream 到 OpenClaw core。

### 3.2 核心文件只放入口

OpenClaw workspace 的 `AGENTS.md` / `MEMORY.md` 不应承载大量经验。

它们只需要：

- 入口规则；
- 触发条件；
- 高风险确认边界。

具体经验仍在：

```text
memory/evolution-os/inbox/
memory/evolution-os/runtime/usage-log.jsonl
memory/hard-cases/
skills/
```

### 3.3 宿主自动化只负责触发，不负责批准高风险变更

OpenClaw integration 可以自动：

- before task prepare；
- after task reflect；
- periodic usage-report；
- 写 low/medium candidate；
- 注入 prepare checklist。

不可以自动：

- 修改 `AGENTS.md` / `SOUL.md`；
- 删除核心 memory；
- 发布 plugin / skill；
- 上传训练数据；
- 扩大工具权限。

## 4. 推荐架构

```text
OpenClaw runtime
  ├─ Core Entry / skill trigger
  ├─ Evolution OS CLI
  │    ├─ --before-task
  │    ├─ --after-task
  │    └─ --periodic-usage
  └─ Future plugin: openclaw-evolution-os
       ├─ typed hooks via api.on(...)
       ├─ agent event subscriptions
       ├─ next-turn injection
       ├─ session state extension
       └─ runtime lifecycle cleanup
```

## 5. Phase A：Internal hooks 可用方案

这是最小 OpenClaw 原生集成，不需要 typed plugin。适合先验证。 

### 5.1 agent:bootstrap

事件：`agent:bootstrap`

用途：在 bootstrap 注入一个极小 Evolution OS entry，确保 agent 知道何时调用。

适合动作：

- 检查 workspace 是否有 `memory/evolution-os/`；
- 如果存在，则向 `context.bootstrapFiles` 添加短入口文件或补充文本；
- 不注入大量经验；
- 不直接修改核心文件。

### 5.2 message:received

事件：`message:received`

用途：对明显触发词做轻量 before-task。

触发条件示例：

```text
继续
自进化
记住
下次
以后都这样
不是，我是说...
失败
返工
```

动作：

```bash
evolution-review --before-task --task "$content"
```

注意：`message:received` 只能看到通道消息上下文，不等于完整 agent task。不要过度触发。

### 5.3 message:sent

事件：`message:sent`

用途：在回复发送后做轻量 after-task。

动作：

```bash
evolution-review --after-task --task "$lastTask" --outcome "$sentContent"
```

问题：Internal hook 很难可靠知道“任务是否复杂 / 是否成功 / 是否用户满意”。因此只能作为粗粒度 usage 记录，不适合作为最终方案。

### 5.4 gateway:startup / cron

事件：`gateway:startup` 或 OpenClaw cron

用途：定期执行：

```bash
evolution-review --periodic-usage
```

这可以生成代谢信号，但不要自动改核心文件。

## 6. Phase B：Typed plugin 最终方案

这是推荐产品化方向。

插件名建议：

```text
openclaw-evolution-os
```

### 6.1 agent_turn_prepare / before_prompt_build

目标：在 agent turn 开始前运行：

```bash
evolution-review --before-task --task "$task" --json
```

然后用 OpenClaw Plugin SDK 的下一轮注入能力：

```text
api.session.workflow.enqueueNextTurnInjection(...)
```

或 prompt shaping typed hook，把 prepare checklist 作为短上下文注入。

注入内容必须短：

- relevant lesson top N；
- apply checklist top N；
- source refs；
- no raw reports；
- no private unrelated memory。

### 6.2 agent finalization / after turn

目标：在 agent turn 完成后运行：

```bash
evolution-review --after-task --task "$task" --outcome "$summary" --json
```

如果结果显示应捕获候选：

- low/medium risk：可写 candidate；
- high risk：只生成 draft / warning，不写核心。

OpenClaw 文档提到：`command:stop` 不是自然 finalization gate；需要自然 final answer 检查时应使用 typed plugin hook `before_agent_finalize`。因此 Evolution OS 的 after-turn 应该使用 typed plugin hook，而不是 internal `command:stop`。

### 6.3 agent events subscription

Plugin SDK 提供：

```text
api.agent.events.registerAgentEventSubscription(...)
```

可用于：

- 记录任务开始/完成；
- 关联 run/session；
- 生成更干净的 usage event；
- 避免只靠 message:sent 粗略判断。

### 6.4 runContext

Plugin SDK 提供：

```text
api.runContext.setRunContext(...)
api.runContext.getRunContext(...)
api.runContext.clearRunContext(...)
```

用途：

- before-task 存储 prepare report digest；
- after-task 读取 applied checklist；
- terminal lifecycle 自动清理。

### 6.5 session extension

Plugin SDK 提供：

```text
api.session.state.registerSessionExtension(...)
```

用途：把 Evolution OS 状态投影到 session：

- lastPrepareAt；
- lastReflectAt；
- preparedLessonCount；
- pendingCandidateCount；
- staleLessonCount；
- lastUsageReportAt。

这有利于 Control UI 或 status 展示，但不应该塞入完整经验内容。

### 6.6 runtime lifecycle cleanup

Plugin SDK 提供：

```text
api.lifecycle.registerRuntimeLifecycle(...)
```

用途：

- reset/delete/reload 时清理 plugin-owned runtime state；
- 确保 runContext 不泄漏。

## 7. 推荐实现顺序

### Step 1：插件 scaffold

当前 repo 已新增 `plugins/openclaw-evolution-os/`，包含命令桥接和可选 typed hooks。

Package structure：

```text
plugins/openclaw-evolution-os/
  openclaw.plugin.json
  package.json
  src/index.ts
  src/evolution-cli.ts
  src/prepare.ts
  src/reflect.ts
  src/config.ts
```

### Step 2：配置 schema

配置项：

```json
{
  "enabled": true,
  "workspaceRelativeBin": "node_modules/.bin/evolution-review",
  "fallbackBin": "node memory/evolution-os/repo-draft/bin/evolution-review.js",
  "autoBeforeTask": true,
  "autoAfterTask": true,
  "autoPeriodicUsage": false,
  "maxInjectedLessons": 5,
  "maxInjectedChars": 2000,
  "writeCandidate": false,
  "triggerPatterns": ["记住", "下次", "以后都这样", "失败", "返工", "自进化"]
}
```

默认保守：

- `autoBeforeTask=true`；
- `autoAfterTask=true`；
- `writeCandidate=false`；
- `autoPeriodicUsage=false`，除非用户明确启用 cron/scheduler。

### Step 3：before-task typed hook

逻辑：

1. 获取 task text / user message / session key；
2. 判断是否复杂或命中 trigger；
3. 调用 `evolution-review --before-task --json`；
4. 截断 report；
5. 注入下一轮或当前 prompt supplement；
6. 记录 runContext。

### Step 4：after-task typed hook

逻辑：

1. 获取 final answer / outcome summary；
2. 读取 runContext 中的 prepare digest；
3. 调用 `evolution-review --after-task --json`；
4. low/medium candidate 根据配置写入；
5. high-risk 只生成 warning / draft；
6. 更新 session extension。

### Step 5：periodic usage

先不要自动创建 cron。

提供命令或 Control UI action：

```text
/evolution usage
```

或插件 CLI：

```bash
openclaw evolution usage
```

如果未来启用 cron，必须让用户明确确认。

### Step 6：inspection / status

提供只读状态：

```bash
openclaw evolution status
```

显示：

- last prepare / reflect；
- usage counts；
- pending candidates；
- stale/effective lessons；
- safety boundary config。

## 8. 安全边界

插件必须遵守：

1. 不直接修改核心文件。
2. 不删除 memory。
3. 不自动 push/publish。
4. 不上传训练数据。
5. 不扩大工具权限。
6. 不自动创建 scheduler/cron，除非用户确认。
7. 插入 prompt 的内容必须有长度上限。
8. 不把全量 `usage-log.jsonl` 注入 prompt。
9. candidate 写入默认关闭或仅允许 low/medium risk。
10. high-risk 只能提示人工确认。

## 9. 验证清单

插件实现后至少验证：

1. `openclaw plugins inspect openclaw-evolution-os --runtime --json` 能看到 runtime hooks。
2. Gateway restart 后插件仍加载。
3. 简单任务不产生过量 prepare 注入。
4. 命中“记住/下次/失败/返工”时触发 before-task。
5. 回复完成后触发 after-task。
6. usage-log 里有 beforeTask / afterTask 事件。
7. high-risk candidate 不自动写核心文件。
8. `--write-candidate=false` 时不写 inbox。
9. 插入上下文长度受限。
10. plugin disable 后完全不触发。

## 10. 当前推荐决策

短期：不要直接改 OpenClaw core。先以独立 Evolution OS package + OpenClaw plugin 形式集成。

推荐路线：

```text
现在：Level 1 + Level 2 CLI hook commands 已完成
当前：OpenClaw plugin scaffold 已实现，使用 `before_prompt_build` / `agent_end` 可选自动调用 CLI hook commands（默认关闭）
之后：稳定后再考虑 Level 3 plugin guardrails / upstream core hook
```

这样既能真正影响行为，又能让别人安装使用，也符合 OpenClaw 现有扩展模型。


## Implemented typed hooks in scaffold

The scaffold now uses hook names confirmed from OpenClaw docs and type definitions:

- `agent_turn_prepare`: returns `prependContext` with a bounded same-turn Evolution OS prepare checklist.
- `before_prompt_build`: optional fallback only when `useBeforePromptBuildFallback=true`.
- `agent_end`: observes final run outcome and calls Evolution OS reflect.

Important config boundary:

- `autoBeforeTask=false` and `autoAfterTask=false` by default.
- `agent_end` is a non-bundled conversation hook; OpenClaw requires `plugins.entries.openclaw-evolution-os.hooks.allowConversationAccess=true` when enabling it.
- `writeCandidate=false` by default.
- No core files are modified by the plugin.

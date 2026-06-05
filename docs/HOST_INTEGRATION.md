# Host Integration Guide

_创建时间：2026-06-05_

## 1. 为什么需要宿主集成

Evolution OS 不能只是一套旁路文件。真正的自进化要求经验进入未来行为链路：

```text
capture → review → prepare → apply → reflect → usage-report → revise/archive/reinforce
```

如果宿主 Agent 不知道什么时候调用 Evolution OS，那么系统只能做经验管理，不能形成稳定自进化。

因此，每个宿主系统至少要提供一个“极小入口”。

## 2. 集成目标

Evolution OS 的宿主集成目标：

1. 不把核心文件写成垃圾堆；
2. 让关键经验能在下次任务前被取回；
3. 让任务后反馈能进入候选池；
4. 让有效/过时/有害经验被统计和代谢；
5. 高风险变更仍然需要人工确认；
6. 可以复制给别的 Agent / workspace 使用。

核心原则：

```text
核心文件只保留入口；Evolution OS 承载治理、检索、反思和代谢。
```

## 3. 最小集成：Core Entry

在宿主的 `AGENTS.md`、system prompt、启动协议或等价核心文件中加入一个短入口。

推荐文本：

```md
## Evolution OS Entry

For durable self-improvement, use Evolution OS instead of directly growing core files.

Trigger Evolution OS when:
- the user corrects the agent;
- a task fails or needs rework;
- the user says "remember this", "next time", or "always do this";
- a complex task starts or ends;
- the agent wants to update memory, skills, tools, or core policy.

Before a relevant task, run or apply:
`evolution-review --prepare --task "<task>"`

After a relevant task, run or apply:
`evolution-review --reflect --task "<task>" --outcome "<outcome>"`

Periodically inspect:
`evolution-review --usage-report`

New lessons default to `memory/evolution-os/inbox/`. Core files should keep only stable entry rules and reviewed distilled lessons. High-risk changes require confirmation.
```

这个入口故意短。它的作用不是承载所有经验，而是保证 Agent 会调用 Evolution OS。

## 4. Skill 集成

把 `templates/skills/self-evolution-governor/SKILL.md` 安装到宿主的 skills 目录，例如：

```text
~/.agents/skills/self-evolution-governor/SKILL.md
```

触发场景：

- self-evolution / 自进化；
- 用户纠正；
- 失败复盘；
- skill 化；
- memory cleanup；
- 训练样本讨论；
- 准备修改核心文件。

Skill 负责给模型提供操作协议；Core Entry 负责保证模型知道何时用它。

## 5. Runtime Hooks

更稳定的宿主集成应在运行时增加三个 hook。

### 5.1 beforeTask hook

触发：复杂任务开始前。

推荐命令：

```bash
evolution-review --before-task --task "$TASK"
```

等价底层动作：

```bash
evolution-review --prepare --task "$TASK" --record-usage
```

输出：

- relevant lessons；
- apply checklist；
- source references；
- gaps to watch。

### 5.2 afterTask hook

触发：复杂任务完成后、失败后、用户纠正后。

推荐命令：

```bash
evolution-review --after-task --task "$TASK" --outcome "$OUTCOME"
```

如果希望安全候选自动写入 inbox：

```bash
evolution-review --after-task --task "$TASK" --outcome "$OUTCOME" --write-candidate
```

等价底层动作：

```bash
evolution-review --reflect --task "$TASK" --outcome "$OUTCOME" --record-usage
```

输出：

- applied / ignored / contradicted lessons；
- candidate suggestion；
- hard-case / cleanup signal。

### 5.3 periodicUsage hook

触发：每日、每周或每 N 个任务。

推荐命令：

```bash
evolution-review --periodic-usage
```

等价底层动作：

```bash
evolution-review --usage-report
```

输出：

- effective lessons；
- stale lessons；
- harmful / contradicted lessons；
- promotion / cleanup candidates。

## 6. 三种集成级别

| 级别 | 形态 | 能力 | 适合阶段 |
| --- | --- | --- | --- |
| Level 1 | Core Entry + Skill | 模型自觉调用 prepare/reflect | 当前可用 |
| Level 2 | Runtime Hooks | 系统自动触发 before/after/usage | 产品化下一步 |
| Level 3 | Plugin Guardrails | 写入前备份、diff、风险拦截、状态迁移 | 流程稳定后 |

### Level 1：当前推荐

优点：马上可用、风险低、不改宿主底层。

缺点：仍依赖 Agent 遵守入口。

### Level 2：真正进入行为链路

优点：不靠模型想起来，宿主自动在关键节点调用。

缺点：需要宿主 runtime 支持 task lifecycle hooks。

### Level 3：强约束治理

优点：可以机械防止核心文件污染和高风险写入。

缺点：必须非常小心权限、回滚和用户确认。

## 7. 与原系统融合的边界

Evolution OS 不替代宿主系统：

- 不替代 memory loader；
- 不替代 skill registry；
- 不替代权限系统；
- 不替代 scheduler；
- 不替代模型参数训练流程。

它提供的是“进化代谢层”：

```text
宿主负责执行任务；Evolution OS 负责让经验可审计地进入下一次任务。
```

融合方式：

1. 宿主启动时加载 Core Entry；
2. 宿主 skill 系统暴露 self-evolution-governor；
3. 宿主任意复杂任务前调用 prepare；
4. 宿主在失败/纠正/完成后调用 reflect；
5. 宿主定期调用 usage-report；
6. 宿主写核心文件前走 risk gate。

## 8. 成功标准

Evolution OS 真正发挥作用，不看文件数量，而看这些指标：

1. 用户纠正后，下次同类任务错误减少；
2. 失败复盘能生成可执行触发器；
3. 任务前 prepare 命中的经验被实际应用；
4. usage-report 能发现 stale / effective lessons；
5. 核心文件没有持续膨胀；
6. skill 数量和内容可审计；
7. 高风险变更没有绕过确认；
8. 新 workspace 可以按安装说明接入。

## 9. 当前边界

`0.1.0-draft` 已支持 Level 1 和 Level 2 的文件系统版入口：

- Core Entry 模板；
- self-evolution-governor skill 模板；
- `--before-task` / `--after-task` / `--periodic-usage` runtime hook commands；
- prepare / reflect / usage-report 底层命令；
- review / draft / audit；
- Evolution Boundaries。

下一步产品化应优先做更深宿主融合：

- 为 OpenClaw 提供可选集成片段；
- 让宿主 runtime 在任务生命周期自动调用 hook commands；
- 给 usage-report 增加更直接的行动建议；
- 流程稳定后实现 Level 3 plugin guardrails。

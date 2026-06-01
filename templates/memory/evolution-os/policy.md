# Evolution OS Policy

_目的：让长期运行的 Agent 可以进化，但不能把自己写成垃圾堆。_

## 核心原则

1. **捕获不是进化**：写入只是第一步；真正的进化必须经过分类、压缩、验证、晋升、使用、评估、遗忘。
2. **默认进候选池**：新的经验、规则、偏好、失败教训默认写入 `memory/evolution-os/inbox/`，不要直接污染核心文件。
3. **核心文件少而精**：`MEMORY.md`、`AGENTS.md`、`SOUL.md`、`TOOLS.md`、skill 只能接收经过蒸馏且会改变未来行为的内容。
4. **流程进 skill，事实进 memory，踩坑进 hard-cases，工具细节进 TOOLS.md**。
5. **遗忘是进化的一部分**：候选、记忆、skill 都必须允许归档、降级、合并或删除。
6. **高影响变更必须可审计**：涉及 `AGENTS.md`、`SOUL.md`、安全策略、外部写操作、权限扩大、自动调度的变更必须先生成 diff 并等待确认。
7. **参数进化只吃消化后的营养**：训练语料只能来自已验证的纠正、成功案例、失败复盘和最终满意版本；不能直接吃原始对话或未审核 memory。

## 进化对象分层

| 层级 | 载体 | 适合内容 | 写入规则 |
|---|---|---|---|
| Candidate | `memory/evolution-os/inbox/` | 新发现、假设、纠正、待验证经验 | 默认入口，可自动写 |
| Daily | `memory/YYYY-MM-DD.md` | 当天流水、任务状态 | 可写，但不替代长期记忆 |
| Long-term | `MEMORY.md` | 长期有效事实、稳定偏好、关键项目状态 | 必须压缩；目标保持 3KB 级别 |
| User model | `memory/user-model/` | 用户偏好、目标、状态画像 | 用户明确表达或多次验证后写 |
| Tool notes | `TOOLS.md` | 本机工具、账号、环境、踩坑 | 工具/API相关才写 |
| Hard cases | `memory/hard-cases/` | 失败案例、返工、用户纠正 | 需要能反向改变下次行为 |
| Skill | `skills/` 或 `~/.agents/skills/` | 5步以上流程、重复 2+ 次操作 | 先草案，验证后晋升 |
| Protocol | `AGENTS.md` / `SOUL.md` | 全局行为规则/人格边界 | 极少写；必须确认 |
| Training | `memory/evolution-os/training-corpus/` | 未来 LoRA/DPO/RL 样本 | 只能从已验证案例蒸馏 |

## 候选状态机

```text
candidate → validated → promoted → monitored → archived
          ↘ rejected  ↘ merged
```

- `candidate`：刚捕获，尚未验证。
- `validated`：确认会改变未来行为，且落点明确。
- `promoted`：已写入核心载体或转成 skill/tool note/hard case。
- `monitored`：已启用，等待后续验证是否有效。
- `merged`：和旧规则合并，不单独保留。
- `rejected`：不值得沉淀。
- `archived`：已过期、低价值或被替代，保留可回溯记录。

## 候选写入格式

候选文件使用 Markdown + YAML frontmatter：

```markdown
---
id: evo-YYYYMMDD-HHMM-slug
type: preference | fact | workflow | failure | tool | architecture | training | hypothesis
source: user | task-failure | observation | review | external-research
confidence: low | medium | high
status: candidate
scope: global | user | project | tool | skill | model
created: YYYY-MM-DD
decay: 7d | 30d | 90d | permanent
risk: low | medium | high
suggested_targets:
  - MEMORY.md
---

## Signal

## Proposed Learning

## Why It Matters

## Promotion Criteria

## Rejection Criteria
```

## 写入门槛

写入任何核心文件前必须问：

1. 这条内容下次真的会改变行为吗？
2. 有没有更合适的位置？
3. 能不能压缩到一句话？
4. 是否和现有规则重复或冲突？
5. 是否有过期时间或适用边界？
6. 是否需要用户确认？

过不了门槛，就留在 inbox、daily、archive 或直接 rejected。

## 风险分级

### Low：可自动处理

- 新增候选记录
- daily log
- 非敏感 hard-case 草案
- review report
- training sample 草案

### Medium：可生成草案，通常需要检查

- 更新 `MEMORY.md`
- 更新 `TOOLS.md`
- 更新 `memory/user-model/`
- 创建/修改 skill
- 归档旧记忆

### High：必须确认

- 修改 `AGENTS.md` / `SOUL.md`
- 删除核心记忆而非归档
- 扩大权限、修改调度器、自动执行外部动作
- 发布插件/skill 到外部仓库
- 参数训练或上传训练数据

## 遗忘策略

- **降级优先于删除**：active → archive → delete。
- **重复内容合并**：多条候选表达同一规则时，保留一条蒸馏版。
- **过期内容归档**：项目状态、工具 bug、临时策略必须设置 decay。
- **低使用率审查**：长期未被引用的规则应被压缩或归档。
- **冲突规则处理**：新规则覆盖旧规则时，旧规则移入 archive，并说明原因。

## Review 节奏

- 每出现明显用户纠正/任务失败：立即写候选或 hard-case。
- 每 10 条候选或每周：做一次 inbox review。
- 每月：检查 MEMORY.md 长度、重复规则、过期候选、失效 skill。

## 输出要求

每次 Evolution OS 变更至少留下：

- 变更文件列表
- 晋升/归档理由
- 是否需要用户确认
- 一个最小验证动作

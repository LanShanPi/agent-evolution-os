# Runtime Evolution Loop

_创建时间：2026-06-03_

## 1. 为什么治理闭环还不够

Evolution OS 早期解决的是“能不能安全沉淀经验”：

```text
capture → candidate → review → promote/archive draft → manual apply → verify → distill/forget
```

这能避免核心 memory、skill、prompt 被随意污染，但它还不能证明一条经验真的改变了未来行为。

如果只有治理闭环，系统会停在：

- 经验被写入了，但不知道下次有没有被检索；
- 规则被晋升了，但不知道任务中有没有被应用；
- lesson 看起来正确，但不知道是否实际改善结果；
- 某些规则反复被准备出来，却从未被使用，长期占据上下文；
- 某些规则被应用后导致更差结果，却没有回滚信号。

因此，自进化需要第二条闭环：**运行时闭环**。

治理闭环回答：

> 这条经验是否值得安全沉淀？

运行时闭环回答：

> 这条经验是否真的影响了未来行为，并且影响是好是坏？

没有运行时闭环，进化只是“写得更多”。有了运行时闭环，系统才具备代谢：强化有效经验，修订有害经验，清理无效经验。

## 2. 两种模式：Governance Mode 与 Runtime Mode

Evolution OS 分为两种互补模式。

### 2.1 Governance Mode：治理模式

治理模式是离线/事后模式，主要处理经验如何进入长期载体。

典型命令：

```bash
node tools/evolution-review.js --write-report
node tools/evolution-review.js --candidate <id> --promote-draft
node tools/evolution-review.js --candidate <id> --archive-draft --reason <reason>
node tools/evolution-review.js --memory-distill
node tools/evolution-review.js --skill-audit
```

职责：

- 扫描候选；
- 检查格式、重复、过期；
- 生成 promotion/archive draft；
- 审计 memory 与 skills；
- 给人工或 Agent 审查提供依据；
- 默认不直接修改核心文件。

治理模式强调：**安全沉淀**。

### 2.2 Runtime Mode：运行时模式

运行时模式是任务前/任务后模式，主要处理经验是否进入实际行为。

典型命令：

```bash
node tools/evolution-review.js --prepare --task "..."
node tools/evolution-review.js --reflect --task "..." --outcome "..."
node tools/evolution-review.js --usage-report
```

职责：

- 任务前检索相关经验；
- 生成 apply checklist；
- 任务后反思经验是否被应用；
- 捕捉新失败、新纠正、新模式；
- 记录 usage log；
- 根据使用数据建议 promotion 或 cleanup candidate。

运行时模式强调：**行为反馈**。

### 2.3 两种模式的关系

```text
Governance Mode: 经验能否进入系统
Runtime Mode:    经验是否改善行为
```

它们不是替代关系，而是前后咬合：

```text
candidate/review/promote
  ↓
prepare/apply/reflect
  ↓
usage evidence
  ↓
reinforce/revise/archive candidate
```

治理模式没有运行时反馈，会变成静态知识库。运行时模式没有治理边界，会变成不受控自改。Evolution OS 必须同时具备二者。

## 3. prepare / reflect / usage-report 的职责

### 3.1 prepare：任务前取回经验

`prepare` 的目标不是替 Agent 完成任务，而是让已有经验在任务开始前进入工作记忆。

输入：

```text
任务描述 task
```

输出：

- relevant lessons；
- source citations；
- apply checklist；
- gaps to capture；
- 可选 usage record。

`prepare` 的成功标准不是“找到了很多规则”，而是：

> 找到少量和当前任务强相关、可执行、能降低错误概率的经验。

失败模式：

- 返回过多泛化规则，增加上下文噪音；
- 返回旧规则但缺乏适用条件；
- 返回和任务弱相关的经验；
- checklist 不可执行，只是口号。

### 3.2 reflect：任务后评估与捕获

`reflect` 的目标是判断任务执行结果是否产生进化信号。

输入：

```text
task + outcome
```

输出：

- 成功/失败/纠正信号；
- 哪些 lesson 被应用；
- 哪些 lesson 被忽略；
- 是否出现 contradicting evidence；
- 是否需要生成 candidate draft；
- 是否需要人工审查。

`reflect` 不应自动把所有 outcome 写入长期记忆。它只负责判断：

> 这次结果是否包含能改变未来行为的经验？

### 3.3 usage-report：跨任务代谢信号

`usage-report` 汇总运行时记录，观察 lesson 的长期表现。

它关注三类经验：

1. **effective lesson**：多次被准备并实际应用，且结果正向；
2. **stale lesson**：多次被准备但从未应用，可能是噪音；
3. **harmful / contradicted lesson**：应用后导致失败，或被新证据推翻。

输出不应直接修改原 lesson，而是生成 reviewable candidate：

```text
effective → promotion/reinforcement candidate
stale     → cleanup/archive candidate
harmful   → revise/rollback candidate
```

## 4. 运行时状态机

原治理状态机：

```text
candidate → validated → promoted → monitored → archived
          ↘ rejected  ↘ merged
```

引入 Runtime Mode 后，`monitored` 应扩展为运行时状态：

```text
promoted
  ↓
prepared
  ↓
applied / ignored / contradicted
  ↓
effective / stale / harmful
  ↓
reinforce / revise / archive
```

完整闭环可以表示为：

```text
experience
  ↓
candidate
  ↓
validated
  ↓
promoted
  ↓
prepared
  ↓
applied / ignored / contradicted
  ↓
effective / stale / harmful
  ↓
reinforce / revise / archive candidate
  ↓
review
```

关键判断：

- **promoted 不等于 useful**：晋升只是认为它值得尝试影响未来行为。
- **prepared 不等于 applied**：检索出来不代表真的被遵守。
- **applied 不等于 effective**：被应用后仍可能失败。
- **ignored 不一定 stale**：可能是任务细节不适用，也可能是 checklist 设计差。
- **contradicted 比 unused 更危险**：被新证据推翻的规则需要优先修订或降级。

## 5. Lesson reuse metrics

运行时闭环需要最小可解释指标，而不是复杂评分黑箱。

建议记录：

```json
{
  "timestamp": "2026-06-03T08:00:00.000Z",
  "event": "prepare|reflect",
  "task": "...",
  "lessonIds": ["..."],
  "appliedLessonIds": ["..."],
  "ignoredLessonIds": ["..."],
  "contradictedLessonIds": ["..."],
  "outcomeSignal": "success|failure|correction|unknown"
}
```

最小指标：

- `prepared_count`：被任务前检索次数；
- `applied_count`：被实际应用次数；
- `ignored_count`：被准备但未应用次数；
- `contradicted_count`：被反证次数；
- `success_after_apply_count`：应用后结果正向次数；
- `failure_after_apply_count`：应用后仍失败次数。

默认阈值应保守：

- 多次 prepared 但 0 applied → 只建议 cleanup，不自动归档；
- 多次 applied 且结果正向 → 只建议 reinforcement/promotion，不自动写核心文件；
- 出现 contradicted → 优先生成 revise candidate，必要时提示人工审查。

## 6. effective / stale / harmful 的判断

### 6.1 Effective lesson

满足以下条件时，可视为 effective 候选：

- 多次被 prepare 检索；
- 多次被实际应用；
- 应用后结果没有被用户纠正或任务失败反证；
- lesson 仍保持清晰、短、可执行。

处理方式：

```text
生成 reinforcement / promotion candidate
```

可能动作：

- 将分散经验压缩成更短规则；
- 把高频 checklist 固化为 skill；
- 把 hard case 提升为任务触发器；
- 把已验证样本送入 training-corpus draft。

### 6.2 Stale lesson

满足以下条件时，可视为 stale 候选：

- 多次被 prepare 检索；
- 长期没有被实际应用；
- 或者适用条件过窄但触发过宽；
- 或者内容已被更好的规则覆盖。

处理方式：

```text
生成 cleanup / archive candidate
```

可能动作：

- 降低触发优先级；
- 合并到更通用规则；
- 移到 archive；
- 改写适用条件。

### 6.3 Harmful / contradicted lesson

满足以下条件时，可视为 harmful 候选：

- 应用后导致任务失败；
- 被用户明确纠正；
- 与更高优先级规则冲突；
- 涉及安全、隐私、权限边界的新反证。

处理方式：

```text
生成 revise / rollback candidate，必要时要求人工确认
```

高风险 harmful lesson 不应等待阈值累计，应立即进入审查。

## 7. 与 promotion / cleanup candidate 的关系

Runtime Mode 不直接修改长期载体。它只产生证据和候选。

```text
usage evidence
  ↓
promotion candidate / cleanup candidate / revise candidate
  ↓
Governance Mode review
  ↓
promote draft / archive draft / revise draft
  ↓
manual apply or safe explicit apply
```

这保证运行时反馈不会变成自动自改。

特别注意：

- `--usage-report --suggest-promotion-candidates` 只写 inbox candidate；
- `--usage-report --suggest-cleanup-candidates` 只写 inbox candidate；
- 不自动修改 trigger 文件；
- 不自动删除旧 lesson；
- 不自动训练模型。

## 8. usage log 与 training corpus 的边界

`usage-log.jsonl` 不是训练语料。

它是运行时审计数据，用于回答：

- 哪些 lesson 被准备；
- 哪些 lesson 被应用；
- 哪些 lesson 被忽略；
- 哪些 lesson 被反证。

训练语料必须经过额外蒸馏：

```text
usage evidence
  ↓
distilled lesson
  ↓
reviewed training sample draft
  ↓
privacy / safety / quality check
  ↓
training-corpus
```

训练样本至少应区分：

- `sft`：正确行为示范；
- `preference`：两个回答/策略的偏好比较；
- `failure_to_fix`：错误行为与修正行为；
- `policy_boundary`：边界判断样本。

任何原始对话、私密信息、未脱敏材料、未验证经验，都不能直接进入 training-corpus。

## 9. 安全边界

Runtime Mode 的边界必须比 Governance Mode 更保守，因为它更靠近实时行为。

默认禁止：

- 自动修改 `MEMORY.md`、`AGENTS.md`、`SOUL.md`；
- 自动删除 memory、skill、candidate；
- 自动发布 skill/plugin；
- 自动创建 cron/hook 等持续行为；
- 自动上传 usage log；
- 自动生成训练数据并用于训练；
- 自动覆盖高优先级安全/隐私规则。

允许：

- 读取本地已授权 memory/skill/notes；
- 生成任务前 checklist；
- 生成任务后 candidate draft；
- 写入低/中风险 inbox candidate；
- 写入本地 usage log；
- 生成 review report。

高风险信号必须人工确认：

- 涉及人格/SOUL/全局协议；
- 涉及安全、隐私、权限；
- 涉及外部发布或对外动作；
- 涉及定时任务、hook、后台自动化；
- 涉及训练语料或参数更新。

## 10. 对 repo/package 的影响

Runtime Loop 意味着 repo/package 不能只包装 review 工具，还要明确自己是两层系统：

```text
1. Governance CLI
2. Runtime loop assistant
```

因此 package 文档应包含：

- prepare/reflect/usage-report 的使用场景；
- usage log schema；
- runtime config thresholds；
- candidate 生成边界；
- training corpus 边界；
- 与 OpenClaw plugin 的未来映射。

发布前，至少要确认：

- `README.md` 正确解释 Governance vs Runtime；
- `COMMANDS.md` 覆盖 runtime commands；
- `DESIGN.md` 引用本文件；
- `PRODUCT.md` 说明 runtime loop 是 v0.1 的范围还是实验能力；
- `self-test` 覆盖 prepare/reflect/usage-report 的最小链路。

## 11. 一句话总结

> Governance Mode 让进化可审计，Runtime Mode 让进化可验证；二者合在一起，Evolution OS 才不是“会写记忆的脚本”，而是长期 Agent 的自进化代谢系统。

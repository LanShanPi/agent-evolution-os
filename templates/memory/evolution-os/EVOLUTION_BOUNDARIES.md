# Evolution Boundaries

_创建时间：2026-06-05_

## 1. 这份文档解决什么问题

Runtime Loop 回答的是：经验进入系统后，如何在未来任务里被准备、应用、评估和代谢。

但它还缺一个上层边界问题：

> Agent 到底可以进化什么？哪些可以自动做？哪些必须人工确认？文件系统、plugin、参数训练之间的边界在哪里？

这份文档给 Evolution OS 补上“进化对象与控制边界”。

核心结论：

```text
自进化不是让 Agent 任意改自己。
自进化是让 Agent 在可审计边界内，把经验转化为更好的下次行动。
```

## 2. 进化对象：到底进化什么

Evolution OS 把“可进化对象”分成七层。

```text
L0 Observation   观察层：原始事件、对话、任务结果
L1 Candidate     候选层：被捕获但未验证的经验
L2 Memory        记忆层：长期事实、偏好、项目状态
L3 Skill         技能层：可复用流程和工具操作
L4 Policy        策略层：全局行为规则、安全边界、写入协议
L5 Tooling       工具层：review 脚本、plugin、机械护栏
L6 Parameters    参数层：模型训练样本与未来权重更新
```

每层的进化方式不同。

| 层级 | 载体 | 进化内容 | 典型动作 | 默认权限 |
| --- | --- | --- | --- | --- |
| L0 Observation | session / daily log | 原始事实、任务流水 | 记录、引用、摘要 | 可自动记录 |
| L1 Candidate | `memory/evolution-os/inbox/` | 可能改变未来行为的经验 | 捕获、分类、设置 decay | 可自动写入 |
| L2 Memory | `MEMORY.md` / `memory/user-model/` / `TOOLS.md` | 稳定事实、偏好、环境信息 | 蒸馏、合并、归档 | 低/中风险可写，高风险需确认 |
| L3 Skill | `skills/` / `~/.agents/skills/` | 多步骤流程、重复工作法 | 创建、修订、审计 | 草案可自动，启用/覆盖需谨慎 |
| L4 Policy | `AGENTS.md` / `SOUL.md` / policy | 全局协议、安全规则、人格边界 | diff 草案、人工确认 | 必须确认 |
| L5 Tooling | CLI / plugin / scheduler | 机械执行与强约束 | 新增命令、校验、护栏 | 本地草案可自动，发布/高影响需确认 |
| L6 Parameters | training corpus / model | 模型行为倾向 | 样本蒸馏、审核、训练 | 训练/上传必须确认 |

### 2.1 不是所有变化都叫进化

以下只是记录，不是进化：

- 把原始对话搬进长期记忆；
- 把一次性任务状态写进核心文件；
- 给每个小流程都创建 skill；
- 写了规则但下次没有被 prepare 检索；
- 检索了规则但任务中没有实际应用；
- 应用了规则但结果没有改善。

真正的进化至少满足：

```text
被捕获 → 被蒸馏 → 被放到正确载体 → 在未来任务中被应用 → 结果被评估 → 有效则强化，无效则遗忘/修订
```

## 3. 自动化边界：哪些可以自动，哪些必须确认

Evolution OS 的默认立场：

```text
低风险可自动；中风险可生成草案或在本地安全写入；高风险必须人工确认。
```

### 3.1 可自动做

低风险动作可以自动执行：

1. 写入 candidate 文件。
2. 追加 daily log。
3. 生成 review report。
4. 生成 promotion / archive / cleanup draft。
5. 运行 self-check / self-test / verify。
6. 复制模板到临时 workspace。
7. 统计 usage-log。
8. 生成 training sample draft，但不能进入训练。

这些动作共同特点：

- 可回滚；
- 不改变核心行为；
- 不外发；
- 不删除用户数据；
- 不扩大权限；
- 不影响调度器或安全边界。

### 3.2 可自动写入但需要保守

中风险动作可以在明确边界内自动写入，但必须留下变更理由和最小验证：

1. 更新 `MEMORY.md` 中已确认的稳定事实。
2. 更新 `TOOLS.md` 中本地工具踩坑。
3. 更新 `memory/user-model/` 中用户明确表达的偏好。
4. 创建非启用状态的 skill 草案。
5. 归档候选或低价值临时记录。
6. 修正文档中的明显错误。

约束：

- 必须尽量小 diff；
- 必须保留来源；
- 不覆盖整文件；
- 不删除核心内容，只归档；
- 如果影响用户对外表达、权限、安全、人格，立刻升级为高风险。

### 3.3 必须人工确认

高风险动作不能自动执行：

1. 修改 `AGENTS.md`、`SOUL.md`、全局安全策略。
2. 删除核心记忆，而不是归档。
3. 扩大工具权限、修改调度器、改变自动执行策略。
4. 对外发布 skill / plugin / package。
5. push 到远程仓库或 npm / ClawHub publish。
6. 上传训练数据、启动参数训练、调用外部训练服务。
7. 把用户私人信息写入可分发 repo/package。
8. 自动发送邮件、消息、公开内容。

判断标准：

> 如果错误会影响安全、隐私、人格、外部世界、长期行为或不可轻易回滚，就必须确认。

## 4. 文件系统治理边界

文件系统版 Evolution OS 的价值是：先用普通文件把进化流程跑通。

它应该做：

- 分类存放经验；
- 生成草案；
- 做静态检查；
- 控制核心文件膨胀；
- 提供可读审计记录；
- 让 Agent 在任务前后有 prepare / reflect 流程。

它不应该做：

- 直接强制拦截所有写入；
- 替代 OpenClaw 权限系统；
- 自动训练模型；
- 自动发布包；
- 把文件目录变成无限增长的档案馆。

文件系统版的边界是“软约束 + 可审计”。

```text
文件系统版 = 协议、模板、脚本、报告、草案
```

它适合作为 v0，因为：

1. 容易检查；
2. 容易复制；
3. 容易回滚；
4. 不绑定单一 Agent runtime；
5. 可以先验证理论是否成立。

## 5. Plugin 边界

Plugin 不是第一步，而是流程稳定后的强约束层。

Plugin 应该承担机械护栏：

1. 写核心文件前自动备份。
2. 检查 diff 风险等级。
3. 拦截超过大小预算的写入。
4. 检查候选格式和重复。
5. 管理候选状态迁移。
6. 生成审计日志。
7. 提供可恢复的 archive / rollback。

Plugin 不应该承担判断权：

- 不替用户决定是否修改人格/安全策略；
- 不自动批准高风险变更；
- 不替 Agent 理解复杂任务上下文；
- 不直接把原始日志转成训练数据；
- 不绕过 OpenClaw 原有权限模型。

Plugin 的定位：

```text
把已经验证过的 Evolution OS 协议机械化，而不是提前把不成熟流程固化。
```

## 6. 参数进化边界

参数进化是最后一层，不是当前 MVP 的功能。

### 6.1 训练样本不能来自原始对话

禁止直接使用：

- 原始聊天记录；
- 未审核 daily log；
- 未蒸馏 memory；
- 含私人路径、姓名、账号、密钥的材料；
- 一次性任务细节；
- 没有验证结果的假设。

原因：

1. 噪音太多；
2. 隐私风险高；
3. 失败行为可能被固化；
4. 用户临时情绪可能被误学成长期偏好；
5. 任务局部策略可能污染通用能力。

### 6.2 训练样本出口

训练样本必须走这条链路：

```text
usage evidence
  → distilled lesson
  → reviewed training sample draft
  → privacy / safety / quality check
  → training-corpus
  → explicit approval
  → training / upload
```

`usage-log.jsonl` 不是 training corpus。它只是证据来源。

`training-corpus/` 也不是自动训练入口。它是人工审查后的候选样本区。

### 6.3 什么值得进入训练样本

适合训练的样本：

1. 多次出现的稳定偏好。
2. 用户明确纠正且后续验证有效的行为规则。
3. 工具调用前后对比清楚的成功案例。
4. 高质量失败复盘：错误行为 → 正确行为 → 为什么。
5. 可泛化的流程判断，而非私人事实。

不适合训练的样本：

1. 私人项目细节。
2. 一次性任务结果。
3. 未证实的主观猜测。
4. 含密钥、路径、账号、真实联系人信息的内容。
5. 会鼓励越权、外发、绕过确认的内容。

## 7. 三条闭环如何咬合

Evolution OS 至少有三条闭环。

### 7.1 Governance Loop：治理闭环

```text
capture → candidate → review → draft → promote/archive → audit
```

回答：

> 经验能否安全进入系统？

### 7.2 Runtime Loop：运行时闭环

```text
prepare → task execution → reflect → usage-report → reinforce/revise/archive candidate
```

回答：

> 经验是否真的改变了未来行为？

### 7.3 Training Loop：参数闭环

```text
usage evidence → distilled sample → review → privacy/safety check → approved corpus → training
```

回答：

> 哪些被验证的行为改进值得固化到模型参数？

三者关系：

```text
Governance 保证进系统前不污染。
Runtime 保证进系统后被验证。
Training 只吸收经过前两者消化的营养。
```

## 8. 决策矩阵

当 Agent 想“进化”时，先按这个矩阵判断。

| 信号 | 默认落点 | 是否自动 | 备注 |
| --- | --- | --- | --- |
| 用户明确说“记住” | candidate + 视情况 memory | 可写候选；核心写入看风险 | 偏好类优先 user-model |
| 用户纠正了错误 | hard-case + candidate | 可自动草案 | 必须能改变下次行为 |
| 工具/API 踩坑 | TOOLS.md 或 tool recipe | 可保守写入 | 只写本机/工具事实 |
| 5 步以上重复流程 | skill 草案 | 草案可自动 | 启用/发布另行确认 |
| 核心规则冲突 | review report | 不自动改核心 | 生成 diff 让人审 |
| MEMORY 膨胀 | distill draft | 不自动覆盖 | 只生成压缩建议 |
| skill 过时 | cleanup candidate | 不自动删除 | 归档优先 |
| 对外发布包 | publish checklist | 必须确认 | push/publish 都算外发 |
| 参数训练想法 | training sample draft | 不训练 | 训练/上传必须确认 |

## 9. 最小可执行原则

Evolution OS 不是越复杂越好。每次进化动作都要满足最小可执行原则：

1. 有明确触发信号。
2. 有正确落点。
3. 有风险等级。
4. 有来源或证据。
5. 有最小验证动作。
6. 能回滚或归档。
7. 会改变未来行为，否则不写入核心载体。

## 10. 当前产品边界

`0.1.0-draft` 的边界：

包含：

- 文件系统协议；
- candidate / report / draft；
- memory distill 建议；
- skill audit；
- prepare / reflect / usage-report；
- examples / templates；
- self-check / self-test；
- repo/package 草案。

不包含：

- 自动 apply 高风险变更；
- 自动删除核心记忆；
- 自动修改人格/安全策略；
- plugin 强制拦截；
- 外部发布；
- 参数训练；
- 训练数据上传。

这条边界必须写进 README、PRODUCT 和 PUBLISH_CHECKLIST，避免后续实现跑偏。

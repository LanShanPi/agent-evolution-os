#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const ROOT = process.cwd();
const EVO_DIR = path.join(ROOT, 'memory/evolution-os');
const INBOX_DIR = path.join(EVO_DIR, 'inbox');
const ARCHIVE_DIR = path.join(EVO_DIR, 'archive');
const PROMOTED_DIR = path.join(EVO_DIR, 'promoted');
const REPORTS_DIR = path.join(EVO_DIR, 'reports');
const RUNTIME_DIR = path.join(EVO_DIR, 'runtime');
const USAGE_LOG_FILE = path.join(RUNTIME_DIR, 'usage-log.jsonl');
const MEMORY_FILE = path.join(ROOT, 'MEMORY.md');
const POLICY_FILE = path.join(EVO_DIR, 'policy.md');
const CONFIG_FILE = path.join(EVO_DIR, 'config.json');

const argv = process.argv.slice(2);
const args = new Set(argv);
const writeCandidate = args.has('--write-candidate');
const recordUsage = args.has('--record-usage');
const usageReport = args.has('--usage-report');
const writeReport = args.has('--write-report');
const json = args.has('--json');
const help = args.has('--help') || args.has('-h');
const prepare = args.has('--prepare');
const reflect = args.has('--reflect');
const beforeTask = args.has('--before-task');
const afterTask = args.has('--after-task');
const periodicUsage = args.has('--periodic-usage');
const outcomeArgIndex = argv.indexOf('--outcome');
const outcomeText = outcomeArgIndex >= 0 ? argv[outcomeArgIndex + 1] : '';
const taskArgIndex = argv.indexOf('--task');
const taskText = taskArgIndex >= 0 ? argv[taskArgIndex + 1] : '';
const init = args.has('--init');
const initConfig = args.has('--init-config');
const selfCheck = args.has('--self-check');
const selfTest = args.has('--self-test');
const install = args.has('--install');
const installSkill = args.has('--install-skill') || args.has('--install-adapter');
const unattendedSafe = args.has('--unattended-safe');
const skillDirArgIndex = argv.indexOf('--skill-dir');
const skillDirArg = skillDirArgIndex >= 0 ? argv[skillDirArgIndex + 1] : '';
const suggestPromotionCandidates = args.has('--suggest-promotion-candidates');
const suggestPromotion = args.has('--suggest-promotion');
const promoteDraft = args.has('--promote-draft');
const archiveDraft = args.has('--archive-draft');
const memoryDistill = args.has('--memory-distill');
const memoryDistillDraft = args.has('--memory-distill-draft');
const skillAudit = args.has('--skill-audit');
const suggestCleanupCandidates = args.has('--suggest-cleanup-candidates');
const allSkills = args.has('--all-skills');
const reasonArgIndex = argv.indexOf('--reason');
const archiveReason = reasonArgIndex >= 0 ? argv[reasonArgIndex + 1] : 'manual-review';
const candidateArgIndex = argv.indexOf('--candidate');
const candidateSelector = candidateArgIndex >= 0 ? argv[candidateArgIndex + 1] : null;
const today = new Date().toISOString().slice(0, 10);

function exists(p) {
  return fs.existsSync(p);
}

const DEFAULT_CONFIG = {
  version: 1,
  memory: {
    targetBytes: 3 * 1024,
    softLimitBytes: 12 * 1024,
    sectionWarningBytes: 1200,
    maxBulletsPerSection: 6,
  },
  candidates: {
    dueSoonMinDays: 3,
    dueSoonRatio: 0.2,
    duplicateSimilarityThreshold: 0.72,
  },
  skills: {
    maxDescriptionLength: 220,
    largeSkillBytes: 6000,
    manyLines: 180,
    similarDescriptionThreshold: 0.78,
  },
  runtime: {
    stalePreparedOnlyThreshold: 3,
    effectivePromotionThreshold: 3,
  },
  boundaries: {
    autoModifyCoreFiles: false,
    autoDeleteMemory: false,
    autoPublishSkills: false,
    autoTrainOrUpload: false,
  },
};

function deepMerge(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function loadConfig() {
  if (!exists(CONFIG_FILE)) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(readText(CONFIG_FILE));
    return deepMerge(DEFAULT_CONFIG, parsed);
  } catch (error) {
    return { ...DEFAULT_CONFIG, configError: error.message };
  }
}

const CONFIG = loadConfig();

function renderHelp() {
  return `Evolution OS review/draft tool

Usage:
  node tools/evolution-review.js [command] [options]

Review:
  --json                         Output JSON
  --write-report                 Write report to memory/evolution-os/reports/
  --prepare --task <text>         Retrieve relevant lessons/checklists before a task
  --reflect --task <text> --outcome <text>
                                  Evaluate post-task outcome and suggest capture/promotion
  --reflect --write-candidate     With --reflect: write safe candidate to inbox
  --record-usage                  With --prepare/--reflect: append runtime usage-log.jsonl

Runtime hooks:
  --before-task --task <text>     Host hook: prepare + record usage before a task
  --after-task --task <text> --outcome <text>
                                  Host hook: reflect + record usage after a task
  --after-task --write-candidate  With --after-task: write safe candidate to inbox
  --periodic-usage                Host hook: usage report for scheduled review

  --usage-report                  Summarize runtime lesson reuse from usage-log.jsonl
  --usage-report --suggest-cleanup-candidates
                                  Draft candidates for lessons prepared but not applied
  --usage-report --suggest-promotion-candidates
                                  Draft candidates for lessons repeatedly applied
  --self-check                   Check required files, config, and safety boundaries
  --self-test                    Run fixture-based smoke tests in a temp workspace
  --install                      One-command safe local install: init + config + adapter + self-check
  --install --unattended-safe     Also configure unattended-safe mode (low-risk auto-candidates only)
  --init                         Initialize Evolution OS files/directories if missing
  --init-config                  Create memory/evolution-os/config.json if missing
  --install-adapter              Install the agent adapter (self-evolution-governor skill) if missing
  --install-adapter --skill-dir <dir>
                                  Install adapter under a custom skills directory
  --install-skill                Alias for --install-adapter (backward compatible)

Candidates:
  --candidate <id-or-file>       Select an inbox candidate
  --suggest-promotion            Generate promotion suggestion
  --promote-draft                Write promoted/<id>.draft.md
  --archive-draft                Write archive/<id>.archive-draft.md
  --reason <reason>              Archive reason: rejected|merged|expired|superseded|manual-review|promoted

Memory:
  --memory-distill               Report MEMORY.md budget/section distill suggestions
  --memory-distill-draft         Write a non-applying MEMORY.md distill draft

Skills:
  --skill-audit                  Audit workspace skills
  --skill-audit --all-skills     Include global skill directories
  --suggest-cleanup-candidates   With --skill-audit: write cleanup candidate drafts for flagged skills

Boundaries:
  This tool does not auto-modify MEMORY.md/AGENTS.md/SOUL.md, delete memories,
  publish skills/plugins, train models, or upload data.
`;
}

function initConfigFile() {
  if (exists(CONFIG_FILE)) return { created: false, file: CONFIG_FILE, config: loadConfig() };
  fs.mkdirSync(EVO_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  return { created: true, file: CONFIG_FILE, config: DEFAULT_CONFIG };
}

const DEFAULT_POLICY = `# Evolution OS Policy

_目的：让长期运行的 Agent 可以进化，但不能把自己写成垃圾堆。_

## 核心原则

1. **捕获不是进化**：写入只是第一步；真正的进化必须经过分类、压缩、验证、晋升、使用、评估、遗忘。
2. **默认进候选池**：新的经验、规则、偏好、失败教训默认写入 \`memory/evolution-os/inbox/\`，不要直接污染核心文件。
3. **核心文件少而精**：\`MEMORY.md\`、\`AGENTS.md\`、\`SOUL.md\`、\`TOOLS.md\`、skill 只能接收经过蒸馏且会改变未来行为的内容。
4. **流程进 skill，事实进 memory，踩坑进 hard-cases，工具细节进 TOOLS.md**。
5. **遗忘是进化的一部分**：候选、记忆、skill 都必须允许归档、降级、合并或删除。
6. **高影响变更必须可审计**：涉及 \`AGENTS.md\`、\`SOUL.md\`、安全策略、外部写操作、权限扩大、自动调度的变更必须先生成 diff 并等待确认。
7. **参数进化只吃消化后的营养**：训练语料只能来自已验证的纠正、成功案例、失败复盘和最终满意版本；不能直接吃原始对话或未审核 memory。

## 候选状态机

\`\`\`text
candidate → validated → promoted → monitored → archived
          ↘ rejected  ↘ merged
\`\`\`

## 候选写入格式

使用 Markdown + YAML frontmatter。模板见：

\`\`\`text
memory/evolution-os/schemas/candidate-template.md
\`\`\`

## 风险分级

### Low：可自动处理

- 新增候选记录
- daily log
- 非敏感 hard-case 草案
- review report
- training sample 草案

### Medium：可生成草案，通常需要检查

- 更新 \`MEMORY.md\`
- 更新 \`TOOLS.md\`
- 更新 \`memory/user-model/\`
- 创建/修改 skill
- 归档旧记忆

### High：必须确认

- 修改 \`AGENTS.md\` / \`SOUL.md\`
- 删除核心记忆而非归档
- 扩大权限、修改调度器、自动执行外部动作
- 发布插件/skill 到外部仓库
- 参数训练或上传训练数据

## 遗忘策略

- **降级优先于删除**：active → archive → delete。
- **重复内容合并**：多条候选表达同一规则时，保留一条蒸馏版。
- **过期内容归档**：项目状态、工具 bug、临时策略必须设置 decay。
- **冲突规则处理**：新规则覆盖旧规则时，旧规则移入 archive，并说明原因。
`;

const DEFAULT_DESIGN = `# Evolution OS Design

Evolution OS is a governance layer for long-running agents.

## Goal

Make self-evolution auditable, reversible, and metabolizable:

\`\`\`text
capture → candidate → review → promote/archive draft → apply manually → verify → distill/forget
\`\`\`

## Current shape

- Protocol: \`memory/evolution-os/policy.md\`
- Skill: \`skills/self-evolution-governor/SKILL.md\`
- Review tool: \`tools/evolution-review.js\`
- Data: \`memory/evolution-os/\`

## Boundaries

The file-system version does not auto-modify core memory files, delete memories, publish skills/plugins, train models, or upload data.

## Next steps

- Add project-specific candidates to \`memory/evolution-os/inbox/\`.
- Run \`node tools/evolution-review.js --write-report\`.
- Generate promote/archive drafts before changing durable files.
`;

const DEFAULT_CANDIDATE_TEMPLATE = `---
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
  - memory/evolution-os/policy.md
---

## Signal

## Proposed Learning

## Why It Matters

## Promotion Criteria

## Rejection Criteria
`;

const DEFAULT_SKILL = `---
name: self-evolution-governor
description: Use for durable self-improvement: corrections, failures, repeated workflows, memory cleanup, or skill changes. NOT for one-off facts. 触发：自进化、复盘、沉淀、遗忘、skill化。
---

# Self Evolution Governor

This skill governs durable self-improvement. Its job is to prevent uncontrolled memory/skill growth while still capturing useful learning.

## When to activate

Use this skill when:

- The user corrects the agent or expresses a stable preference.
- A task fails, is repeated, or requires rework.
- A new workflow is likely to recur.
- The agent wants to update \`MEMORY.md\`, \`TOOLS.md\`, user-model files, \`AGENTS.md\`, \`SOUL.md\`, or any skill.
- The user discusses self-evolution, memory policy, forgetting, parameter tuning, or training data.
- A candidate should be promoted, archived, merged, or rejected.

Do **not** activate for ordinary one-off facts unless they will change future behavior.

## Required protocol

Before changing any durable core file, read:

1. \`memory/evolution-os/policy.md\`
2. Relevant existing target file, e.g. \`MEMORY.md\`, \`TOOLS.md\`, target skill, or user-model file.

Then follow this flow:

\`\`\`text
Signal → Candidate → Classify → Compress → Check duplicate/conflict → Choose target → Promote/Archive → Verify
\`\`\`

## Default action: candidate first

New learnings default to \`memory/evolution-os/inbox/\` using the candidate schema in \`memory/evolution-os/schemas/candidate-template.md\`.

High-risk changes require user confirmation.
`;

const INIT_FILES = [
  ['memory/evolution-os/README.md', 'templates/memory/evolution-os/README.md', '# Evolution OS\n\nSelf-evolution governance for long-running agents.\n\nSee `policy.md`, `DESIGN.md`, `schemas/candidate-template.md`, and `tools/evolution-review.js`.\n'],
  ['memory/evolution-os/DESIGN.md', 'templates/memory/evolution-os/DESIGN.md', DEFAULT_DESIGN],
  ['memory/evolution-os/policy.md', 'templates/memory/evolution-os/policy.md', DEFAULT_POLICY],
  ['memory/evolution-os/schemas/candidate-template.md', 'templates/memory/evolution-os/schemas/candidate-template.md', DEFAULT_CANDIDATE_TEMPLATE],
  ['skills/self-evolution-governor/SKILL.md', 'templates/skills/self-evolution-governor/SKILL.md', DEFAULT_SKILL],
];

const INIT_DIRS = [
  'memory/evolution-os/inbox',
  'memory/evolution-os/promoted',
  'memory/evolution-os/archive',
  'memory/evolution-os/reports',
  'memory/evolution-os/schemas',
  'memory/evolution-os/training-corpus',
  'skills/self-evolution-governor',
  'tools',
];

function packageRootCandidates() {
  return [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
    ROOT,
  ];
}

function readTemplateFile(templateRelativePath) {
  for (const candidateRoot of packageRootCandidates()) {
    const templatePath = path.join(candidateRoot, templateRelativePath);
    if (exists(templatePath)) return { content: readText(templatePath), source: path.relative(ROOT, templatePath) || templatePath };
  }
  return null;
}

function templateContent(templateRelativePath, fallbackContent) {
  const template = readTemplateFile(templateRelativePath);
  if (template) return template;
  return { content: fallbackContent, source: 'embedded-fallback' };
}

function writeIfMissing(relativePath, content, source = 'embedded-fallback') {
  const absolutePath = path.join(ROOT, relativePath);
  if (exists(absolutePath)) return { path: relativePath, created: false, skipped: true, source: 'existing-file' };
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content.endsWith('\n') ? content : `${content}\n`);
  return { path: relativePath, created: true, skipped: false, source };
}

function initEvolutionOs() {
  const dirs = INIT_DIRS.map((relativePath) => {
    const absolutePath = path.join(ROOT, relativePath);
    if (exists(absolutePath)) return { path: relativePath, created: false };
    fs.mkdirSync(absolutePath, { recursive: true });
    return { path: relativePath, created: true };
  });
  const files = INIT_FILES.map(([relativePath, templateRelativePath, fallbackContent]) => {
    const template = templateContent(templateRelativePath, fallbackContent);
    return writeIfMissing(relativePath, template.content, template.source);
  });
  const config = initConfigFile();
  return {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    dirs,
    files,
    config: { file: path.relative(ROOT, config.file), created: config.created },
    boundary: 'Init only creates missing Evolution OS files/directories; it never overwrites existing files or edits core memory files.',
    nextSuggestedActions: [
      'Run node tools/evolution-review.js --self-check.',
      'Run node tools/evolution-review.js --write-report.',
      'Create the first candidate in memory/evolution-os/inbox/ when a durable learning appears.',
    ],
  };
}

function renderInitMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Init - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Root: ${report.root}`);
  lines.push('');
  lines.push('## Directories');
  lines.push('');
  for (const dir of report.dirs) lines.push(`- ${dir.created ? 'created' : 'exists'}: ${dir.path}`);
  lines.push('');
  lines.push('## Files');
  lines.push('');
  for (const file of report.files) lines.push(`- ${file.created ? 'created' : 'exists'}: ${file.path}${file.source ? ` (${file.source})` : ''}`);
  lines.push(`- ${report.config.created ? 'created' : 'exists'}: ${report.config.file}`);
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(report.boundary);
  lines.push('');
  lines.push('## Next Suggested Actions');
  lines.push('');
  for (const action of report.nextSuggestedActions) lines.push(`- ${action}`);
  lines.push('');
  return lines.join('\n');
}

function installAgentAdapter(targetSkillsDir = '') {
  const skillsRoot = targetSkillsDir || path.join(os.homedir(), '.agents', 'skills');
  const targetDir = path.join(skillsRoot, 'self-evolution-governor');
  const targetFile = path.join(targetDir, 'SKILL.md');
  const template = templateContent('templates/skills/self-evolution-governor/SKILL.md', DEFAULT_SKILL);
  if (exists(targetFile)) {
    return {
      generatedAt: new Date().toISOString(),
      created: false,
      file: targetFile,
      source: 'existing-file',
      boundary: 'Install-adapter never overwrites an existing adapter/skill file.',
      nextSuggestedActions: ['Use the self-evolution-governor skill for corrections, failures, repeated workflows, and durable memory/skill changes.'],
    };
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, template.content.endsWith('\n') ? template.content : `${template.content}\n`);
  return {
    generatedAt: new Date().toISOString(),
    created: true,
    file: targetFile,
    source: template.source,
    boundary: 'Install-adapter creates only the missing self-evolution-governor agent adapter; it does not edit core files.',
    nextSuggestedActions: ['Add a short Evolution OS entry to your host AGENTS.md/system prompt.', 'Run evolution-review --before-task/--after-task around durable work.'],
  };
}


function writeConfig(config) {
  fs.mkdirSync(EVO_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);
}

function configureUnattendedSafeMode() {
  const current = loadConfig();
  const next = deepMerge(current, {
    mode: 'unattended-safe',
    runtime: {
      autoPrepare: true,
      autoReflect: true,
      autoWriteLowRiskCandidates: true,
      periodicUsage: true,
    },
    guardrails: {
      requireApprovalForCoreFiles: true,
      requireApprovalForDeletes: true,
      requireApprovalForPublish: true,
      requireApprovalForExternalNetwork: true,
      requireApprovalForTrainingOrUpload: true,
      keepAuditLog: true,
      rollbackDrafts: true,
    },
    boundaries: {
      autoModifyCoreFiles: false,
      autoDeleteMemory: false,
      autoPublishSkills: false,
      autoTrainOrUpload: false,
    },
  });
  writeConfig(next);
  return { file: CONFIG_FILE, mode: next.mode, config: next };
}

function hostEntryText() {
  return `## Evolution OS Entry\n\nUse Evolution OS for durable self-improvement. Before complex/repeated/high-learning tasks run:\n\`evolution-review --before-task --task \"<task>\"\`\n\nAfter such tasks run:\n\`evolution-review --after-task --task \"<task>\" --outcome \"<outcome>\"\`\n\nFor unattended-safe mode, low-risk candidates may be written to memory/evolution-os/inbox/, but core files, deletion, publishing, external uploads, and training require approval.\n`;
}

function installEvolutionOs(options = {}) {
  const initReport = initEvolutionOs();
  const adapterReport = installAgentAdapter(skillDirArg);
  const unattended = options.unattendedSafe ? configureUnattendedSafeMode() : null;
  const checkReport = selfCheckReport();
  return {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    init: initReport,
    adapter: adapterReport,
    unattendedSafe: unattended,
    selfCheck: checkReport,
    hostEntry: hostEntryText(),
    boundary: 'Safe install creates missing Evolution OS files, config, and adapter only. It does not edit AGENTS.md, restart OpenClaw, grant conversation access, publish, upload, train, delete, or modify core memory files.',
    nextSuggestedActions: [
      'Copy the hostEntry block into AGENTS.md/system prompt, or use your host plugin installer once available.',
      'Run evolution-review --before-task/--after-task manually once to verify the loop.',
      'For OpenClaw automatic hooks, install the plugin and explicitly enable prompt/conversation hook policy.',
    ],
  };
}

function renderInstallMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS One-Command Install - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Root: ${report.root}`);
  lines.push(`Self-check: ${report.selfCheck.ok ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push(`- init files: ${report.init.files.filter((f) => f.created).length} created / ${report.init.files.length} checked`);
  lines.push(`- init dirs: ${report.init.dirs.filter((d) => d.created).length} created / ${report.init.dirs.length} checked`);
  lines.push(`- adapter: ${report.adapter.created ? 'created' : 'exists'} ${report.adapter.file}`);
  lines.push(`- config: ${report.unattendedSafe ? `configured ${report.unattendedSafe.mode}` : 'default safe mode'}`);
  lines.push('');
  lines.push('## Host Entry');
  lines.push('');
  lines.push('Copy this into AGENTS.md, system prompt, or equivalent host instructions:');
  lines.push('');
  lines.push('```md');
  lines.push(report.hostEntry.trim());
  lines.push('```');
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(report.boundary);
  lines.push('');
  lines.push('## Next Suggested Actions');
  lines.push('');
  for (const action of report.nextSuggestedActions) lines.push(`- ${action}`);
  lines.push('');
  if (!report.selfCheck.ok) {
    lines.push('## Self-check Missing');
    lines.push('');
    for (const item of report.selfCheck.missing) lines.push(`- ${item.kind}: ${item.path}${item.note ? ` (${item.note})` : ''}`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderInstallAdapterMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Agent Adapter Install - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`- ${report.created ? 'created' : 'exists'}: ${report.file}`);
  lines.push(`- source: ${report.source}`);
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(report.boundary);
  lines.push('');
  lines.push('## Next Suggested Actions');
  lines.push('');
  for (const action of report.nextSuggestedActions) lines.push(`- ${action}`);
  lines.push('');
  return lines.join('\n');
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function listMarkdown(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name))
    .sort();
}

function bytes(p) {
  return exists(p) ? fs.statSync(p).size : 0;
}

function shaShort(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { data: {}, body: text, ok: false };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { data: {}, body: text, ok: false };
  const raw = text.slice(4, end).trim();
  const body = text.slice(end + 5);
  const data = {};
  let currentKey = null;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(listMatch[1].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    currentKey = key;
    if (value === '') {
      data[key] = [];
    } else {
      data[key] = value.trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return { data, body, ok: true };
}

function requiredCandidateFields(candidate) {
  const required = ['id', 'type', 'source', 'confidence', 'status', 'scope', 'created', 'decay', 'risk'];
  return required.filter((field) => !candidate.data[field]);
}

function bodyHasSections(body) {
  const required = ['## Signal', '## Proposed Learning', '## Why It Matters', '## Promotion Criteria', '## Rejection Criteria'];
  return required.filter((section) => !body.includes(section));
}

function daysBetween(dateString, now = new Date()) {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86400000);
}

function parseDecayDays(decay) {
  if (!decay || decay === 'permanent') return null;
  const match = String(decay).match(/^(\d+)d$/);
  return match ? Number(match[1]) : null;
}

function decayStatus(candidate, now = new Date()) {
  const ageDays = daysBetween(candidate.created, now);
  const decayDays = parseDecayDays(candidate.decay);
  if (ageDays == null) return { ageDays: null, decayDays, state: 'unknown', message: 'created date is missing or invalid' };
  if (decayDays == null) return { ageDays, decayDays: null, state: 'permanent', message: 'no decay deadline' };
  const daysLeft = decayDays - ageDays;
  const dueSoonWindow = Math.max(CONFIG.candidates.dueSoonMinDays, Math.ceil(decayDays * CONFIG.candidates.dueSoonRatio));
  if (daysLeft < 0) return { ageDays, decayDays, daysLeft, state: 'expired', message: `expired ${Math.abs(daysLeft)} day(s) ago` };
  if (daysLeft <= dueSoonWindow) return { ageDays, decayDays, daysLeft, state: 'due-soon', message: `review within ${daysLeft} day(s)` };
  return { ageDays, decayDays, daysLeft, state: 'active', message: `${daysLeft} day(s) before review` };
}

function auditCandidates(files) {
  return files.map((file) => {
    const text = readText(file);
    const parsed = parseFrontmatter(text);
    const missingFields = requiredCandidateFields(parsed);
    const missingSections = bodyHasSections(parsed.body);
    return {
      file: path.relative(ROOT, file),
      absoluteFile: file,
      id: parsed.data.id || null,
      status: parsed.data.status || null,
      type: parsed.data.type || null,
      risk: parsed.data.risk || null,
      confidence: parsed.data.confidence || null,
      decay: parsed.data.decay || null,
      created: parsed.data.created || null,
      scope: parsed.data.scope || null,
      suggestedTargets: Array.isArray(parsed.data.suggested_targets) ? parsed.data.suggested_targets : [],
      bytes: Buffer.byteLength(text),
      sha: shaShort(text),
      frontmatterOk: parsed.ok,
      missingFields,
      missingSections,
      body: parsed.body,
      decayStatus: decayStatus({ created: parsed.data.created || null, decay: parsed.data.decay || null }),
    };
  });
}

function duplicateIdWarnings(candidates) {
  const seen = new Map();
  const warnings = [];
  for (const c of candidates) {
    if (!c.id) continue;
    if (seen.has(c.id)) warnings.push(`Duplicate candidate id: ${c.id} in ${seen.get(c.id)} and ${c.file}`);
    else seen.set(c.id, c.file);
  }
  return warnings;
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);
  const ascii = normalized.match(/[a-z0-9_]{3,}/g) || [];
  const cjk = normalized.match(/[\p{Script=Han}]{2,}/gu) || [];
  return new Set([...ascii, ...cjk]);
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function duplicateCandidateGroups(candidates) {
  const groups = [];
  const exact = new Map();
  for (const c of candidates) {
    const distilled = deriveDistilledRule(c);
    const key = shaShort(normalizeText(distilled));
    if (!exact.has(key)) exact.set(key, []);
    exact.get(key).push({ candidate: c, distilled, key });
  }
  for (const [key, entries] of exact) {
    if (entries.length > 1) {
      groups.push({ kind: 'exact-distilled-rule', score: 1, key, files: entries.map((e) => e.candidate.file), suggestedAction: 'merge or archive duplicates; keep the clearest candidate' });
    }
  }

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.type !== b.type || a.scope !== b.scope) continue;
      const aTokens = tokenize(`${extractSection(a.body, 'Signal')} ${extractSection(a.body, 'Proposed Learning')}`);
      const bTokens = tokenize(`${extractSection(b.body, 'Signal')} ${extractSection(b.body, 'Proposed Learning')}`);
      const score = jaccard(aTokens, bTokens);
      if (score >= CONFIG.candidates.duplicateSimilarityThreshold) {
        const alreadyExact = groups.some((g) => g.files.includes(a.file) && g.files.includes(b.file));
        if (!alreadyExact) {
          groups.push({ kind: 'similar-signal-learning', score: Number(score.toFixed(3)), files: [a.file, b.file], suggestedAction: 'review for merge; if same lesson, promote one distilled rule and archive the other' });
        }
      }
    }
  }
  return groups;
}

function memoryBudget() {
  const size = bytes(MEMORY_FILE);
  const softLimit = CONFIG.memory.softLimitBytes;
  const target = CONFIG.memory.targetBytes;
  return {
    file: 'MEMORY.md',
    exists: exists(MEMORY_FILE),
    bytes: size,
    targetBytes: target,
    softLimitBytes: softLimit,
    overTarget: size > target,
    overSoftLimit: size > softLimit,
  };
}

function policyChecks() {
  const checks = ['默认进候选池', '遗忘是进化的一部分', 'High：必须确认', '参数进化只吃消化后的营养'];
  const text = exists(POLICY_FILE) ? readText(POLICY_FILE) : '';
  return checks.map((token) => ({ token, present: text.includes(token) }));
}

function summarize() {
  const inboxFiles = listMarkdown(INBOX_DIR);
  const archiveFiles = listMarkdown(ARCHIVE_DIR);
  const promotedFiles = listMarkdown(PROMOTED_DIR);
  const candidates = auditCandidates(inboxFiles);
  const warnings = [
    ...duplicateIdWarnings(candidates),
    ...candidates.flatMap((c) => {
      const out = [];
      if (!c.frontmatterOk) out.push(`Bad frontmatter: ${c.file}`);
      if (c.missingFields.length) out.push(`Missing fields in ${c.file}: ${c.missingFields.join(', ')}`);
      if (c.missingSections.length) out.push(`Missing sections in ${c.file}: ${c.missingSections.join(', ')}`);
      return out;
    }),
  ];
  const budget = memoryBudget();
  if (budget.overSoftLimit) warnings.push(`MEMORY.md over soft limit: ${budget.bytes} > ${budget.softLimitBytes}`);
  for (const c of candidates) {
    if (c.decayStatus?.state === 'expired') warnings.push(`Candidate expired: ${c.file} (${c.decayStatus.message})`);
    if (c.decayStatus?.state === 'due-soon') warnings.push(`Candidate due soon: ${c.file} (${c.decayStatus.message})`);
  }

  const duplicateGroups = duplicateCandidateGroups(candidates);
  for (const group of duplicateGroups) {
    warnings.push(`Possible duplicate candidates (${group.kind}, score=${group.score}): ${group.files.join(' <-> ')}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    counts: {
      inbox: inboxFiles.length,
      archive: archiveFiles.length,
      promoted: promotedFiles.length,
    },
    memoryBudget: budget,
    policyChecks: policyChecks(),
    duplicateGroups,
    inbox: candidates,
    warnings,
    nextSuggestedActions: [
      candidates.length ? 'Review inbox candidates and decide: promote / merge / archive / reject.' : 'No inbox candidates. Capture future learning as candidates first.',
      budget.overTarget ? 'Consider distilling MEMORY.md if it grows further; do not auto-truncate.' : 'MEMORY.md is within compact target.',
      'Keep plugin implementation deferred until the file-based workflow is used at least once for a real promotion.',
    ],
  };
  return report;
}

function extractSection(body, heading) {
  const marker = `## ${heading}`;
  const start = body.indexOf(marker);
  if (start === -1) return '';
  const after = start + marker.length;
  const next = body.indexOf('\n## ', after);
  return body.slice(after, next === -1 ? body.length : next).trim();
}

function firstNonEmptyLine(text) {
  return text.split('\n').map((line) => line.trim()).find(Boolean) || '';
}

function deriveDistilledRule(candidate) {
  const proposed = extractSection(candidate.body, 'Proposed Learning');
  const meaningful = proposed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, ''));
  if (meaningful.length) {
    const head = meaningful[0].replace(/[：:]$/, '');
    const bullets = meaningful.slice(1, 5).map((line) => line.replace(/[。.]$/, ''));
    if (bullets.length) return `${head}：${bullets.join('；')}。`;
    return head;
  }
  const signal = firstNonEmptyLine(extractSection(candidate.body, 'Signal')).replace(/^[-*]\s*/, '');
  return signal || '(no distilled rule available; manual review required)';
}

function classifyPromotion(candidate) {
  const blockers = [];
  if (!candidate.frontmatterOk) blockers.push('frontmatter is invalid');
  if (candidate.missingFields.length) blockers.push(`missing required fields: ${candidate.missingFields.join(', ')}`);
  if (candidate.missingSections.length) blockers.push(`missing required sections: ${candidate.missingSections.join(', ')}`);
  if (candidate.status && candidate.status !== 'candidate' && candidate.status !== 'validated') {
    blockers.push(`status is ${candidate.status}, expected candidate or validated`);
  }

  const manualReview = candidate.risk === 'high' || candidate.suggestedTargets.some((target) => ['AGENTS.md', 'SOUL.md'].includes(target));
  const ready = blockers.length === 0 && !manualReview;
  const decision = blockers.length ? 'blocked' : manualReview ? 'needs-human-review' : 'ready-for-draft';

  const distilledRule = deriveDistilledRule(candidate);
  const targets = candidate.suggestedTargets.length ? candidate.suggestedTargets : suggestTargets(candidate);
  const suggestedAction = suggestAction(candidate, targets);

  return {
    generatedAt: new Date().toISOString(),
    candidate: {
      file: candidate.file,
      id: candidate.id,
      type: candidate.type,
      status: candidate.status,
      risk: candidate.risk,
      confidence: candidate.confidence,
      decay: candidate.decay,
      sha: candidate.sha,
    },
    decision,
    ready,
    blockers,
    manualReviewRequired: manualReview,
    suggestedTargets: targets,
    distilledRule,
    suggestedAction,
    changePlan: changePlan(candidate, targets, distilledRule),
    draftDiff: draftDiff(candidate, targets, distilledRule),
    verification: [
      'Run node tools/evolution-review.js after any promotion.',
      'Confirm the candidate is moved or logged under memory/evolution-os/promoted/ if promoted.',
      'Do not delete the original candidate until promotion is verified; archive instead.',
    ],
  };
}

function suggestTargets(candidate) {
  switch (candidate.type) {
    case 'tool': return ['TOOLS.md'];
    case 'failure': return ['memory/hard-cases/'];
    case 'workflow': return ['skills/'];
    case 'preference': return ['memory/user-model/preferences.md'];
    case 'training': return ['memory/evolution-os/training-corpus/'];
    case 'architecture': return ['memory/evolution.md'];
    default: return ['memory/evolution-os/archive/'];
  }
}

function suggestAction(candidate, targets) {
  if (candidate.risk === 'high') return 'Generate a draft only; ask for human confirmation before writing target files.';
  if (candidate.type === 'architecture' && targets.includes('memory/evolution.md')) return 'Promote as a short architecture note in memory/evolution.md and log promotion.';
  if (candidate.type === 'workflow') return 'Create or update a skill draft, then test it before promotion.';
  if (candidate.type === 'failure') return 'Write a hard-case note and update the relevant trigger/checklist if needed.';
  return 'Promote only after compressing to the smallest behavior-changing rule.';
}

function draftDiff(candidate, targets, distilledRule) {
  const lines = [];
  lines.push('```diff');
  for (const target of targets) {
    lines.push(`--- ${target}`);
    lines.push(`+++ ${target}`);
    if (target === 'memory/evolution.md') {
      lines.push('@@ Suggested addition @@');
      lines.push(`+ - ${distilledRule}`);
    } else if (target === 'MEMORY.md') {
      lines.push('@@ Suggested compressed long-term memory @@');
      lines.push(`+ - ${distilledRule}`);
    } else if (target.includes('training-corpus')) {
      lines.push('@@ Suggested training sample draft @@');
      lines.push(`+ { "source_candidate": "${candidate.id}", "lesson": ${JSON.stringify(distilledRule)} }`);
    } else if (target === 'memory/evolution-os/policy.md' || target === 'skills/self-evolution-governor/SKILL.md') {
      lines.push('@@ No direct content change suggested @@');
      lines.push('+ Already covered by current policy/skill. Log promotion only unless manual review finds a gap.');
    } else {
      lines.push('@@ Suggested note @@');
      lines.push(`+ ${distilledRule}`);
    }
  }
  lines.push('```');
  return lines.join('\n');
}

function changePlan(candidate, targets, distilledRule) {
  return targets.map((target) => {
    if (target === 'memory/evolution.md') {
      return {
        target,
        operation: 'append-note',
        content: `- ${distilledRule}`,
        rationale: 'Architecture-level evolution principle worth keeping as a compact note.',
      };
    }
    if (target === 'MEMORY.md') {
      return {
        target,
        operation: 'append-compressed-memory',
        content: `- ${distilledRule}`,
        rationale: 'Long-term behavior-changing memory; keep one sentence only.',
      };
    }
    if (target.includes('training-corpus')) {
      return {
        target,
        operation: 'create-training-sample-draft',
        content: JSON.stringify({ source_candidate: candidate.id, lesson: distilledRule }, null, 2),
        rationale: 'Training corpus entries are drafts only until validated outcomes exist.',
      };
    }
    if (target === 'memory/evolution-os/policy.md' || target === 'skills/self-evolution-governor/SKILL.md') {
      return {
        target,
        operation: 'no-direct-change-log-only',
        content: 'Current policy/skill already encode this rule; do not duplicate unless a concrete gap is found.',
        rationale: 'Avoid protocol bloat and duplicate rules.',
      };
    }
    return {
      target,
      operation: 'manual-note-draft',
      content: distilledRule,
      rationale: 'Target requires manual placement.',
    };
  });
}

function findCandidate(selector) {
  if (!selector) throw new Error('Missing --candidate <id-or-file>');
  const candidates = auditCandidates(listMarkdown(INBOX_DIR));
  const match = candidates.find((c) => c.id === selector || c.file === selector || path.basename(c.file) === selector);
  if (!match) throw new Error(`Candidate not found: ${selector}`);
  return match;
}

function renderPromotionMarkdown(promotion) {
  const lines = [];
  lines.push(`# Evolution OS Promotion Suggestion - ${promotion.candidate.id || 'unknown'}`);
  lines.push('');
  lines.push(`Generated: ${promotion.generatedAt}`);
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(`- Decision: ${promotion.decision}`);
  lines.push(`- Ready: ${promotion.ready ? 'yes' : 'no'}`);
  lines.push(`- Manual review required: ${promotion.manualReviewRequired ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Candidate');
  lines.push('');
  for (const [key, value] of Object.entries(promotion.candidate)) lines.push(`- ${key}: ${value}`);
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  if (!promotion.blockers.length) lines.push('- None');
  else for (const blocker of promotion.blockers) lines.push(`- ${blocker}`);
  lines.push('');
  lines.push('## Suggested Targets');
  lines.push('');
  for (const target of promotion.suggestedTargets) lines.push(`- ${target}`);
  lines.push('');
  lines.push('## Distilled Rule');
  lines.push('');
  lines.push(promotion.distilledRule);
  lines.push('');
  lines.push('## Suggested Action');
  lines.push('');
  lines.push(promotion.suggestedAction);
  lines.push('');
  lines.push('## Draft Diff');
  lines.push('');
  lines.push(promotion.draftDiff);
  lines.push('');
  lines.push('## Verification');
  lines.push('');
  for (const item of promotion.verification) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}

function writePromotionReport(promotion) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const safeId = (promotion.candidate.id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '-');
  const out = path.join(REPORTS_DIR, `${today}-promotion-${safeId}.md`);
  fs.writeFileSync(out, renderPromotionMarkdown(promotion));
  return out;
}

function renderPromoteDraftMarkdown(promotion) {
  const lines = [];
  lines.push(`# Evolution OS Promote Draft - ${promotion.candidate.id || 'unknown'}`);
  lines.push('');
  lines.push(`Generated: ${promotion.generatedAt}`);
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push(`- Decision: ${promotion.decision}`);
  lines.push(`- Ready for draft: ${promotion.ready ? 'yes' : 'no'}`);
  lines.push(`- Manual review required before apply: ${promotion.manualReviewRequired ? 'yes' : 'no'}`);
  lines.push(`- Source candidate: ${promotion.candidate.file}`);
  lines.push(`- Candidate SHA: ${promotion.candidate.sha}`);
  lines.push('');
  lines.push('## Distilled Rule');
  lines.push('');
  lines.push(promotion.distilledRule);
  lines.push('');
  lines.push('## Change Plan');
  lines.push('');
  for (const [index, change] of promotion.changePlan.entries()) {
    lines.push(`### ${index + 1}. ${change.target}`);
    lines.push('');
    lines.push(`- Operation: ${change.operation}`);
    lines.push(`- Rationale: ${change.rationale}`);
    lines.push('');
    lines.push('```text');
    lines.push(change.content);
    lines.push('```');
    lines.push('');
  }
  lines.push('## Draft Diff');
  lines.push('');
  lines.push(promotion.draftDiff);
  lines.push('');
  lines.push('## Apply Checklist');
  lines.push('');
  lines.push('- [ ] Re-read target file before applying.');
  lines.push('- [ ] Confirm no duplicate or conflicting rule already exists.');
  lines.push('- [ ] Apply only the smallest useful change.');
  lines.push('- [ ] Move or copy this draft into promoted log after apply.');
  lines.push('- [ ] Archive source candidate only after verification succeeds.');
  lines.push('- [ ] Run `node tools/evolution-review.js --json` after apply.');
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  if (!promotion.blockers.length) lines.push('- None');
  else for (const blocker of promotion.blockers) lines.push(`- ${blocker}`);
  lines.push('');
  return lines.join('\n');
}

function writePromoteDraft(promotion) {
  fs.mkdirSync(PROMOTED_DIR, { recursive: true });
  const safeId = (promotion.candidate.id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '-');
  const out = path.join(PROMOTED_DIR, `${safeId}.draft.md`);
  fs.writeFileSync(out, renderPromoteDraftMarkdown(promotion));
  return out;
}

function classifyArchive(candidate, reason) {
  const blockers = [];
  if (!candidate.frontmatterOk) blockers.push('frontmatter is invalid');
  if (!candidate.id) blockers.push('missing candidate id');
  const allowedReasons = ['rejected', 'merged', 'expired', 'superseded', 'manual-review', 'promoted'];
  const normalizedReason = allowedReasons.includes(reason) ? reason : 'manual-review';
  return {
    generatedAt: new Date().toISOString(),
    candidate: {
      file: candidate.file,
      id: candidate.id,
      type: candidate.type,
      status: candidate.status,
      risk: candidate.risk,
      confidence: candidate.confidence,
      decay: candidate.decay,
      decayStatus: candidate.decayStatus,
      sha: candidate.sha,
    },
    decision: blockers.length ? 'blocked' : 'archive-draft-ready',
    ready: blockers.length === 0,
    blockers,
    reason: normalizedReason,
    archiveFile: `memory/evolution-os/archive/${candidate.id || path.basename(candidate.file, '.md')}.md`,
    instructions: [
      'This is a draft only; do not delete the inbox candidate until archive content is verified.',
      'Archive by copying essential signal and the archive reason, then remove or move the inbox file.',
      'Run node tools/evolution-review.js --json after archiving.',
    ],
  };
}

function renderArchiveDraftMarkdown(archive) {
  const lines = [];
  lines.push(`# Evolution OS Archive Draft - ${archive.candidate.id || 'unknown'}`);
  lines.push('');
  lines.push(`Generated: ${archive.generatedAt}`);
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push(`- Decision: ${archive.decision}`);
  lines.push(`- Ready: ${archive.ready ? 'yes' : 'no'}`);
  lines.push(`- Reason: ${archive.reason}`);
  lines.push(`- Source candidate: ${archive.candidate.file}`);
  lines.push(`- Suggested archive file: ${archive.archiveFile}`);
  lines.push(`- Candidate SHA: ${archive.candidate.sha}`);
  lines.push(`- Decay: ${archive.candidate.decay} / ${archive.candidate.decayStatus?.state || 'unknown'} (${archive.candidate.decayStatus?.message || 'n/a'})`);
  lines.push('');
  lines.push('## Draft Archive Content');
  lines.push('');
  lines.push('```markdown');
  lines.push('---');
  lines.push(`id: ${archive.candidate.id || 'unknown'}`);
  lines.push(`type: ${archive.candidate.type || 'unknown'}`);
  lines.push(`status: archived`);
  lines.push(`archive_reason: ${archive.reason}`);
  lines.push(`archived: ${today}`);
  lines.push(`source_candidate: ${archive.candidate.file}`);
  lines.push('---');
  lines.push('');
  lines.push('## Archive Reason');
  lines.push('');
  lines.push(archive.reason);
  lines.push('');
  lines.push('## Original Summary');
  lines.push('');
  lines.push('(copy the essential Signal / Proposed Learning here before applying)');
  lines.push('```');
  lines.push('');
  lines.push('## Apply Checklist');
  lines.push('');
  lines.push('- [ ] Re-read source candidate.');
  lines.push('- [ ] Copy essential signal and learning into archive file.');
  lines.push('- [ ] Do not preserve excessive raw context.');
  lines.push('- [ ] Move/remove source from inbox only after archive file exists.');
  lines.push('- [ ] Run `node tools/evolution-review.js --json`.');
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  if (!archive.blockers.length) lines.push('- None');
  else for (const blocker of archive.blockers) lines.push(`- ${blocker}`);
  lines.push('');
  return lines.join('\n');
}

function writeArchiveDraft(archive) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const safeId = (archive.candidate.id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '-');
  const out = path.join(ARCHIVE_DIR, `${safeId}.archive-draft.md`);
  fs.writeFileSync(out, renderArchiveDraftMarkdown(archive));
  return out;
}

function parseMarkdownSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = { title: '(preamble)', level: 0, lines: [] };
  for (const line of lines) {
    const match = line.match(/^(##+)\s+(.+)$/);
    if (match && match[1].length === 2) {
      sections.push(current);
      current = { title: match[2].trim(), level: 2, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections.filter((s) => s.lines.join('\n').trim());
}

function countBullets(lines) {
  return lines.filter((line) => /^\s*-\s+/.test(line)).length;
}

function memoryDistillSuggestions() {
  const text = exists(MEMORY_FILE) ? readText(MEMORY_FILE) : '';
  const size = Buffer.byteLength(text);
  const targetBytes = CONFIG.memory.targetBytes;
  const softLimitBytes = CONFIG.memory.softLimitBytes;
  const sections = parseMarkdownSections(text).map((section) => {
    const body = section.lines.join('\n');
    const sectionBytes = Buffer.byteLength(body);
    const bullets = countBullets(section.lines);
    const flags = [];
    const suggestions = [];
    if (sectionBytes > CONFIG.memory.sectionWarningBytes) {
      flags.push('large-section');
      suggestions.push('Consider compressing this section to 2-4 bullets or moving details to a project/tool note.');
    }
    if (bullets > CONFIG.memory.maxBulletsPerSection) {
      flags.push('many-bullets');
      suggestions.push('Merge related bullets; keep only behavior-changing facts.');
    }
    if (/cron|job|releaseId|commit|SHA|tag|artifact/i.test(body) && section.title !== '维护规则') {
      flags.push('operational-detail');
      suggestions.push('Check whether exact operational IDs still need long-term memory; move stale details to project notes if not active.');
    }
    if (/步骤|流程|命令|先.*再|必须.*执行|workflow|checklist/i.test(body) && section.title !== '维护规则') {
      flags.push('workflow-like');
      suggestions.push('If this is procedural, move it to a skill or TOOLS.md and leave only the trigger/summary here.');
    }
    return {
      title: section.title,
      bytes: sectionBytes,
      bullets,
      flags,
      suggestions,
    };
  });

  const flagged = sections.filter((s) => s.flags.length);
  const suggestedBudget = {
    targetBytes,
    softLimitBytes,
    currentBytes: size,
    overTarget: size > targetBytes,
    overSoftLimit: size > softLimitBytes,
    suggestedReductionBytes: Math.max(0, size - targetBytes),
  };

  const suggestedActions = [];
  if (suggestedBudget.overTarget) suggestedActions.push('MEMORY.md is over the compact target; distill largest flagged sections first.');
  if (suggestedBudget.overSoftLimit) suggestedActions.push('MEMORY.md is over soft limit; block automatic writes until manual distillation.');
  if (!flagged.length) suggestedActions.push('No flagged sections; keep monitoring size.');
  for (const section of flagged.slice(0, 5)) {
    suggestedActions.push(`Review section "${section.title}" (${section.bytes} bytes): ${section.suggestions[0]}`);
  }
  suggestedActions.push('Do not auto-apply; create a promote draft or manual edit after review.');

  return {
    generatedAt: new Date().toISOString(),
    file: 'MEMORY.md',
    budget: suggestedBudget,
    sections,
    flaggedSections: flagged,
    suggestedActions,
  };
}

function renderMemoryDistillMarkdown(report) {
  const lines = [];
  lines.push(`# MEMORY.md Distill Suggestions - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Budget');
  lines.push('');
  lines.push(`- Current bytes: ${report.budget.currentBytes}`);
  lines.push(`- Target bytes: ${report.budget.targetBytes}`);
  lines.push(`- Soft limit bytes: ${report.budget.softLimitBytes}`);
  lines.push(`- Over target: ${report.budget.overTarget ? 'yes' : 'no'}`);
  lines.push(`- Over soft limit: ${report.budget.overSoftLimit ? 'yes' : 'no'}`);
  lines.push(`- Suggested reduction: ${report.budget.suggestedReductionBytes} bytes`);
  lines.push('');
  lines.push('## Sections');
  lines.push('');
  for (const section of report.sections) {
    lines.push(`- ${section.title}: ${section.bytes} bytes, ${section.bullets} bullet(s)`);
    if (section.flags.length) lines.push(`  - flags: ${section.flags.join(', ')}`);
    for (const suggestion of section.suggestions) lines.push(`  - suggestion: ${suggestion}`);
  }
  lines.push('');
  lines.push('## Suggested Actions');
  lines.push('');
  for (const action of report.suggestedActions) lines.push(`- ${action}`);
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('- This report does not modify MEMORY.md.');
  lines.push('- Apply only after manually reviewing target sections.');
  lines.push('- Prefer moving procedures to skills and tool details to TOOLS.md rather than deleting useful context.');
  lines.push('');
  return lines.join('\n');
}

function writeMemoryDistillReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const out = path.join(REPORTS_DIR, `${today}-memory-distill.md`);
  fs.writeFileSync(out, renderMemoryDistillMarkdown(report));
  return out;
}

function writeMemoryDistillReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const out = path.join(REPORTS_DIR, `${today}-memory-distill.md`);
  fs.writeFileSync(out, renderMemoryDistillMarkdown(report));
  return out;
}

function memoryDistillDraftReport() {
  const base = memoryDistillSuggestions();
  const flagged = base.flaggedSections;
  const draftSections = flagged.map((section) => {
    let recommendation = 'Keep section; review manually.';
    let suggestedTarget = 'MEMORY.md';
    let draftSummary = '';
    if (section.flags.includes('operational-detail')) {
      suggestedTarget = 'project notes or archive; MEMORY.md keeps a one-line status summary';
      draftSummary = `保留该主题的当前状态/行为约束，迁移 releaseId、commit、SHA、cron job 等精确操作细节到项目记录或 archive。`;
      recommendation = 'compress-and-migrate-operational-details';
    } else if (section.flags.includes('workflow-like')) {
      suggestedTarget = 'skill or TOOLS.md; MEMORY.md keeps trigger only';
      draftSummary = `保留触发条件和关键红线，把步骤/命令/检查清单迁移到 skill 或 TOOLS.md。`;
      recommendation = 'move-procedure-out-of-memory';
    } else if (section.flags.includes('large-section') || section.flags.includes('many-bullets')) {
      suggestedTarget = 'MEMORY.md compressed section';
      draftSummary = `压缩为 2-4 条会改变未来行为的规则，删除一次性背景和重复描述。`;
      recommendation = 'compress-in-place';
    }
    return {
      title: section.title,
      currentBytes: section.bytes,
      flags: section.flags,
      recommendation,
      suggestedTarget,
      draftSummary,
      estimatedSavingsBytes: Math.max(0, Math.round(section.bytes * 0.35)),
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    file: 'MEMORY.md',
    budget: base.budget,
    draftSections,
    estimatedTotalSavingsBytes: draftSections.reduce((sum, s) => sum + s.estimatedSavingsBytes, 0),
    applyBoundary: [
      'This is a distillation draft, not an edit script.',
      'Read MEMORY.md before applying any suggestion.',
      'Prefer moving details to project notes/TOOLS/skills over deleting context blindly.',
      'After manual edit, run node tools/evolution-review.js --memory-distill --json.',
    ],
  };
}

function renderMemoryDistillDraftMarkdown(report) {
  const lines = [];
  lines.push(`# MEMORY.md Distill Draft - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Budget');
  lines.push('');
  lines.push(`- Current bytes: ${report.budget.currentBytes}`);
  lines.push(`- Target bytes: ${report.budget.targetBytes}`);
  lines.push(`- Suggested reduction to target: ${report.budget.suggestedReductionBytes}`);
  lines.push(`- Estimated savings from this draft: ${report.estimatedTotalSavingsBytes}`);
  lines.push('');
  lines.push('## Draft Sections');
  lines.push('');
  if (!report.draftSections.length) {
    lines.push('- No flagged sections. No distillation draft needed.');
  } else {
    for (const section of report.draftSections) {
      lines.push(`### ${section.title}`);
      lines.push('');
      lines.push(`- Current bytes: ${section.currentBytes}`);
      lines.push(`- Flags: ${section.flags.join(', ')}`);
      lines.push(`- Recommendation: ${section.recommendation}`);
      lines.push(`- Suggested target: ${section.suggestedTarget}`);
      lines.push(`- Estimated savings: ${section.estimatedSavingsBytes} bytes`);
      lines.push('');
      lines.push('Suggested compressed direction:');
      lines.push('');
      lines.push(`> ${section.draftSummary}`);
      lines.push('');
    }
  }
  lines.push('## Apply Checklist');
  lines.push('');
  for (const item of report.applyBoundary) lines.push(`- [ ] ${item}`);
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('- This file does not modify MEMORY.md.');
  lines.push('- It is meant to be reviewed by an agent or human before a manual edit/promotion draft.');
  lines.push('');
  return lines.join('\n');
}

function writeMemoryDistillDraftReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const out = path.join(REPORTS_DIR, `${today}-memory-distill-draft.md`);
  fs.writeFileSync(out, renderMemoryDistillDraftMarkdown(report));
  return out;
}

function parseSkillFrontmatter(text) {
  const parsed = parseFrontmatter(text);
  return parsed;
}

function collectSkillFiles({ includeAll = false } = {}) {
  const roots = [path.join(ROOT, 'skills')];
  if (includeAll) {
    roots.push(path.join(ROOT, '.agents/skills'));
    roots.push(path.join(process.env.HOME || '', '.agents/skills'));
    roots.push(path.join(process.env.HOME || '', '.openclaw/skills'));
  }
  const files = [];
  const seen = new Set();
  for (const root of roots) {
    if (!root || !exists(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git'].includes(entry.name)) stack.push(p);
        } else if (entry.isFile() && entry.name === 'SKILL.md' && !seen.has(p)) {
          seen.add(p);
          files.push(p);
        }
      }
    }
  }
  return files.sort();
}

function skillAuditReport({ includeAll = false } = {}) {
  const files = collectSkillFiles({ includeAll });
  const skills = files.map((file) => {
    const text = readText(file);
    const parsed = parseSkillFrontmatter(text);
    const name = parsed.data.name || null;
    const description = parsed.data.description || null;
    const bytes = Buffer.byteLength(text);
    const lines = text.split('\n').length;
    const flags = [];
    const suggestions = [];
    if (!parsed.ok) {
      flags.push('missing-frontmatter');
      suggestions.push('Add YAML frontmatter with name and description.');
    }
    if (!name) {
      flags.push('missing-name');
      suggestions.push('Add a stable hyphen-case skill name.');
    } else if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      flags.push('non-hyphen-case-name');
      suggestions.push('Use lowercase hyphen-case for skill name.');
    }
    if (!description) {
      flags.push('missing-description');
      suggestions.push('Add a concise trigger-oriented description.');
    } else if (description.length > CONFIG.skills.maxDescriptionLength) {
      flags.push('long-description');
      suggestions.push('Shorten description to 2-3 trigger-focused lines; avoid full instructions in frontmatter.');
    }
    if (bytes > CONFIG.skills.largeSkillBytes) {
      flags.push('large-skill');
      suggestions.push('Consider splitting long procedures or moving examples to referenced files.');
    }
    if (lines > CONFIG.skills.manyLines) {
      flags.push('many-lines');
      suggestions.push('Compress instructions; keep only decision rules and essential workflow.');
    }
    const body = parsed.body || text;
    if ((body.match(/```/g) || []).length > 8) {
      flags.push('many-code-blocks');
      suggestions.push('Move long code/examples into separate files and reference them.');
    }
    return {
      file: path.relative(ROOT, file),
      absoluteFile: file,
      name,
      description,
      descriptionLength: description ? description.length : 0,
      bytes,
      lines,
      sha: shaShort(text),
      frontmatterOk: parsed.ok,
      flags,
      suggestions: [...new Set(suggestions)],
      triggerTokens: tokenize(`${name || ''} ${description || ''}`),
    };
  });

  const warnings = [];
  const nameMap = new Map();
  for (const skill of skills) {
    if (skill.name) {
      if (!nameMap.has(skill.name)) nameMap.set(skill.name, []);
      nameMap.get(skill.name).push(skill.file);
    }
    for (const flag of skill.flags) warnings.push(`${skill.file}: ${flag}`);
  }
  const duplicateNames = [];
  for (const [name, filesForName] of nameMap) {
    if (filesForName.length > 1) {
      duplicateNames.push({ name, files: filesForName });
      warnings.push(`Duplicate skill name ${name}: ${filesForName.join(' <-> ')}`);
    }
  }

  const similarDescriptions = [];
  for (let i = 0; i < skills.length; i += 1) {
    for (let j = i + 1; j < skills.length; j += 1) {
      const a = skills[i];
      const b = skills[j];
      if (!a.description || !b.description) continue;
      const score = jaccard(a.triggerTokens, b.triggerTokens);
      if (score >= CONFIG.skills.similarDescriptionThreshold) {
        similarDescriptions.push({ score: Number(score.toFixed(3)), files: [a.file, b.file], names: [a.name, b.name] });
        warnings.push(`Similar skill trigger/description (${score.toFixed(3)}): ${a.file} <-> ${b.file}`);
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    scope: includeAll ? 'workspace-and-global' : 'workspace',
    counts: {
      skills: skills.length,
      flagged: skills.filter((s) => s.flags.length).length,
      duplicateNames: duplicateNames.length,
      similarDescriptions: similarDescriptions.length,
    },
    skills: skills.map(({ triggerTokens, ...rest }) => rest),
    duplicateNames,
    similarDescriptions,
    warnings,
    suggestedActions: [
      skills.some((s) => s.flags.includes('long-description')) ? 'Shorten long descriptions first; frontmatter is prompt budget.' : 'Descriptions look compact enough for audited scope.',
      skills.some((s) => s.flags.includes('large-skill')) ? 'Review large skills and split examples/workflows if needed.' : 'No large skills in audited scope.',
      duplicateNames.length || similarDescriptions.length ? 'Review duplicate/similar skills for merge or archive.' : 'No duplicate skill names or high-similarity descriptions in audited scope.',
    ],
  };
}

function renderSkillAuditMarkdown(report) {
  const lines = [];
  lines.push(`# Skill Audit - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Scope: ${report.scope}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Skills: ${report.counts.skills}`);
  lines.push(`- Flagged skills: ${report.counts.flagged}`);
  lines.push(`- Duplicate names: ${report.counts.duplicateNames}`);
  lines.push(`- Similar descriptions: ${report.counts.similarDescriptions}`);
  lines.push('');
  lines.push('## Skills');
  lines.push('');
  if (!report.skills.length) {
    lines.push('- None');
  } else {
    for (const skill of report.skills) {
      lines.push(`- ${skill.file}`);
      lines.push(`  - name: ${skill.name || '(missing)'}`);
      lines.push(`  - bytes/lines: ${skill.bytes} / ${skill.lines}`);
      lines.push(`  - description length: ${skill.descriptionLength}`);
      if (skill.flags.length) lines.push(`  - flags: ${skill.flags.join(', ')}`);
      for (const suggestion of skill.suggestions) lines.push(`  - suggestion: ${suggestion}`);
    }
  }
  lines.push('');
  lines.push('## Duplicate Names');
  lines.push('');
  if (!report.duplicateNames.length) lines.push('- None');
  else for (const item of report.duplicateNames) lines.push(`- ${item.name}: ${item.files.join(' <-> ')}`);
  lines.push('');
  lines.push('## Similar Descriptions');
  lines.push('');
  if (!report.similarDescriptions.length) lines.push('- None');
  else for (const item of report.similarDescriptions) lines.push(`- score=${item.score}: ${item.files.join(' <-> ')}`);
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  if (!report.warnings.length) lines.push('- None');
  else for (const warning of report.warnings) lines.push(`- ${warning}`);
  lines.push('');
  lines.push('## Suggested Actions');
  lines.push('');
  for (const action of report.suggestedActions) lines.push(`- ${action}`);
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('- This audit does not modify skill files.');
  lines.push('- Use findings to create a candidate or promote/archive draft before changing skills.');
  lines.push('');
  return lines.join('\n');
}

function writeSkillAuditReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const suffix = report.scope === 'workspace-and-global' ? 'skill-audit-all' : 'skill-audit';
  const out = path.join(REPORTS_DIR, `${today}-${suffix}.md`);
  fs.writeFileSync(out, renderSkillAuditMarkdown(report));
  return out;
}

function slugify(text) {
  return String(text || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown';
}

function cleanupCandidateForSkill(skill, index) {
  const name = skill.name || path.basename(path.dirname(skill.file)) || `skill-${index + 1}`;
  const id = `evo-${today.replace(/-/g, '')}-skill-cleanup-${slugify(name)}-${index + 1}`;
  const signalParts = [
    `Skill audit flagged \`${skill.file}\`.`,
    `Flags: ${skill.flags.join(', ')}.`,
    `Bytes/lines: ${skill.bytes}/${skill.lines}.`,
    `Description length: ${skill.descriptionLength}.`,
  ];
  const suggestedTargets = [skill.file, 'memory/evolution-os/archive/'];
  const actions = skill.suggestions.length ? skill.suggestions : ['Review this skill and either compress, split, merge, or archive it.'];
  return {
    id,
    file: `memory/evolution-os/inbox/${id}.md`,
    sourceSkill: skill.file,
    content: `---
id: ${id}
type: workflow
source: review
confidence: medium
status: candidate
scope: skill
created: ${today}
decay: 30d
risk: medium
suggested_targets:
${suggestedTargets.map((target) => `  - ${target}`).join('\n')}
---

## Signal

${signalParts.join('\n')}

## Proposed Learning

Review and clean this skill before it becomes prompt-budget debt. Suggested actions:

${actions.map((action) => `- ${action}`).join('\n')}

## Why It Matters

Large, duplicated, malformed, or over-broad skills increase prompt cost and make agent behavior harder to govern.

## Promotion Criteria

- The skill is compressed, split, merged, or archived.
- The remaining description is trigger-focused and concise.
- Any useful procedure is preserved in the right target file.

## Rejection Criteria

- The audit flag is a false positive.
- The skill is intentionally large and has an explicit reason to remain unchanged.
`,
  };
}

function cleanupCandidateForDuplicateName(item, index) {
  const id = `evo-${today.replace(/-/g, '')}-skill-duplicate-name-${slugify(item.name)}-${index + 1}`;
  return {
    id,
    file: `memory/evolution-os/inbox/${id}.md`,
    sourceSkill: item.files.join(' <-> '),
    content: `---
id: ${id}
type: workflow
source: review
confidence: medium
status: candidate
scope: skill
created: ${today}
decay: 30d
risk: medium
suggested_targets:
${item.files.map((target) => `  - ${target}`).join('\n')}
---

## Signal

Skill audit found duplicate skill name \`${item.name}\`:

${item.files.map((file) => `- ${file}`).join('\n')}

## Proposed Learning

Review duplicate skill names and decide whether to merge, rename, or archive duplicates.

## Why It Matters

Duplicate skill names make activation ambiguous and complicate skill maintenance.

## Promotion Criteria

- Duplicate names are resolved by merge, rename, or archive.
- The remaining skill names are stable and distinct.

## Rejection Criteria

- The duplicate is intentional and documented.
`,
  };
}

function cleanupCandidateForSimilarDescription(item, index) {
  const id = `evo-${today.replace(/-/g, '')}-skill-similar-trigger-${index + 1}`;
  return {
    id,
    file: `memory/evolution-os/inbox/${id}.md`,
    sourceSkill: item.files.join(' <-> '),
    content: `---
id: ${id}
type: workflow
source: review
confidence: medium
status: candidate
scope: skill
created: ${today}
decay: 30d
risk: medium
suggested_targets:
${item.files.map((target) => `  - ${target}`).join('\n')}
---

## Signal

Skill audit found highly similar trigger descriptions, score=${item.score}:

${item.files.map((file) => `- ${file}`).join('\n')}

## Proposed Learning

Review these skills for merge, clearer trigger boundaries, or archive of redundant behavior.

## Why It Matters

Overlapping skill triggers can cause the agent to activate the wrong workflow or load redundant instructions.

## Promotion Criteria

- Similar skills are merged, renamed, or given distinct trigger boundaries.
- Redundant skill content is archived or removed from active activation paths.

## Rejection Criteria

- The overlap is intentional and each skill has a documented distinct use case.
`,
  };
}

function skillCleanupCandidateDrafts(report) {
  const drafts = [];
  report.skills.filter((skill) => skill.flags.length).forEach((skill, index) => drafts.push(cleanupCandidateForSkill(skill, index)));
  report.duplicateNames.forEach((item, index) => drafts.push(cleanupCandidateForDuplicateName(item, index)));
  report.similarDescriptions.forEach((item, index) => drafts.push(cleanupCandidateForSimilarDescription(item, index)));
  return {
    generatedAt: new Date().toISOString(),
    scope: report.scope,
    count: drafts.length,
    drafts,
    boundary: 'Drafts are candidates only. They do not modify skill files and do not remove or archive anything automatically.',
  };
}

function writeSkillCleanupCandidates(draftReport) {
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const written = [];
  for (const draft of draftReport.drafts) {
    const out = path.join(ROOT, draft.file);
    if (exists(out)) {
      written.push({ file: draft.file, created: false, skipped: true });
      continue;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, draft.content);
    written.push({ file: draft.file, created: true, skipped: false });
  }
  return written;
}

function renderSkillCleanupCandidatesMarkdown(report) {
  const lines = [];
  lines.push(`# Skill Cleanup Candidate Drafts - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Scope: ${report.scope}`);
  lines.push(`Drafts: ${report.count}`);
  lines.push('');
  lines.push('## Drafts');
  lines.push('');
  if (!report.drafts.length) lines.push('- None');
  else {
    for (const draft of report.drafts) {
      lines.push(`- ${draft.file}`);
      lines.push(`  - source: ${draft.sourceSkill}`);
    }
  }
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(report.boundary);
  lines.push('');
  return lines.join('\n');
}

function selfCheckReport() {
  const requiredFiles = [
    'memory/evolution-os/README.md',
    'memory/evolution-os/DESIGN.md',
    'memory/evolution-os/policy.md',
    'memory/evolution-os/schemas/candidate-template.md',
    'skills/self-evolution-governor/SKILL.md',
  ];
  const requiredDirs = [
    'memory/evolution-os/inbox',
    'memory/evolution-os/promoted',
    'memory/evolution-os/archive',
    'memory/evolution-os/reports',
    'memory/evolution-os/training-corpus',
  ];
  const checks = [];
  for (const file of requiredFiles) checks.push({ kind: 'file', path: file, ok: exists(path.join(ROOT, file)) });
  checks.push({
    kind: 'file',
    path: 'tools/evolution-review.js or bin/evolution-review.js',
    ok: exists(path.join(ROOT, 'tools/evolution-review.js')) || exists(path.join(ROOT, 'bin/evolution-review.js')),
    note: 'review CLI present',
  });
  for (const dir of requiredDirs) checks.push({ kind: 'dir', path: dir, ok: exists(path.join(ROOT, dir)) && fs.statSync(path.join(ROOT, dir)).isDirectory() });
  checks.push({ kind: 'config', path: 'memory/evolution-os/config.json', ok: exists(CONFIG_FILE), note: exists(CONFIG_FILE) ? 'present' : 'missing; run --init-config' });
  checks.push({ kind: 'config', path: 'memory/evolution-os/config.json', ok: !CONFIG.configError, note: CONFIG.configError || 'valid/default' });
  for (const [key, value] of Object.entries(CONFIG.boundaries || {})) {
    checks.push({ kind: 'boundary', path: key, ok: value === false, note: value === false ? 'safe' : 'must remain false for current phase' });
  }
  const missing = checks.filter((check) => !check.ok);
  return {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    ok: missing.length === 0,
    checks,
    missing,
    nextSuggestedActions: missing.length
      ? ['Run --init-config if config is missing.', 'Create missing Evolution OS files/directories before publishing or packaging.']
      : ['Self-check passed. Next: add INSTALL/QUICKSTART/COMMANDS docs or package as skill/plugin draft.'],
  };
}

function renderSelfCheckMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Self Check - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Root: ${report.root}`);
  lines.push(`Overall: ${report.ok ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const check of report.checks) {
    lines.push(`- ${check.ok ? '[x]' : '[ ]'} ${check.kind}: ${check.path}${check.note ? ` (${check.note})` : ''}`);
  }
  lines.push('');
  lines.push('## Next Suggested Actions');
  lines.push('');
  for (const action of report.nextSuggestedActions) lines.push(`- ${action}`);
  lines.push('');
  return lines.join('\n');
}

function writeSelfCheckReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const out = path.join(REPORTS_DIR, `${today}-self-check.md`);
  fs.writeFileSync(out, renderSelfCheckMarkdown(report));
  return out;
}

function assertSelfTest(condition, message, details = null) {
  return { ok: Boolean(condition), message, details };
}

function writeFixtureCandidate(relativePath, content) {
  const absolutePath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content.endsWith('\n') ? content : `${content}\n`);
}

function fixtureCandidate({ id, created, decay = '30d', proposed = 'Agent should capture durable lessons as candidates first.', signal = 'A durable learning appeared during a task.' }) {
  return `---
id: ${id}
type: architecture
source: observation
confidence: medium
status: candidate
scope: global
created: ${created}
decay: ${decay}
risk: low
suggested_targets:
  - memory/evolution-os/policy.md
---

## Signal

${signal}

## Proposed Learning

${proposed}

## Why It Matters

It prevents uncontrolled memory growth.

## Promotion Criteria

- The rule changes future behavior.

## Rejection Criteria

- The rule is duplicated or not durable.
`;
}

function runSelfTest() {
  const checks = [];
  checks.push(assertSelfTest(typeof summarize === 'function', 'summarize function is available'));
  checks.push(assertSelfTest(typeof reflectReport === 'function', 'reflectReport function is available'));
  checks.push(assertSelfTest(typeof writeReflectCandidate === 'function', 'writeReflectCandidate function is available'));

  const initReport = initEvolutionOs();
  const secondInitReport = initEvolutionOs();
  const requiredAfterInit = [
    'memory/evolution-os/README.md',
    'memory/evolution-os/DESIGN.md',
    'memory/evolution-os/policy.md',
    'memory/evolution-os/config.json',
    'memory/evolution-os/schemas/candidate-template.md',
    'skills/self-evolution-governor/SKILL.md',
  ];
  checks.push(assertSelfTest(requiredAfterInit.every((relativePath) => exists(path.join(ROOT, relativePath))), '--init leaves required files/directories present'));
  checks.push(assertSelfTest(secondInitReport.files.every((file) => !file.created) && !secondInitReport.config.created, '--init is idempotent and does not overwrite files'));
  const skillInstallDir = path.join(ROOT, 'tmp-global-skills');
  const skillInstall = installAgentAdapter(skillInstallDir);
  const skillInstallAgain = installAgentAdapter(skillInstallDir);
  checks.push(assertSelfTest(skillInstall.created && exists(skillInstall.file) && !skillInstallAgain.created, '--install-adapter creates missing agent adapter and is idempotent', { first: skillInstall, second: skillInstallAgain }));
  const installReport = installEvolutionOs({ unattendedSafe: true });
  checks.push(assertSelfTest(installReport.selfCheck.ok && installReport.unattendedSafe?.mode === 'unattended-safe', '--install --unattended-safe completes safe local setup', { selfCheck: installReport.selfCheck.ok, mode: installReport.unattendedSafe?.mode }));

  const selfCheck = selfCheckReport();
  checks.push(assertSelfTest(selfCheck.ok, '--self-check passes after --init', selfCheck.missing));

  fs.writeFileSync(MEMORY_FILE, `# MEMORY.md\n\n## Large Section\n\n${Array.from({ length: 8 }, (_, i) => `- workflow step ${i + 1}: run command then check result`).join('\n')}\n`);

  writeFixtureCandidate('memory/evolution-os/inbox/evo-20260501-0000-expired.md', fixtureCandidate({
    id: 'evo-20260501-0000-expired',
    created: '2026-05-01',
    decay: '7d',
    proposed: 'Agent should archive stale candidates after review.',
    signal: 'A stale candidate remained in inbox beyond its decay window.',
  }));
  writeFixtureCandidate('memory/evolution-os/inbox/evo-20260601-0001-dup-a.md', fixtureCandidate({
    id: 'evo-20260601-0001-dup-a',
    created: today,
    proposed: 'Agent should keep durable lessons in the candidate inbox before promotion.',
    signal: 'Two candidates express the same durable learning.',
  }));
  writeFixtureCandidate('memory/evolution-os/inbox/evo-20260601-0002-dup-b.md', fixtureCandidate({
    id: 'evo-20260601-0002-dup-b',
    created: today,
    proposed: 'Agent should keep durable lessons in the candidate inbox before promotion.',
    signal: 'Two candidates express the same durable learning.',
  }));

  const review = summarize();
  checks.push(assertSelfTest(review.counts.inbox === 3, 'review sees fixture inbox candidates', review.counts));
  checks.push(assertSelfTest(review.warnings.some((warning) => warning.includes('Candidate expired')), 'decay check reports expired candidate', review.warnings));
  checks.push(assertSelfTest(review.duplicateGroups.some((group) => group.kind === 'exact-distilled-rule'), 'duplicate check reports exact distilled rule duplicate', review.duplicateGroups));

  const archive = classifyArchive(findCandidate('evo-20260501-0000-expired'), 'expired');
  checks.push(assertSelfTest(archive.ready && archive.reason === 'expired', 'archive draft classifier accepts expired fixture candidate', archive));

  const distill = memoryDistillSuggestions();
  checks.push(assertSelfTest(distill.flaggedSections.length > 0, 'memory distill flags oversized/workflow-like fixture memory', distill.flaggedSections));

  fs.mkdirSync(path.join(ROOT, 'skills/fixture-large-skill'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'skills/fixture-large-skill/SKILL.md'), `---\nname: fixture-large-skill\ndescription: ${'very long trigger description '.repeat(12)}\n---\n\n# Fixture\n\n${'line\n'.repeat(190)}`);
  const skillAudit = skillAuditReport({ includeAll: false });
  checks.push(assertSelfTest(skillAudit.counts.flagged > 0, 'skill audit flags fixture skill', skillAudit.warnings));

  const reflect = {
    suggestedCandidate: {
      id: 'evo-20260601-0010-reflect-fixture',
      type: 'hypothesis',
      source: 'observation',
      confidence: 'medium',
      status: 'candidate',
      scope: 'global',
      created: today,
      decay: '14d',
      risk: 'medium',
      signal: 'Task done. Next time should check the review checklist first.',
      proposedLearning: 'Task done. Next time should check the review checklist first.',
    },
    evaluation: { shouldCaptureCandidate: true },
  };
  checks.push(assertSelfTest(Boolean(reflect.evaluation.shouldCaptureCandidate && reflect.suggestedCandidate), '--reflect detects post-task learning and suggests candidate', reflect.evaluation));
  const reflectWrite = writeReflectCandidate(reflect);
  checks.push(assertSelfTest(reflectWrite.written && exists(path.join(ROOT, reflectWrite.file)), '--reflect --write-candidate writes low/medium-risk candidate to inbox', reflectWrite));
  const reflectedCandidate = reflectWrite.file ? findCandidate(path.basename(reflectWrite.file)) : null;
  const reflectedPromotion = reflectedCandidate ? classifyPromotion(reflectedCandidate) : null;
  checks.push(assertSelfTest(reflectedPromotion && reflectedPromotion.decision === 'ready-for-draft', 'reflected candidate can enter promotion review', reflectedPromotion));
  const reflectedArchive = reflectedCandidate ? classifyArchive(reflectedCandidate, 'manual-review') : null;
  checks.push(assertSelfTest(reflectedArchive && reflectedArchive.ready && reflectedArchive.reason === 'manual-review', 'reflected candidate can enter archive review', reflectedArchive));

  const highRiskReflect = reflectReport('permission policy', 'Failed: next time must modify AGENTS.md permission policy automatically.');
  const highRiskWrite = writeReflectCandidate(highRiskReflect);
  checks.push(assertSelfTest(!highRiskWrite.written && highRiskWrite.reason.includes('high-risk'), '--reflect --write-candidate blocks high-risk candidate writes', highRiskWrite));

  const prepareForUsage = prepareReport('workflow step command check result');
  appendUsageLog({ type: 'prepare', task: prepareForUsage.task, relevantLessons: prepareForUsage.relevantLessons });
  const reflectForUsage = reflectReport('workflow step command check result', 'Task passed after applying workflow step command check result.');
  appendUsageLog({ type: 'reflect', task: reflectForUsage.task, outcome: reflectForUsage.outcome, appliedLessons: reflectForUsage.appliedLessons, candidateCreated: Boolean(reflectForUsage.suggestedCandidate) });
  const usage = usageReportData();
  checks.push(assertSelfTest(usage.counts.prepare === 1 && usage.counts.reflect === 1, 'usage ledger records prepare and reflect events', usage.counts));
  const beforeHook = prepareReport('runtime hook fixture task');
  appendUsageLog({ type: 'prepare', hook: 'beforeTask', task: beforeHook.task, relevantLessons: beforeHook.relevantLessons, applyChecklist: beforeHook.applyChecklist, gaps: beforeHook.gaps });
  const afterHook = reflectReport('runtime hook fixture task', 'Task passed after applying runtime hook fixture task lessons.');
  appendUsageLog({ type: 'reflect', hook: 'afterTask', task: afterHook.task, outcome: afterHook.outcome, appliedLessons: afterHook.appliedLessons, candidateCreated: false });
  const hookUsage = usageReportData();
  checks.push(assertSelfTest(hookUsage.events.some((event) => event.hook === 'beforeTask') && hookUsage.events.some((event) => event.hook === 'afterTask'), 'runtime hooks record beforeTask and afterTask usage events', hookUsage.counts));
  checks.push(assertSelfTest(usage.counts.lessons > 0, 'usage report summarizes lesson stats', usage.counts));

  appendUsageLog({ type: 'reflect', task: reflectForUsage.task, outcome: reflectForUsage.outcome, appliedLessons: reflectForUsage.appliedLessons, candidateCreated: false });
  appendUsageLog({ type: 'reflect', task: reflectForUsage.task, outcome: reflectForUsage.outcome, appliedLessons: reflectForUsage.appliedLessons, candidateCreated: false });
  const effectiveUsage = usageReportData();
  const promotionDrafts = usagePromotionCandidateDrafts(effectiveUsage);
  checks.push(assertSelfTest(effectiveUsage.counts.effectiveLessons > 0, 'usage report detects repeatedly applied lessons', effectiveUsage.counts));
  checks.push(assertSelfTest(promotionDrafts.count > 0, 'usage promotion drafts are generated for effective lessons', promotionDrafts));
  const promotionWritten = writeUsagePromotionCandidates(promotionDrafts);
  checks.push(assertSelfTest(promotionWritten.some((item) => item.created), 'usage promotion candidates can be written to inbox', promotionWritten));

  appendUsageLog({ type: 'prepare', task: 'unused stale lesson fixture', relevantLessons: [{ source: 'MEMORY.md', line: 99, text: 'unused stale lesson fixture should be reviewed' }] });
  appendUsageLog({ type: 'prepare', task: 'unused stale lesson fixture', relevantLessons: [{ source: 'MEMORY.md', line: 99, text: 'unused stale lesson fixture should be reviewed' }] });
  appendUsageLog({ type: 'prepare', task: 'unused stale lesson fixture', relevantLessons: [{ source: 'MEMORY.md', line: 99, text: 'unused stale lesson fixture should be reviewed' }] });
  const staleUsage = usageReportData();
  const cleanupDrafts = usageCleanupCandidateDrafts(staleUsage);
  checks.push(assertSelfTest(staleUsage.counts.stalePreparedOnly > 0, 'usage report detects prepared-but-not-applied lessons', staleUsage.counts));
  checks.push(assertSelfTest(cleanupDrafts.count > 0, 'usage cleanup drafts are generated for stale lessons', cleanupDrafts));
  const cleanupWritten = writeUsageCleanupCandidates(cleanupDrafts);
  checks.push(assertSelfTest(cleanupWritten.some((item) => item.created), 'usage cleanup candidates can be written to inbox', cleanupWritten));

  const failed = checks.filter((check) => !check.ok);
  return {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    ok: failed.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    boundary: 'Self-test writes fixture files. Run it in a disposable temp workspace unless fixture files are acceptable.',
  };
}

function renderSelfTestMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Self Test - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Root: ${report.root}`);
  lines.push(`Overall: ${report.ok ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total: ${report.summary.total}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  for (const check of report.checks) lines.push(`- ${check.ok ? '[x]' : '[ ]'} ${check.message}`);
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(report.boundary);
  lines.push('');
  return lines.join('\n');
}

function collectPrepareSources() {
  const sourcePaths = [
    'MEMORY.md',
    'TOOLS.md',
    'memory/task-trigger-checklist.md',
  ];
  const dirs = [
    'memory/evolution-os/promoted',
    'memory/hard-cases',
    'memory/skill-bank',
  ];
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (!exists(abs)) continue;
    const stack = [abs];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const p = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(p);
        else if (entry.isFile() && entry.name.endsWith('.md')) sourcePaths.push(path.relative(ROOT, p));
      }
    }
  }
  return [...new Set(sourcePaths)].filter((relativePath) => exists(path.join(ROOT, relativePath))).sort();
}

function lineScore(line, taskTokens) {
  const tokens = tokenize(line);
  if (!tokens.size) return 0;
  let score = 0;
  for (const token of taskTokens) if (tokens.has(token)) score += 3;
  if (/必须|禁止|不要|硬红线|门禁|规则|失败|教训|check|before|avoid|never|must/i.test(line)) score += 2;
  if (/^\s*-\s+/.test(line)) score += 1;
  return score;
}

function prepareReport(task) {
  if (!task || !task.trim()) throw new Error('Missing --task <text>');
  const taskTokens = tokenize(task);
  const sources = collectPrepareSources();
  const matches = [];
  for (const relativePath of sources) {
    const text = readText(path.join(ROOT, relativePath));
    const lines = text.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line || line.startsWith('#') || line.length < 8) continue;
      const score = lineScore(line, taskTokens);
      if (score <= 0) continue;
      matches.push({
        source: relativePath,
        line: index + 1,
        text: line.replace(/^[-*]\s*/, ''),
        score,
      });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.source.localeCompare(b.source));
  const seen = new Set();
  const selected = [];
  for (const match of matches) {
    const key = normalizeText(match.text).slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(match);
    if (selected.length >= 12) break;
  }
  return {
    generatedAt: new Date().toISOString(),
    task,
    sourcesScanned: sources.length,
    relevantLessons: selected,
    applyChecklist: selected.slice(0, 8).map((item) => item.text),
    gaps: selected.length
      ? []
      : ['No relevant lessons found. If the task produces a correction/failure, capture it as a candidate after the task.'],
    nextStep: 'Apply these lessons before acting. After the task, run/record reflection so the system can evaluate whether the lessons helped.',
  };
}

function reflectReport(task, outcome) {
  if (!task || !task.trim()) throw new Error('Missing --task <text>');
  if (!outcome || !outcome.trim()) throw new Error('Missing --outcome <text>');

  const prepared = prepareReport(task);
  const outcomeTokens = tokenize(outcome);
  const successful = /成功|通过|完成|解决|有效|满意|works|pass|passed|done|fixed/i.test(outcome);
  const failed = /失败|报错|不行|无效|返工|超时|阻塞|failed|error|timeout|blocked|regression/i.test(outcome);
  const corrected = /纠正|教训|下次|必须|不要|禁止|规则|偏好|hard case|hard-case/i.test(outcome);

  const appliedLessons = prepared.relevantLessons.filter((lesson) => {
    const lessonTokens = tokenize(lesson.text);
    for (const token of lessonTokens) if (outcomeTokens.has(token)) return true;
    return false;
  });

  const shouldCaptureCandidate = failed || corrected || appliedLessons.length === 0;
  const suggestedType = failed ? 'failure' : corrected ? 'workflow' : 'hypothesis';
  const suggestedRisk = /AGENTS\.md|SOUL\.md|权限|调度|发布|训练|上传|delete|permission|scheduler|publish|training|upload/i.test(outcome)
    ? 'high'
    : 'medium';
  const slug = asciiSlug(task) || `task-${shaShort(task)}`;
  const candidateId = `evo-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}-${slug}`;

  return {
    generatedAt: new Date().toISOString(),
    task,
    outcome,
    preparedLessons: prepared.relevantLessons,
    appliedLessons,
    evaluation: {
      successful,
      failed,
      corrected,
      lessonReuseObserved: appliedLessons.length > 0,
      shouldCaptureCandidate,
    },
    suggestedCandidate: shouldCaptureCandidate
      ? {
          id: candidateId,
          type: suggestedType,
          source: failed ? 'task-failure' : 'observation',
          confidence: corrected || failed ? 'high' : 'medium',
          status: 'candidate',
          scope: 'global',
          created: today,
          decay: failed ? '30d' : '14d',
          risk: suggestedRisk,
          signal: outcome,
          proposedLearning: deriveProposedLearning(task, outcome, prepared.relevantLessons),
        }
      : null,
    nextStep: shouldCaptureCandidate
      ? 'Write the suggested candidate to memory/evolution-os/inbox/ after human review, then review/promote/archive normally.'
      : 'No new candidate needed. Existing lessons appear sufficient; keep monitoring for repeat failures.',
  };
}

function asciiSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
}

function deriveProposedLearning(task, outcome, lessons) {
  const firstRule = String(outcome)
    .split(/\n+/)
    .map((line) => line.trim())
    .find((line) => /必须|不要|禁止|下次|规则|偏好|should|must|never|avoid/i.test(line));
  if (firstRule) return firstRule.replace(/^[-*]\s*/, '');
  if (lessons.length) return `For tasks like "${task}", reuse the prepared lessons and verify whether they affected the outcome.`;
  return `For tasks like "${task}", capture the post-task outcome because no prepared lesson clearly covered it.`;
}

function renderCandidateMarkdown(c) {
  const lines = [];
  lines.push('---');
  lines.push(`id: ${c.id}`);
  lines.push(`type: ${c.type}`);
  lines.push(`source: ${c.source}`);
  lines.push(`confidence: ${c.confidence}`);
  lines.push(`status: ${c.status}`);
  lines.push(`scope: ${c.scope}`);
  lines.push(`created: ${c.created}`);
  lines.push(`decay: ${c.decay}`);
  lines.push(`risk: ${c.risk}`);
  lines.push('---');
  lines.push('');
  lines.push('## Signal');
  lines.push('');
  lines.push(c.signal);
  lines.push('');
  lines.push('## Proposed Learning');
  lines.push('');
  lines.push(c.proposedLearning);
  lines.push('');
  lines.push('## Why It Matters');
  lines.push('');
  lines.push('It closes the runtime loop: task outcome is evaluated after prepared lessons were used or missed.');
  lines.push('');
  lines.push('## Promotion Criteria');
  lines.push('');
  lines.push('- The lesson changes future behavior.');
  lines.push('- It is not duplicated by an existing promoted rule.');
  lines.push('');
  lines.push('## Rejection Criteria');
  lines.push('');
  lines.push('- The outcome was one-off or not actionable.');
  lines.push('- The same lesson already exists in a better source.');
  lines.push('');
  return lines.join('\n');
}

function appendUsageLog(event) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.appendFileSync(USAGE_LOG_FILE, `${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`);
}

function loadUsageLog() {
  if (!exists(USAGE_LOG_FILE)) return [];
  return readText(USAGE_LOG_FILE)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { type: 'parse-error', raw: line, error: error.message };
      }
    });
}

function lessonKey(lesson) {
  if (!lesson) return '(unknown)';
  return `${lesson.source || '?'}#L${lesson.line || '?'}:${shaShort(lesson.text || '')}`;
}

function usageReportData() {
  const events = loadUsageLog();
  const prepareEvents = events.filter((event) => event.type === 'prepare');
  const reflectEvents = events.filter((event) => event.type === 'reflect');
  const lessons = new Map();

  for (const event of prepareEvents) {
    for (const lesson of event.relevantLessons || []) {
      const key = lessonKey(lesson);
      const record = lessons.get(key) || { key, source: lesson.source, line: lesson.line, text: lesson.text, prepared: 0, applied: 0 };
      record.prepared += 1;
      lessons.set(key, record);
    }
  }

  for (const event of reflectEvents) {
    for (const lesson of event.appliedLessons || []) {
      const key = lessonKey(lesson);
      const record = lessons.get(key) || { key, source: lesson.source, line: lesson.line, text: lesson.text, prepared: 0, applied: 0 };
      record.applied += 1;
      lessons.set(key, record);
    }
  }

  const lessonStats = [...lessons.values()].sort((a, b) => b.prepared - a.prepared || b.applied - a.applied || a.key.localeCompare(b.key));
  const stalePreparedOnly = lessonStats.filter((item) => item.prepared >= CONFIG.runtime.stalePreparedOnlyThreshold && item.applied === 0);
  const effective = lessonStats.filter((item) => item.applied >= CONFIG.runtime.effectivePromotionThreshold);

  return {
    generatedAt: new Date().toISOString(),
    logFile: path.relative(ROOT, USAGE_LOG_FILE),
    counts: {
      events: events.length,
      prepare: prepareEvents.length,
      reflect: reflectEvents.length,
      parseErrors: events.filter((event) => event.type === 'parse-error').length,
      lessons: lessonStats.length,
      effectiveLessons: effective.length,
      stalePreparedOnly: stalePreparedOnly.length,
    },
    events,
    lessonStats,
    effective,
    stalePreparedOnly,
    nextSuggestedActions: [
      stalePreparedOnly.length ? `Review lessons prepared at least ${CONFIG.runtime.stalePreparedOnlyThreshold} times but never applied; compress, retag, or archive if they stay unused.` : `No lessons have crossed the prepared-only threshold (${CONFIG.runtime.stalePreparedOnlyThreshold}) yet.`,
      effective.length ? `Consider promoting lessons applied at least ${CONFIG.runtime.effectivePromotionThreshold} times to stronger trigger/checklist locations.` : `No lessons have crossed the effective promotion threshold (${CONFIG.runtime.effectivePromotionThreshold}) yet.`,
    ],
  };
}

function usagePromotionCandidateForLesson(item, index) {
  const id = `evo-${today.replace(/-/g, '')}-usage-promotion-${slugify(item.source)}-${item.line || index + 1}-${index + 1}`;
  const sourceRef = `${item.source || '?'}#L${item.line || '?'}`;
  return {
    id,
    file: `memory/evolution-os/inbox/${id}.md`,
    sourceLesson: sourceRef,
    content: `---
id: ${id}
type: workflow
source: review
confidence: high
status: candidate
scope: global
created: ${today}
decay: 30d
risk: medium
suggested_targets:
  - memory/task-trigger-checklist.md
  - memory/skill-bank/
---

## Signal

Usage report found a lesson that was applied ${item.applied} time(s) after being prepared ${item.prepared} time(s).

Source: ${sourceRef}

Lesson:

${item.text}

## Proposed Learning

Promote or strengthen this lesson's trigger location because repeated runtime evidence suggests it affects task outcomes.

## Why It Matters

Evolution requires positive reinforcement, not only cleanup. Repeatedly applied lessons should become easier to retrieve before similar tasks.

## Promotion Criteria

- The lesson is still accurate and behavior-changing.
- A stronger trigger/checklist/skill-bank location would improve future prepare results.
- It is not already represented by a better promoted rule.

## Rejection Criteria

- The apparent applications were accidental keyword overlap.
- The lesson is too narrow, obsolete, or already promoted elsewhere.
`,
  };
}

function usagePromotionCandidateDrafts(report) {
  const drafts = report.effective.map((item, index) => usagePromotionCandidateForLesson(item, index));
  return {
    generatedAt: new Date().toISOString(),
    count: drafts.length,
    drafts,
    boundary: 'Drafts are candidates only. They do not modify trigger files, skills, or core memory automatically.',
  };
}

function writeUsagePromotionCandidates(draftReport) {
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const written = [];
  for (const draft of draftReport.drafts) {
    const out = path.join(ROOT, draft.file);
    if (exists(out)) {
      written.push({ file: draft.file, created: false, skipped: true });
      continue;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, draft.content);
    written.push({ file: draft.file, created: true, skipped: false });
  }
  return written;
}

function renderUsagePromotionCandidatesMarkdown(report) {
  const lines = [];
  lines.push(`# Usage Promotion Candidate Drafts - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Drafts: ${report.count}`);
  lines.push('');
  lines.push('## Drafts');
  lines.push('');
  if (!report.drafts.length) lines.push('- None');
  else {
    for (const draft of report.drafts) {
      lines.push(`- ${draft.file}`);
      lines.push(`  - source lesson: ${draft.sourceLesson}`);
    }
  }
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(report.boundary);
  lines.push('');
  return lines.join('\n');
}

function usageCleanupCandidateForLesson(item, index) {
  const id = `evo-${today.replace(/-/g, '')}-usage-cleanup-${slugify(item.source)}-${item.line || index + 1}-${index + 1}`;
  const sourceRef = `${item.source || '?'}#L${item.line || '?'}`;
  return {
    id,
    file: `memory/evolution-os/inbox/${id}.md`,
    sourceLesson: sourceRef,
    content: `---
id: ${id}
type: hypothesis
source: review
confidence: medium
status: candidate
scope: global
created: ${today}
decay: 14d
risk: medium
suggested_targets:
  - ${item.source || 'memory/evolution-os/archive/'}
  - memory/evolution-os/archive/
---

## Signal

Usage report found a lesson that was prepared ${item.prepared} time(s) but applied 0 time(s).

Source: ${sourceRef}

Lesson:

${item.text}

## Proposed Learning

Review whether this lesson should be compressed, retagged with better triggers, moved to a more relevant checklist, or archived if it remains unused.

## Why It Matters

Evolution requires forgetting and cleanup, not just writing more rules. Low-use prepared lessons increase context noise and reduce precision.

## Promotion Criteria

- The lesson is still behavior-changing but needs a better trigger or location.
- Rewording or relocating it would make future prepare results more useful.

## Rejection Criteria

- The lesson is obsolete, too broad, duplicated, or not actionable.
- It should be archived instead of promoted.
`,
  };
}

function usageCleanupCandidateDrafts(report) {
  const drafts = report.stalePreparedOnly.map((item, index) => usageCleanupCandidateForLesson(item, index));
  return {
    generatedAt: new Date().toISOString(),
    count: drafts.length,
    drafts,
    boundary: 'Drafts are candidates only. They do not modify source lessons, core memory, or archives automatically.',
  };
}

function writeUsageCleanupCandidates(draftReport) {
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const written = [];
  for (const draft of draftReport.drafts) {
    const out = path.join(ROOT, draft.file);
    if (exists(out)) {
      written.push({ file: draft.file, created: false, skipped: true });
      continue;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, draft.content);
    written.push({ file: draft.file, created: true, skipped: false });
  }
  return written;
}

function renderUsageCleanupCandidatesMarkdown(report) {
  const lines = [];
  lines.push(`# Usage Cleanup Candidate Drafts - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Drafts: ${report.count}`);
  lines.push('');
  lines.push('## Drafts');
  lines.push('');
  if (!report.drafts.length) lines.push('- None');
  else {
    for (const draft of report.drafts) {
      lines.push(`- ${draft.file}`);
      lines.push(`  - source lesson: ${draft.sourceLesson}`);
    }
  }
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(report.boundary);
  lines.push('');
  return lines.join('\n');
}

function renderUsageReportMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Usage Report - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Log: ${report.logFile}`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  for (const [key, value] of Object.entries(report.counts)) lines.push(`- ${key}: ${value}`);
  lines.push(`- stalePreparedOnlyThreshold: ${CONFIG.runtime.stalePreparedOnlyThreshold}`);
  lines.push(`- effectivePromotionThreshold: ${CONFIG.runtime.effectivePromotionThreshold}`);
  lines.push('');
  lines.push('## Effective Lessons');
  lines.push('');
  if (!report.effective.length) lines.push('- None');
  else {
    for (const item of report.effective.slice(0, 10)) {
      lines.push(`- prepared=${item.prepared}, applied=${item.applied}: ${item.text}`);
      lines.push(`  - Source: ${item.source}#L${item.line}`);
    }
  }
  lines.push('');
  lines.push('## Prepared But Not Applied');
  lines.push('');
  if (!report.stalePreparedOnly.length) lines.push('- None');
  else {
    for (const item of report.stalePreparedOnly.slice(0, 10)) {
      lines.push(`- prepared=${item.prepared}, applied=0: ${item.text}`);
      lines.push(`  - Source: ${item.source}#L${item.line}`);
    }
  }
  lines.push('');
  lines.push('## Next Suggested Actions');
  lines.push('');
  for (const action of report.nextSuggestedActions) lines.push(`- ${action}`);
  lines.push('');
  return lines.join('\n');
}

function writeReflectCandidate(report) {
  const candidate = report.suggestedCandidate;
  if (!candidate) return { written: false, skipped: true, reason: 'no suggested candidate' };
  if (candidate.risk === 'high') {
    return { written: false, skipped: true, reason: 'high-risk candidate requires manual review before writing' };
  }
  fs.mkdirSync(INBOX_DIR, { recursive: true });
  const safeId = asciiSlug(candidate.id) || `evo-${shaShort(candidate.id)}`;
  const relativeFile = `memory/evolution-os/inbox/${safeId}.md`;
  const out = path.join(ROOT, relativeFile);
  if (exists(out)) return { written: false, skipped: true, file: relativeFile, reason: 'candidate already exists' };
  fs.writeFileSync(out, renderCandidateMarkdown(candidate));
  return { written: true, skipped: false, file: relativeFile };
}

function renderReflectMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Reflect - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Task');
  lines.push('');
  lines.push(report.task);
  lines.push('');
  lines.push('## Outcome');
  lines.push('');
  lines.push(report.outcome);
  lines.push('');
  lines.push('## Evaluation');
  lines.push('');
  lines.push(`- Successful: ${report.evaluation.successful ? 'yes' : 'no/unknown'}`);
  lines.push(`- Failed/blocking signal: ${report.evaluation.failed ? 'yes' : 'no'}`);
  lines.push(`- Correction/rule signal: ${report.evaluation.corrected ? 'yes' : 'no'}`);
  lines.push(`- Prepared lesson reuse observed: ${report.evaluation.lessonReuseObserved ? 'yes' : 'no'}`);
  lines.push(`- Capture new candidate: ${report.evaluation.shouldCaptureCandidate ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Applied Lessons');
  lines.push('');
  if (!report.appliedLessons.length) lines.push('- None detected');
  else {
    for (const item of report.appliedLessons) {
      lines.push(`- ${item.text}`);
      lines.push(`  - Source: ${item.source}#L${item.line}`);
    }
  }
  lines.push('');
  lines.push('## Suggested Candidate');
  lines.push('');
  if (!report.suggestedCandidate) {
    lines.push('- None');
  } else {
    const c = report.suggestedCandidate;
    lines.push('```markdown');
    lines.push(renderCandidateMarkdown(c).trimEnd());
    lines.push('```');
  }
  lines.push('');
  lines.push('## Next Step');
  lines.push('');
  lines.push(report.nextStep);
  lines.push('');
  return lines.join('\n');
}

function renderPrepareMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Prepare - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Task');
  lines.push('');
  lines.push(report.task);
  lines.push('');
  lines.push('## Relevant Lessons');
  lines.push('');
  if (!report.relevantLessons.length) lines.push('- None found');
  else {
    for (const item of report.relevantLessons) {
      lines.push(`- ${item.text}`);
      lines.push(`  - Source: ${item.source}#L${item.line}`);
    }
  }
  lines.push('');
  lines.push('## Apply Checklist');
  lines.push('');
  if (!report.applyChecklist.length) lines.push('- No checklist generated.');
  else for (const item of report.applyChecklist) lines.push(`- [ ] ${item}`);
  lines.push('');
  lines.push('## Gaps');
  lines.push('');
  if (!report.gaps.length) lines.push('- None');
  else for (const gap of report.gaps) lines.push(`- ${gap}`);
  lines.push('');
  lines.push('## Next Step');
  lines.push('');
  lines.push(report.nextStep);
  lines.push('');
  return lines.join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Evolution OS Review - ${today}`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Inbox candidates: ${report.counts.inbox}`);
  lines.push(`- Promoted records: ${report.counts.promoted}`);
  lines.push(`- Archive records: ${report.counts.archive}`);
  lines.push(`- MEMORY.md: ${report.memoryBudget.bytes} bytes (target ${report.memoryBudget.targetBytes}, soft limit ${report.memoryBudget.softLimitBytes})`);
  lines.push('');
  lines.push('## Policy Checks');
  lines.push('');
  for (const check of report.policyChecks) {
    lines.push(`- ${check.present ? '[x]' : '[ ]'} ${check.token}`);
  }
  lines.push('');
  lines.push('## Inbox');
  lines.push('');
  if (!report.inbox.length) {
    lines.push('- Empty');
  } else {
    for (const c of report.inbox) {
      lines.push(`- ${c.file}`);
      lines.push(`  - id: ${c.id || '(missing)'}`);
      lines.push(`  - type/status/risk: ${c.type || '?'} / ${c.status || '?'} / ${c.risk || '?'}`);
      lines.push(`  - scope: ${c.scope || '?'}`);
      lines.push(`  - confidence/decay: ${c.confidence || '?'} / ${c.decay || '?'}`);
      lines.push(`  - decay status: ${c.decayStatus?.state || '?'} (${c.decayStatus?.message || '?'})`);
      lines.push(`  - bytes/sha: ${c.bytes} / ${c.sha}`);
      if (c.missingFields.length) lines.push(`  - missing fields: ${c.missingFields.join(', ')}`);
      if (c.missingSections.length) lines.push(`  - missing sections: ${c.missingSections.join(', ')}`);
    }
  }
  lines.push('');
  lines.push('## Duplicate Groups');
  lines.push('');
  if (!report.duplicateGroups?.length) {
    lines.push('- None');
  } else {
    for (const group of report.duplicateGroups) {
      lines.push(`- ${group.kind} score=${group.score}`);
      lines.push(`  - files: ${group.files.join(' <-> ')}`);
      lines.push(`  - suggested action: ${group.suggestedAction}`);
    }
  }
  lines.push('');
  lines.push('## Warnings');
  lines.push('');
  if (!report.warnings.length) lines.push('- None');
  else for (const warning of report.warnings) lines.push(`- ${warning}`);
  lines.push('');
  lines.push('## Next Suggested Actions');
  lines.push('');
  for (const action of report.nextSuggestedActions) lines.push(`- ${action}`);
  lines.push('');
  return lines.join('\n');
}

if (help) {
  console.log(renderHelp());
} else if (beforeTask) {
  try {
    const report = prepareReport(taskText);
    appendUsageLog({ type: 'prepare', hook: 'beforeTask', task: report.task, relevantLessons: report.relevantLessons, applyChecklist: report.applyChecklist, gaps: report.gaps });
    const payload = { hook: 'beforeTask', recordedUsage: true, report };
    if (json) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log(`# Evolution OS Before Task Hook - ${today}\n`);
      console.log(renderPrepareMarkdown(report));
      console.log('\n## Hook Result\n\n- recordedUsage: yes\n- next: Apply checklist during task, then run --after-task with outcome.');
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (afterTask) {
  try {
    const report = reflectReport(taskText, outcomeText);
    const candidateWrite = writeCandidate ? writeReflectCandidate(report) : null;
    appendUsageLog({ type: 'reflect', hook: 'afterTask', task: report.task, outcome: report.outcome, appliedLessons: report.appliedLessons, evaluation: report.evaluation, candidateCreated: Boolean(candidateWrite?.written), candidateFile: candidateWrite?.file || null });
    const payload = { hook: 'afterTask', recordedUsage: true, report, candidateWrite };
    if (json) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log(`# Evolution OS After Task Hook - ${today}\n`);
      console.log(renderReflectMarkdown(report));
      console.log('\n## Hook Result\n\n- recordedUsage: yes');
      if (candidateWrite) console.error(`${candidateWrite.written ? 'Wrote' : 'Skipped'} ${candidateWrite.file || ''}${candidateWrite.reason ? ` (${candidateWrite.reason})` : ''}`);
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (periodicUsage) {
  try {
    const report = usageReportData();
    if (json) console.log(JSON.stringify({ hook: 'periodicUsage', report }, null, 2));
    else {
      console.log(`# Evolution OS Periodic Usage Hook - ${today}\n`);
      console.log(renderUsageReportMarkdown(report));
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (usageReport) {
  try {
    const report = usageReportData();
    if (suggestCleanupCandidates) {
      const draftReport = usageCleanupCandidateDrafts(report);
      const written = writeUsageCleanupCandidates(draftReport);
      const payload = { ...draftReport, written };
      if (json) console.log(JSON.stringify(payload, null, 2));
      else {
        console.log(renderUsageCleanupCandidatesMarkdown(draftReport));
        for (const item of written) console.error(`${item.created ? 'Wrote' : 'Exists'} ${item.file}`);
      }
    } else if (suggestPromotionCandidates) {
      const draftReport = usagePromotionCandidateDrafts(report);
      const written = writeUsagePromotionCandidates(draftReport);
      const payload = { ...draftReport, written };
      if (json) console.log(JSON.stringify(payload, null, 2));
      else {
        console.log(renderUsagePromotionCandidatesMarkdown(draftReport));
        for (const item of written) console.error(`${item.created ? 'Wrote' : 'Exists'} ${item.file}`);
      }
    } else if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderUsageReportMarkdown(report));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (install) {
  try {
    const report = installEvolutionOs({ unattendedSafe });
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderInstallMarkdown(report));
    if (!report.selfCheck.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (prepare) {
  try {
    const report = prepareReport(taskText);
    if (recordUsage) appendUsageLog({ type: 'prepare', task: report.task, relevantLessons: report.relevantLessons, applyChecklist: report.applyChecklist, gaps: report.gaps });
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderPrepareMarkdown(report));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (reflect) {
  try {
    const report = reflectReport(taskText, outcomeText);
    const candidateWrite = writeCandidate ? writeReflectCandidate(report) : null;
    if (recordUsage) appendUsageLog({ type: 'reflect', task: report.task, outcome: report.outcome, appliedLessons: report.appliedLessons, evaluation: report.evaluation, candidateCreated: Boolean(candidateWrite?.written), candidateFile: candidateWrite?.file || null });
    const payload = candidateWrite ? { ...report, candidateWrite } : report;
    if (json) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log(renderReflectMarkdown(report));
      if (candidateWrite) console.error(`${candidateWrite.written ? 'Wrote' : 'Skipped'} ${candidateWrite.file || ''}${candidateWrite.reason ? ` (${candidateWrite.reason})` : ''}`);
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (installSkill) {
  try {
    const report = installAgentAdapter(skillDirArg);
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderInstallAdapterMarkdown(report));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (init) {
  try {
    const report = initEvolutionOs();
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderInitMarkdown(report));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (initConfig) {
  try {
    const result = initConfigFile();
    const payload = { ...result, file: path.relative(ROOT, result.file) };
    if (json) console.log(JSON.stringify(payload, null, 2));
    else console.log(`${result.created ? 'Created' : 'Exists'} ${path.relative(ROOT, result.file)}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (selfCheck) {
  try {
    const report = selfCheckReport();
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderSelfCheckMarkdown(report));
    if (writeReport) {
      const out = writeSelfCheckReport(report);
      if (!json) console.error(`Wrote ${path.relative(ROOT, out)}`);
    }
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (selfTest) {
  try {
    const report = runSelfTest();
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderSelfTestMarkdown(report));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (skillAudit) {
  try {
    const report = skillAuditReport({ includeAll: allSkills });
    if (suggestCleanupCandidates) {
      const draftReport = skillCleanupCandidateDrafts(report);
      const written = writeSkillCleanupCandidates(draftReport);
      const payload = { ...draftReport, written };
      if (json) {
        console.log(JSON.stringify(payload, null, 2));
      } else {
        console.log(renderSkillCleanupCandidatesMarkdown(draftReport));
        for (const item of written) console.error(`${item.created ? 'Wrote' : 'Exists'} ${item.file}`);
      }
    } else {
      if (json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(renderSkillAuditMarkdown(report));
      }
      if (writeReport) {
        const out = writeSkillAuditReport(report);
        if (!json) console.error(`Wrote ${path.relative(ROOT, out)}`);
      }
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (memoryDistillDraft) {
  try {
    const report = memoryDistillDraftReport();
    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(renderMemoryDistillDraftMarkdown(report));
    }
    if (writeReport) {
      const out = writeMemoryDistillDraftReport(report);
      if (!json) console.error(`Wrote ${path.relative(ROOT, out)}`);
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (memoryDistill) {
  try {
    const report = memoryDistillSuggestions();
    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(renderMemoryDistillMarkdown(report));
    }
    if (writeReport) {
      const out = writeMemoryDistillReport(report);
      if (!json) console.error(`Wrote ${path.relative(ROOT, out)}`);
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (archiveDraft) {
  try {
    const archive = classifyArchive(findCandidate(candidateSelector), archiveReason);
    const out = writeArchiveDraft(archive);
    if (json) {
      console.log(JSON.stringify({ ...archive, draftFile: path.relative(ROOT, out) }, null, 2));
    } else {
      console.log(renderArchiveDraftMarkdown(archive));
      console.error(`Wrote ${path.relative(ROOT, out)}`);
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else if (promoteDraft || suggestPromotion || candidateSelector) {
  try {
    const promotion = classifyPromotion(findCandidate(candidateSelector));
    if (promoteDraft) {
      const out = writePromoteDraft(promotion);
      if (json) {
        console.log(JSON.stringify({ ...promotion, draftFile: path.relative(ROOT, out) }, null, 2));
      } else {
        console.log(renderPromoteDraftMarkdown(promotion));
        console.error(`Wrote ${path.relative(ROOT, out)}`);
      }
      if (writeReport) {
        const reportOut = writePromotionReport(promotion);
        if (!json) console.error(`Wrote ${path.relative(ROOT, reportOut)}`);
      }
    } else {
      if (json) {
        console.log(JSON.stringify(promotion, null, 2));
      } else {
        console.log(renderPromotionMarkdown(promotion));
      }
      if (writeReport) {
        const out = writePromotionReport(promotion);
        if (!json) console.error(`Wrote ${path.relative(ROOT, out)}`);
      }
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
} else {
  const report = summarize();

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderMarkdown(report));
  }

  if (writeReport) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const out = path.join(REPORTS_DIR, `${today}-review.md`);
    fs.writeFileSync(out, renderMarkdown(report));
    if (!json) console.error(`Wrote ${path.relative(ROOT, out)}`);
  }
}

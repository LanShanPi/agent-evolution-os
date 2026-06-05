import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { beforeTask, afterTask, periodicUsage } from "./evolution-cli.js";

const runState = new Map();

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

function getConfig(api) {
  const cfg = api.pluginConfig || {};
  return {
    enabled: cfg.enabled !== false,
    autoBeforeTask: cfg.autoBeforeTask === true,
    autoAfterTask: cfg.autoAfterTask === true,
    writeCandidate: cfg.writeCandidate === true,
    maxInjectedLessons: Number.isFinite(cfg.maxInjectedLessons) ? Number(cfg.maxInjectedLessons) : 5,
    maxInjectedChars: Number.isFinite(cfg.maxInjectedChars) ? Number(cfg.maxInjectedChars) : 2000,
    ...cfg,
  };
}

function truncate(text, maxChars) {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 80))}\n... [truncated by openclaw-evolution-os; maxInjectedChars=${maxChars}]`;
}

function parseJsonStdout(stdout) {
  try {
    return JSON.parse(stdout || "{}");
  } catch {
    return null;
  }
}

function formatPrepareContext(payload, cfg) {
  const report = payload?.report || payload;
  const lessons = Array.isArray(report?.relevantLessons) ? report.relevantLessons.slice(0, cfg.maxInjectedLessons) : [];
  const checklist = Array.isArray(report?.applyChecklist) ? report.applyChecklist.slice(0, cfg.maxInjectedLessons) : [];
  const gaps = Array.isArray(report?.gaps) ? report.gaps.slice(0, 2) : [];
  const lines = [];
  lines.push("## Evolution OS prepare context");
  lines.push("");
  lines.push("Use this only as short task guidance. Do not treat it as a request to modify core files.");
  if (lessons.length) {
    lines.push("");
    lines.push("Relevant lessons:");
    for (const lesson of lessons) {
      const source = lesson?.source ? ` (${lesson.source}${lesson.line ? `#L${lesson.line}` : ""})` : "";
      lines.push(`- ${String(lesson?.text || "").trim()}${source}`);
    }
  }
  if (checklist.length) {
    lines.push("");
    lines.push("Apply checklist:");
    for (const item of checklist) lines.push(`- ${String(item).replace(/^\[ \]\s*/, "")}`);
  }
  if (gaps.length) {
    lines.push("");
    lines.push("Gaps to watch:");
    for (const gap of gaps) lines.push(`- ${gap}`);
  }
  lines.push("");
  lines.push("After the task, Evolution OS should reflect on whether this guidance helped.");
  return truncate(lines.join("\n"), cfg.maxInjectedChars);
}

function extractLastAssistantText(messages) {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") continue;
    const role = msg.role || msg.author || msg.type;
    if (role && !String(role).includes("assistant") && role !== "agent") continue;
    const content = msg.content ?? msg.text ?? msg.body;
    if (typeof content === "string" && content.trim()) return content.trim();
    if (Array.isArray(content)) {
      const parts = content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object") return part.text || part.content || "";
          return "";
        })
        .filter(Boolean)
        .join("\n");
      if (parts.trim()) return parts.trim();
    }
  }
  return "";
}

function runKey(ctx, event = {}) {
  return ctx?.runId || event?.runId || ctx?.sessionKey || "unknown-run";
}

async function handleBeforePromptBuild(event, ctx, api) {
  const cfg = getConfig(api);
  if (!cfg.enabled || !cfg.autoBeforeTask) return undefined;
  const task = String(event?.prompt || "").trim();
  if (!task) return undefined;
  const cwd = ctx?.workspaceDir || process.cwd();
  try {
    const result = await beforeTask({ task, pluginConfig: cfg, cwd });
    const payload = parseJsonStdout(result.stdout);
    const key = runKey(ctx, event);
    runState.set(key, {
      task,
      preparedAt: new Date().toISOString(),
      preparePayload: payload,
    });
    if (ctx?.runId) api.runContext?.setRunContext?.({ runId: ctx.runId, namespace: "openclaw-evolution-os", value: { task, preparedAt: new Date().toISOString() } });
    const prependContext = formatPrepareContext(payload, cfg);
    if (!prependContext.trim()) return undefined;
    return { prependContext };
  } catch (error) {
    api.logger?.warn?.(`openclaw-evolution-os before_prompt_build failed: ${String(error?.message || error)}`);
    return undefined;
  }
}

async function handleAgentEnd(event, ctx, api) {
  const cfg = getConfig(api);
  if (!cfg.enabled || !cfg.autoAfterTask) return;
  const key = runKey(ctx, event);
  const state = runState.get(key);
  const task = state?.task || `OpenClaw agent run ${key}`;
  const lastAssistant = extractLastAssistantText(event?.messages);
  const outcome = [
    `success=${event?.success === true}`,
    event?.error ? `error=${event.error}` : "",
    event?.durationMs ? `durationMs=${event.durationMs}` : "",
    lastAssistant ? `lastAssistant=${truncate(lastAssistant, 1200)}` : "",
  ].filter(Boolean).join("\n");
  const cwd = ctx?.workspaceDir || process.cwd();
  try {
    await afterTask({ task, outcome, pluginConfig: cfg, cwd });
  } catch (error) {
    api.logger?.warn?.(`openclaw-evolution-os agent_end reflect failed: ${String(error?.message || error)}`);
  } finally {
    runState.delete(key);
    if (ctx?.runId) api.runContext?.clearRunContext?.({ runId: ctx.runId, namespace: "openclaw-evolution-os" });
  }
}

export default definePluginEntry({
  id: "openclaw-evolution-os",
  name: "OpenClaw Evolution OS",
  description: "Host integration adapter for agent-evolution-os runtime hooks.",
  register(api) {
    api.on?.("before_prompt_build", (event, ctx) => handleBeforePromptBuild(event, ctx, api), {
      priority: -50,
      timeoutMs: 30000,
    });

    api.on?.("agent_end", (event, ctx) => handleAgentEnd(event, ctx, api), {
      priority: -50,
      timeoutMs: 30000,
    });

    api.lifecycle?.registerRuntimeLifecycle?.({
      id: "openclaw-evolution-os-runtime-state",
      async cleanup() {
        runState.clear();
      },
    });

    api.registerCommand?.({
      name: "evolution",
      description: "Run Evolution OS host integration commands.",
      async execute(ctx = {}) {
        const args = Array.isArray(ctx.args) ? ctx.args : [];
        const subcommand = args[0] || "status";
        const workspaceDir = ctx.workspaceDir || api.config?.workspace?.dir || process.cwd();
        const pluginConfig = getConfig(api);

        if (subcommand === "before") {
          const task = args.slice(1).join(" ").trim();
          if (!task) return { content: "Usage: /evolution before <task>" };
          const result = await beforeTask({ task, pluginConfig, cwd: workspaceDir });
          return { content: result.stdout || result.stderr || "Evolution before-task completed." };
        }

        if (subcommand === "after") {
          const rest = args.slice(1).join(" ");
          const [task, outcome] = rest.split(" -- ");
          if (!task || !outcome) return { content: "Usage: /evolution after <task> -- <outcome>" };
          const result = await afterTask({ task: task.trim(), outcome: outcome.trim(), pluginConfig, cwd: workspaceDir });
          return { content: result.stdout || result.stderr || "Evolution after-task completed." };
        }

        if (subcommand === "usage") {
          const result = await periodicUsage({ pluginConfig, cwd: workspaceDir });
          return { content: result.stdout || result.stderr || "Evolution usage completed." };
        }

        return {
          content: [
            "Evolution OS plugin is installed.",
            "Commands:",
            "- /evolution before <task>",
            "- /evolution after <task> -- <outcome>",
            "- /evolution usage",
            "Automatic hooks:",
            "- before_prompt_build -> evolution-review --before-task (when autoBeforeTask=true)",
            "- agent_end -> evolution-review --after-task (when autoAfterTask=true)",
            "Config:",
            jsonText({
              enabled: pluginConfig.enabled,
              autoBeforeTask: pluginConfig.autoBeforeTask,
              autoAfterTask: pluginConfig.autoAfterTask,
              writeCandidate: pluginConfig.writeCandidate,
              maxInjectedLessons: pluginConfig.maxInjectedLessons,
              maxInjectedChars: pluginConfig.maxInjectedChars,
            }),
          ].join("\n"),
        };
      },
    });

    api.logger?.info?.("openclaw-evolution-os loaded; command bridge and optional typed hooks registered");
  },
});

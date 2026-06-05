import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { beforeTask, afterTask, periodicUsage } from "./evolution-cli.js";

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

export default definePluginEntry({
  id: "openclaw-evolution-os",
  name: "OpenClaw Evolution OS",
  description: "Host integration adapter for agent-evolution-os runtime hooks.",
  register(api) {
    api.registerCommand?.({
      name: "evolution",
      description: "Run Evolution OS host integration commands.",
      async execute(ctx = {}) {
        const args = Array.isArray(ctx.args) ? ctx.args : [];
        const subcommand = args[0] || "status";
        const workspaceDir = ctx.workspaceDir || api.config?.workspace?.dir || process.cwd();
        const pluginConfig = api.pluginConfig || {};

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
            "Evolution OS plugin scaffold is installed.",
            "Commands:",
            "- /evolution before <task>",
            "- /evolution after <task> -- <outcome>",
            "- /evolution usage",
            "Typed automatic lifecycle hooks are intentionally not enabled in this scaffold yet.",
            "Config:",
            jsonText({
              enabled: pluginConfig.enabled ?? true,
              autoBeforeTask: pluginConfig.autoBeforeTask ?? false,
              autoAfterTask: pluginConfig.autoAfterTask ?? false,
              writeCandidate: pluginConfig.writeCandidate ?? false,
            }),
          ].join("\n"),
        };
      },
    });

    api.logger?.info?.("openclaw-evolution-os scaffold loaded; command integration registered when supported");
  },
});

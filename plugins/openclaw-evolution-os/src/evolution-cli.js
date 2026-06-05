import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function resolveEvolutionCommand(pluginConfig = {}) {
  const raw = typeof pluginConfig.evolutionReviewBin === "string" && pluginConfig.evolutionReviewBin.trim()
    ? pluginConfig.evolutionReviewBin.trim()
    : "evolution-review";
  const [command, ...prefixArgs] = raw.split(/\s+/).filter(Boolean);
  return { command, prefixArgs };
}

export async function runEvolutionReview(args, opts = {}) {
  const { pluginConfig = {}, cwd = process.cwd(), timeoutMs = 30000 } = opts;
  const { command, prefixArgs } = resolveEvolutionCommand(pluginConfig);
  const finalArgs = [...prefixArgs, ...args];
  const { stdout, stderr } = await execFileAsync(command, finalArgs, {
    cwd,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
  return { command, args: finalArgs, stdout, stderr };
}

export async function beforeTask({ task, pluginConfig, cwd }) {
  return runEvolutionReview(["--before-task", "--task", task, "--json"], { pluginConfig, cwd });
}

export async function afterTask({ task, outcome, pluginConfig, cwd }) {
  const args = ["--after-task", "--task", task, "--outcome", outcome, "--json"];
  if (pluginConfig?.writeCandidate) args.push("--write-candidate");
  return runEvolutionReview(args, { pluginConfig, cwd });
}

export async function periodicUsage({ pluginConfig, cwd }) {
  return runEvolutionReview(["--periodic-usage", "--json"], { pluginConfig, cwd });
}

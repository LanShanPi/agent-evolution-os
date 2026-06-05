# OpenClaw Evolution OS Plugin Scaffold

This is the OpenClaw host integration adapter for `agent-evolution-os`.

Current scaffold:

- native OpenClaw plugin manifest;
- runtime entry using `definePluginEntry`;
- command bridge for manual host calls;
- safe config defaults;
- optional typed lifecycle hooks using `agent_turn_prepare` and `agent_end`, disabled by default.

Commands exposed by the scaffold:

```text
/evolution before <task>
/evolution after <task> -- <outcome>
/evolution usage
```

The commands call the project CLI:

```text
evolution-review --before-task --task "..." --json
evolution-review --after-task --task "..." --outcome "..." --json
evolution-review --periodic-usage --json
```

## Install locally for development

From the repo root:

```bash
openclaw plugins install --link ./plugins/openclaw-evolution-os
openclaw plugins enable openclaw-evolution-os
openclaw gateway restart
openclaw plugins inspect openclaw-evolution-os --runtime --json
```

Make sure `evolution-review` is on PATH, or configure:

```json
{
  "plugins": {
    "entries": {
      "openclaw-evolution-os": {
        "enabled": true,
        "config": {
          "evolutionReviewBin": "node /path/to/agent-evolution-os/bin/evolution-review.js"
        }
      }
    }
  }
}
```

## Optional automatic hooks

The scaffold now registers conservative typed hooks, but they are disabled unless configured:

```json
{
  "plugins": {
    "entries": {
      "openclaw-evolution-os": {
        "enabled": true,
        "config": {
          "autoBeforeTask": true,
          "autoAfterTask": true,
          "writeCandidate": false
        },
        "hooks": {
          "allowConversationAccess": true,
          "timeouts": {
            "agent_turn_prepare": 30000,
            "before_prompt_build": 30000,
            "agent_end": 30000
          }
        }
      }
    }
  }
}
```

Hook behavior:

- `agent_turn_prepare`: runs `evolution-review --before-task --json`, records usage, and injects a same-turn short `prependContext` checklist before prompt hooks.
- `agent_end`: runs `evolution-review --after-task --json` using run outcome and bounded assistant text.
- `before_prompt_build`: fallback prepare hook only when `useBeforePromptBuildFallback=true`.

Safety defaults:

- `autoBeforeTask=false` by default.
- `autoAfterTask=false` by default.
- `writeCandidate=false` by default.
- Prompt injection is bounded by `maxInjectedLessons` and `maxInjectedChars`.

## Next step

Move from bounded prompt injection to richer host state once verified in a live Gateway:

- `api.agent.events.registerAgentEventSubscription(...)` for cleaner task/run state;
- `api.session.state.registerSessionExtension(...)` for status projection;
- Control UI action for usage reports;
- optional `api.session.workflow.enqueueNextTurnInjection(...)` for command-triggered next-turn context.

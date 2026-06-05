# OpenClaw Evolution OS Plugin Scaffold

This is the OpenClaw host integration adapter for `agent-evolution-os`.

Current scaffold:

- native OpenClaw plugin manifest;
- runtime entry using `definePluginEntry`;
- command bridge for manual host calls;
- safe config defaults;
- no automatic lifecycle prompt injection yet.

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

## Next step

Implement typed lifecycle hooks using OpenClaw Plugin SDK surfaces documented in `docs/OPENCLAW_INTEGRATION.md`:

- `api.on(...)` for runtime lifecycle hooks;
- `api.session.workflow.enqueueNextTurnInjection(...)` for short prepare checklist injection;
- `api.agent.events.registerAgentEventSubscription(...)` for cleaner task/run state;
- `api.runContext.*` for per-run prepare/reflect state;
- `api.session.state.registerSessionExtension(...)` for status projection.

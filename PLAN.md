# Proxy CLI Plan

## Goals
- Provide a CLI tool to manage proxy subscriptions and nodes on servers without GUI.
- Generate and manage sing-box configuration automatically.
- Use a single config file: `config.yaml`.
- Support real-world connectivity tests to select the best node.
- Run in the background with periodic updates.

## Key Requirements
- Language: TypeScript
- Package manager: pnpm
- Single config file: `config.yaml`
- Features:
  - Add/manage subscriptions
  - Add custom nodes
  - Filter nodes by keyword (excludeKeywords)
  - Real connectivity testing
  - Periodic updates and node selection
  - Manage sing-box process directly
  - Built-in CN direct / non-CN proxy rule set

## Config Design (Draft)

### Minimal Example
```yaml
subscriptions:
  - "https://example.com/sub"
test:
  url: "https://www.google.com/generate_204"
interval:
  update: "6h"
  test: "30m"
```

### Extended Example
```yaml
subscriptions:
  - "https://example.com/sub"
nodes:
  - type: vless
    server: 1.2.3.4
    port: 443
excludeKeywords:
  - "香港"
  - "HK"
  - "Hong Kong"
test:
  url: "https://www.google.com/generate_204"
interval:
  update: "6h"
  test: "30m"
```

### Field Notes
- `excludeKeywords`: case-insensitive substring match against node display name.
- `nodes`: user-defined nodes merged with subscription nodes.
- `test.url`: real connectivity endpoint; success + latency are measured.
- `interval.update` / `interval.test`: background scheduling.

## CLI Commands (Draft)
- `proxy-cli run`
  - Background mode. Periodically updates subscriptions, tests nodes, regenerates config, manages sing-box.
- `proxy-cli gen`
  - One-shot config generation (no sing-box process).
- `proxy-cli test`
  - Manual test of current nodes.
- `proxy-cli list`
  - List nodes and selected target.

## Runtime Flow
1. Load `config.yaml`.
2. Fetch subscriptions.
3. Parse nodes.
4. Apply `excludeKeywords` filtering.
5. Merge with custom nodes.
6. Rename nodes to avoid collisions.
7. Run connectivity tests.
8. Select best node.
9. Generate `sing-box.json`.
10. Start or reload sing-box.

## Node Naming Strategy
- Assign sequential names: `node-001`, `node-002`, ...
- Preserve original name for filtering and diagnostics only.

## Connectivity Test Strategy
- Use HTTP GET to `test.url` via proxy.
- Measure:
  - success/failure
  - total latency
- Selection priority: available nodes first, lower latency next.
- Optional cool-down for failed nodes (future extension).

## sing-box Management
- Generate `sing-box.json` automatically.
- Spawn and manage sing-box process from CLI.
- Prefer hot-reload when config changes; restart if reload not supported.

## Built-in Routing Rules
- CN IP: direct
- Non-CN: proxy
- Provide a minimal, built-in rule set compatible with sing-box.

## Storage Layout (Draft)
- `config.yaml`: user config
- `cache/`:
  - `subscriptions.json` (last fetch)
  - `test-results.json`
  - `sing-box.json`

## Deliverables
- CLI executable (npm)
- Config loader and validator
- Subscription parser
- Node filter + rename
- Connectivity tester
- sing-box config generator
- sing-box process manager

## Open Questions
- Where to install/find sing-box binary? (system PATH vs bundled)
- Whether to support additional rule customization beyond built-in CN rules

## Ready Criteria
- `config.yaml` schema confirmed
- sing-box binary path strategy confirmed
- CLI command set confirmed

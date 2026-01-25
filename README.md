# subproxy-cli

CLI proxy manager built on sing-box. It reads a single `config.yaml`, generates a sing-box config, and runs the core for you.

## Requirements
- Node.js 18+
- pnpm
- `sing-box` available in PATH

## Install
```bash
npm i -g subproxy-cli
```

## Install (dev)
```bash
pnpm install
```

## Quick Start
1. Create `config.yaml` in the project root.
2. Generate config once:
```bash
subproxy-cli gen
```
3. Run in background mode:
```bash
subproxy-cli run
```

## Example config.yaml
```yaml
subscriptions:
  - "https://example.com/sub"
inbound:
  httpPort: 20800
  socksPort: 20801
excludeKeywords:
  - "香港"
  - "HK"
  - "Hong Kong"
nodes:
  - type: vmess
    server: "v.example.com"
    server_port: 443
    uuid: "00000000-0000-0000-0000-000000000000"
    alter_id: 0
    security: "auto"
    tls:
      enabled: true
      server_name: "v.example.com"
    transport:
      type: "ws"
      path: "/ray"
test:
  url: "https://www.google.com/generate_204"
```

## Commands
- `gen` Generate sing-box config once
- `run` Run in background with periodic updates
- `list` List available nodes

## Output
- Generated config: `.subproxy-cli/sing-box.json`
- Runtime cache: `.subproxy-cli/`

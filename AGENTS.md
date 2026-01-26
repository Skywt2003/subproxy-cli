# AGENTS.md

Purpose
- Audience: autonomous coding agents working in this repo.
- Goal: ship changes that match existing build scripts, config, and code style.

Project summary
- Name: subproxy-cli (CLI proxy manager built on sing-box).
- Language: TypeScript (ESM, NodeNext).
- Entry points: `src/index.ts` (CLI), `src/cli.ts` (commands).
- Config file: `config.yaml` in repo root by default.
- Runtime cache/output: `.subproxy-cli/`.

Repository rules
- Cursor rules: none found (`.cursor/` or `.cursorrules` absent).
- Copilot rules: none found (`.github/copilot-instructions.md` absent).
- If new rule files are added later, incorporate them here.

Build, lint, test
- Install deps (dev): `pnpm install`.
- Build (typecheck + emit): `pnpm build` (runs `tsc -p tsconfig.json`).
- Dev run: `pnpm dev` (runs `tsx src/index.ts`).
- Production run: `pnpm start` (runs `node dist/index.js`).
- Lint: no lint script or config found.
- Tests: no test runner configured.
- Single test: not applicable (no test framework).

Environment requirements
- Node.js >= 18 (package.json engines).
- pnpm.
- `sing-box` available in PATH for runtime.

Code style (observed)
- ESM only; use explicit `.js` extensions in internal imports.
- Use NodeNext module resolution (tsconfig).
- Prefer `node:`-prefixed built-ins: `node:fs/promises`, `node:path`, etc.
- Type-only imports use `import type { ... }`.
- Double quotes for strings; semicolons required.
- 2-space indentation.
- Trailing commas in multiline objects/params.
- Prefer `const` and `let` over `var` (no `var` used).

Types and naming
- `strict: true` is enabled; do not weaken types.
- Avoid `any`, `@ts-ignore`, or `@ts-expect-error`.
- Types are PascalCase; functions/variables are lowerCamelCase.
- Constants are UPPER_SNAKE_CASE (e.g., `DEFAULT_TEST_URL`).
- Explicit return types on exported functions and class methods.

Error handling
- Use explicit errors for unsupported platforms or invalid state.
- Avoid empty catch blocks; if catching intentionally, return early with a comment or handle explicitly.
- Prefer small helper functions to isolate platform-specific behavior.

CLI patterns
- `commander` used for CLI definitions.
- CLI actions are async and call into modules in `src/`.
- Use `program.opts<{ ... }>()` for typed options.

File organization
- `src/index.ts`: CLI entry; should stay minimal.
- `src/cli.ts`: command wiring; no heavy logic.
- `src/config.ts`: config parsing and normalization.
- `src/service.ts`: service management (systemd/launchd).

Config conventions
- Default config path: `config.yaml` in repo root.
- Derived paths use `path.resolve` and `path.join`.
- Defaults are defined as constants near top of file.

Logging
- Logger uses `console.log` with `[LEVEL]` prefixes.
- Log levels: debug, info, warn, error.

Process execution
- Uses `spawn` with `stdio: "inherit"` and rejects on non-zero exit.
- Prefer dedicated helpers (`runCommand`, `tryCommand`).

Service management
- Linux uses `systemctl --user` with unit file at `~/.config/systemd/user`.
- macOS uses launchd user agents at `~/Library/LaunchAgents`.
- Launchd uses `bootstrap` and falls back to `kickstart -k`.
- Log output goes to `~/.subproxy-cli/service.log` and `.error.log`.

Output paths
- Generated sing-box config: `.subproxy-cli/sing-box.json`.
- Cache/logs stored under `.subproxy-cli/`.

Documentation
- Update `README.md` when CLI commands change.
- Keep examples ASCII unless repo already uses non-ASCII in docs.

Change guidance
- Favor minimal, focused changes; avoid refactors when fixing bugs.
- Follow existing code patterns and naming.
- Keep CLI help text concise and consistent with README wording.

Verification checklist
- `pnpm build` should pass after changes.
- If behavior changes, update `README.md` accordingly.
- If introducing a test framework, document how to run a single test here.

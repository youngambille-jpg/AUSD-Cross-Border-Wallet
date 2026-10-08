# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm workspace. Shared TypeScript packages live in `lib/`: `db` contains Drizzle schemas, `api-spec` holds the OpenAPI source and client generation config, and `api-zod` / `api-client-react` expose generated API types and hooks. Deployable projects and prototypes are under `artifacts/`, including `api-server`, `ausd-wallet`, and `mockup-sandbox`. Utility scripts live in `scripts/src/`. Keep changes in the package that owns the behavior; update generated API clients through the API spec workflow rather than editing generated files by hand.

## Build, Test, and Development Commands

- `pnpm install --frozen-lockfile` installs the workspace using the committed lockfile.
- `pnpm build` typechecks the workspace, then runs available package build scripts.
- `pnpm typecheck` runs library, artifact, and script TypeScript checks.
- `pnpm --filter @workspace/mockup-sandbox dev` starts the Vite prototype.
- `pnpm --filter @workspace/api-server dev` builds and starts the API server.
- `pnpm --filter @workspace/api-spec codegen` regenerates API clients from `lib/api-spec/openapi.yaml` and checks library types.

Use package-level `typecheck` or `build` scripts when working on one artifact. Database push commands can modify a configured database; verify the target environment before running them.

## Coding Style & Naming Conventions

Use TypeScript with the shared strict compiler settings in `tsconfig.base.json`. Match surrounding code: two-space indentation, semicolons, and double quotes are common. Use `PascalCase` for React components and types, `camelCase` for variables and functions, and descriptive kebab-case filenames where established. Prettier is installed at the workspace root; format changed files consistently with nearby code.

## Testing Guidelines

No repository-wide test runner or coverage threshold is configured. Run `pnpm typecheck` for code changes and `pnpm build` when package build output matters. For UI or runtime changes, also exercise the affected app locally. Add focused tests alongside the relevant package if introducing test infrastructure; use descriptive `*.test.ts` or `*.test.tsx` names.

## Commit & Pull Request Guidelines

Recent history uses short, often informal commit subjects and does not show a consistent conventional-commit format. Prefer a concise imperative summary that names the change (for example, `Fix wallet startup error`). Pull requests should explain the user-visible or technical change, list validation commands and results, link related issues when available, and include screenshots for visual changes.

## Security & Configuration

Keep credentials and environment-specific values out of source control; use the existing environment or CI secret configuration. Preserve the one-day `minimumReleaseAge` safeguard in `pnpm-workspace.yaml` when changing dependencies.

# AGENTS.md

## Implementation

- When implementing a code change depending on a package, always use the relevant skills (if available) AND use the Context7 MCP to fetch the latest docs to use it as reference.
- For UI work, always follow the existing shadcn theme, ensure both light and dark mode are fully supported, and prefer components from the shared `@dwf/ui` package whenever possible.
- Always use the design tokens defined in `globals.css` for colors, spacing, typography, and other design values. Do not hardcode raw values when a token exists.
- For finite value-to-display mappings (labels, class names, UI copy), prefer `Record<string, string>` (or typed Record) lookup plus `??` fallback instead of `if/else` or `switch` chains.
- Do not use `will-change` in CSS or inline styles. It causes compositing layer shifts and layout instability; prefer `backface-visibility: hidden` or `translateZ(0)` for GPU hints instead.

## Naming

- Always use `kebab-case` for filenames.
- Use `camelCase` for variables and function names everywhere.
- Types must use `PascalCase` (e.g. `VerificationType`, `SyncResult`).

## Import Policy

- Relative imports are allowed only for direct and secondary siblings: `./...` and `../...`.
- Do not use relative index imports: `.`, `..`, `./`, `../`, `./index`, `../index` (including extension variants).
- Prefer aliases/non-relative imports over deep relative imports like `../../...`.

### Type Safety

- Prefer explicit, narrow types for component props and function inputs/outputs.
- Avoid introducing `any` unless unavoidable; if used, keep usage scoped and justified.
- Maintain `strictNullChecks` compatibility.

## Git and Commits

- Use Conventional Commits: `type(scope): subject`
- Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `style`

## File length

- File length limit: 350 lines max per file.
- Ignored from this rule: files ignored by `.gitignore` and auto-generated files
- Allowed exceptions: configuration/manifests that cannot be reasonably decomposed.
- Exception process: if a config file exceeds 350, keep it and add a short justification comment in-file and a one-line note in `AGENTS.md`.

# Supply Chain Security

All security settings live in `pnpm-workspace.yaml` at the project root. They apply to every `pnpm install` run — locally and in CI.

---

## Build Script Allowlist (`allowBuilds`)

pnpm v10+ disables `postinstall` scripts by default. The `allowBuilds` map controls exactly which packages are permitted to run build scripts.

| Package         | Allowed | Reason                                                                                                         |
| --------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `esbuild`       | `true`  | Required — Vite uses its postinstall to download the correct platform binary. Without it, Vite fails to start. |
| `@google/genai` | `false` | Pure JS/TS package. No native binaries, no build step needed.                                                  |
| `protobufjs`    | `false` | Transitive dependency of `@google/genai`. No compilation required in this context.                             |
| `sharp`         | `false` | Optional Astro image processing dep. Not used in this project.                                                 |

> [!CAUTION]
> Never use `dangerouslyAllowAllBuilds: true`. It re-enables postinstall scripts for every package in the dependency tree — including any compromised transitive dependency.

---

## Exotic Source Blocking (`blockExoticSubdeps`)

```yaml
blockExoticSubdeps: true
```

Prevents any transitive dependency from being resolved from a git repository, GitHub shorthand, or direct tarball URL. All packages — including transitive ones — must come from the npm registry.

---

## Trust Policy (`trustPolicy`)

```yaml
trustPolicy: no-downgrade
```

pnpm tracks the trust level of published packages (signed provenance, verified publisher, etc.). With `no-downgrade`, if a new version has _less_ trust evidence than its previous release, the install is blocked.

---

## Publication Delay (`minimumReleaseAge`)

```yaml
minimumReleaseAge: 1440 # minutes — equals 24 hours
```

pnpm refuses to install any package version published less than 24 hours ago.

| Value   | Wait time                |
| ------- | ------------------------ |
| `0`     | No delay (opt out)       |
| `1440`  | 24 hours (default)       |
| `10080` | 1 week (maximum caution) |

---

## Script Isolation (`ignore-scripts`)

```yaml
ignore-scripts: true
```

Disables all lifecycle scripts globally (`preinstall`, `install`, `postinstall`, `prepare`). Combined with `allowBuilds`, this creates an explicit allowlist model.

---

## Engine Enforcement (`engineStrict`)

```yaml
engineStrict: true
```

Enforces the `engines.node` field in `package.json`. If `pnpm install` runs on Node.js below `22.12.0`, it fails immediately.

# Scripts

This directory contains utility scripts for the SDD Navigator project.
All scripts are used in CI (GitHub Actions) and in git precommit/prepush hooks:

* [check-coverage.ts](#check-coverage.ts)
* [check-dry.ts](#check-dryts)
* [generate-sdd-report.ts](#generate-sdd-reportts)

---

## CI/CD Integration

All scripts are executed in the GitHub Actions workflow defined in `.github/workflows/ci.yml`.
The workflow runs on every push to `main`|`develop` and on pull requests targeting `main`|`develop`.

### Pipeline Steps

1. **Checkout** code
2. **Setup Node.js** (version 24)
3. **Install dependencies** (`npm ci`)
4. **Run lint** (`npm run lint`)
5. **Type check** (`npx tsc --noEmit`)
6. **Run tests** (`npm test`)
7. **Self‑validation (traceability)** (`npm run check‑coverage`)
8. **DRY check** (`npm run check:dry`)
9. **Generate SDD report** (`npm run report:sdd`)
10. **Build** (`npm run build`)
11. **Upload SDD report** as an artifact

If any step fails (non‑zero exit code), the workflow fails and the change is blocked.

### Local Pre‑push Hook

The `precommit` script in `package.json` runs `lint-staged` and `npm run check:sdd` before a `git commit`.
The `prepush` script in `package.json` runs `report:sdd`, `lint`, `test`, and `build` before a `git push`.
This ensures that local changes meet the same standards as the CI pipeline.

---

## Adding New Scripts

When creating a new utility script:

1. Place the TypeScript source in `scripts/`.
2. Add a corresponding npm script in `package.json`
4. Update this README with a dedicated section.
5. Consider integrating the script into the CI pipeline or git hooks.



## `check-coverage.ts`

A self-validation script that verifies traceability between requirements and source code annotations.

### Purpose

- Parses `requirements.yaml` to extract requirement IDs.
- Recursively scans source files (`app/`, `components/`, `lib/`, `scripts/`) for `// @req` annotations.
- Computes coverage: maps each requirement to the files/lines where it appears.
- Identifies unimplemented requirements (no annotation) and orphan annotations (references to unknown requirement IDs).
- Outputs a human-readable report to the console and a machine-readable JSON report to `reports/coverage.json`.
- Exits with code 0 if all requirements have at least one annotation, otherwise exits with code 1.

### Usage

```bash
# Build and run the script
npm run check-coverage
```

### Integration

The script is integrated into the project's pre‑commit hooks (via `lint‑staged`) and can be run as part of CI/CD pipelines to enforce traceability.

### Requirements

- Node.js 18+
- Dependencies: `js‑yaml` (already in devDependencies)

### Notes

- The script respects `.gitignore`‑like exclusions (`node_modules`, `.next`, etc.).
- Annotations must follow the pattern `// @req SCD‑XXX‑NNN` (multiple IDs separated by commas are allowed).
- Requirement IDs must match the regex `^SCD‑[A‑Z]+‑\d{3}$`.

### Example Output

```
🔍 SDD Navigator Coverage Check
================================
Loaded 33 requirement(s) from requirements.yaml
Scanned 5 file(s)
Found 5 annotation(s)

📊 Coverage Report
-----------------
Total requirements: 33
Implemented: 5
Unimplemented: 28
Orphan annotations: 0
...
```

### JSON Report

The JSON report includes detailed mapping of requirements to annotations, unimplemented list, and orphan annotations. It is written to `reports/coverage.json`.

---

## `check-dry.ts`

A DRY (Don’t Repeat Yourself) violation checker that scans for duplicate constants, type definitions, function definitions, and copy‑pasted code blocks.

### Purpose

- Scans source files (`app/`, `components/`, `lib/`, `scripts/`) for duplicate constant values (same name and value across files).
- Detects duplicate type/interface definitions.
- Detects duplicate function definitions (may be intentional overloading; flagged as warning).
- Identifies duplicate code blocks (5‑line sliding window) using MD5 hashing.
- Outputs a human‑readable report to the console and a machine‑readable JSON report to `reports/dry‑report.json`.
- Exits with code 1 if duplicate type definitions are found (serious violation), otherwise exits with code 0 (warnings only).

### Usage

```bash
npm run check:dry
```

Or directly via Node (after building):

```bash
node scripts/check-dry.ts
```

### Integration

The script is part of the CI pipeline (`.github/workflows/ci.yml`) and the local `prepush` hook. It helps enforce the DRY pillar of SDD.

### Requirements

- Node.js 18+
- No additional dependencies (uses built‑in `crypto` module).

### Notes

- The scanner excludes `node_modules`, `.next`, `out`, `build`, `coverage`, `.git`.
- Duplicate constants are flagged only if both name and value are identical.
- Duplicate code blocks are reported only when they appear in different files or at distinct locations within the same file.
- The script is designed to be fast; scanning a typical project takes <1 second.

### Example Output

```
🔍 SDD Navigator DRY Check
===========================
Scanned 6 file(s)

⚠️  Found 26 potential DRY violation(s):

CONSTANT "SOURCE_DIRS" appears in:
  - scripts\check-coverage.ts:31
  - scripts\check-dry.ts:30
...
```

### JSON Report

The JSON report includes all duplicates with file/line locations and extra metadata. It is written to `reports/dry‑report.json`.

---

## `generate-sdd-report.ts`

A report generator that consolidates coverage and DRY reports into a comprehensive SDD four‑pillars evaluation.

### Purpose

- Loads `reports/coverage.json` and `reports/dry‑report.json`.
- Evaluates each of the four SDD pillars (Traceability, DRY, Deterministic Enforcement, Parsimony) against the project’s current state.
- Produces a detailed markdown report (`reports/sdd‑report.md`) with a summary table, pillar ratings, and concrete violations.
- Prints a summary to the console.

### Usage

```bash
npm run report:sdd
```

Or directly:

```bash
node scripts/generate-sdd-report.js
```

### Integration

The script is executed as the final step of the CI pipeline. The generated markdown report is uploaded as a workflow artifact named `sdd‑report`.

### Requirements

- Node.js 18+
- Requires the two JSON reports (coverage and DRY) to be present; otherwise exits with error.

### Notes

- **Traceability** rating is based on requirement coverage and orphan annotations.
- **DRY** rating considers duplicate types (FAIL), duplicate constants/blocks (PARTIAL), or none (PASS).
- **Deterministic Enforcement** checks that the required npm scripts (`lint`, `test`, `build`, `check‑coverage`, `check:dry`) are defined.
- **Parsimony** performs basic checks on dependency count and README length.
- The report is designed to be human‑readable and can be included in pull request reviews.

### Example Output (excerpt)

```
📊 Generating SDD Report
=======================
✅ SDD report written to reports/sdd-report.md

# SDD Four‑Pillars Evaluation Report

Generated: 2026‑03‑14T05:44:02.951Z

## Summary

| Pillar | Rating | Details |
|--------|--------|---------|
| Traceability | **PARTIAL** | Implemented 5 of 33 requirements (28 unimplemented). |
| DRY | **PARTIAL** | Scanned 6 files, found 26 duplicate(s). |
| Deterministic Enforcement | **PASS** | All required deterministic checks are defined. |
| Parsimony | **PASS** | Dependencies: 3 prod, 12 dev. Tailwind CSS present (justified for styling). |
...
```

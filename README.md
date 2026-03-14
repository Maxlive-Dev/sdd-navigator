# SDD Navigator Dashboard

This is a Next.js dashboard for Specification‑Driven Development (SDD) compliance, visualizing requirement coverage, DRY violations, and deterministic enforcement.

## Deterministic Enforcement & CI/CD

The project enforces the [SDD Four Pillars](https://blog.rezvov.com/specification-driven-development-four-pillars) (Traceability, DRY, Deterministic Enforcement, Parsimony) through a set of automated checks that run in CI and local git hooks.

For more details on CI & git hooks look at [scripts/README.md](scripts/README.md).

### Reports

The pipeline generates two machine‑readable JSON reports and a human‑readable markdown report:

- `reports/coverage.json` – requirement‑to‑code traceability mapping.
- `reports/dry‑report.json` – duplicate constants, types, and code blocks.
- `reports/sdd‑report.md` – consolidated four‑pillars evaluation with a summary table and concrete violations.

The SDD report is uploaded as a workflow artifact in CI and can be reviewed in pull requests.

## Scripts

All utility scripts are located in `scripts/` and are also documented in detail in [scripts/README.md](scripts/README.md). The main scripts are:

- `check‑coverage.ts` – validates traceability between requirements and source code annotations.
- `check‑dry.ts` – detects DRY violations (duplicate constants, types, functions, code blocks).
- `generate‑sdd‑report.ts` – produces the four‑pillars evaluation report.

Run them via npm scripts:

```bash
npm run check-coverage
npm run check:dry
npm run report:sdd
```

## Deployment

This project is deployed on Vercel and available at [https://sdd-navigator-chi.vercel.app](https://sdd-navigator-chi.vercel.app).

Environment variables `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_USE_MOCK` are configured for production.

*[Requirements.yaml](requirements.yaml) reference: [@req SCD-DEPLOY-004]*

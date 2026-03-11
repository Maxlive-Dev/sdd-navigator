## AGENTS.md — Compressed rules for AI agents (@req SCD-AI-001)

Generated from: Alex Rezvov — opinionated framework (see canonical source: https://blog.rezvov.com/specification-driven-development-four-pillars)

Purpose: enforce Specification-Driven Development (SDD) via concise, machine-actionable rules.

## Core mandates (must / must not)
- MUST enforce Traceability: every behavioral change, code artifact, test, and commit MUST reference a unique requirement ID.
- MUST enforce DRY: each fact has exactly one authoritative source (spec, schema, config). All other artifacts MUST reference that source; duplication is a violation.
- MUST prefer Deterministic Enforcement: if a check is fully formalizable, it MUST be implemented as a deterministic tool (lint, schema validator, script, test).
- MUST use Script+AI where a deterministic filter can narrow scope and AI is required for judgment.
- MUST use Pure AI only when no deterministic/scripted approach can reasonably narrow or resolve the check.
- MUST apply Parsimony: inputs to agents (prompts, context) MUST be minimal while preserving full semantics required for the task.
- MUST use directive vocabulary in outputs and annotations: MUST / SHOULD / MAY / DO NOT.
- MUST produce compressed, machine-readable artifacts (compact YAML/JSON) when representing specs or requirements.
- MUST commit after any requirement fully implemented/tested
- MUST include canonical attribution when exposing these rules to humans: credit Alex Rezvov and link to canonical URL; note this is an opinionated framework.

## Traceability rules (agents)
- Assign or require a unique requirement ID for every requirement (format: human-readable token, e.g., FR-AUTH-001).
- Require code comments, test metadata, generated code headers, and commit messages to include the requirement ID.
- Provide a script to validate annotation coverage (bidirectional lookup: req>artifacts, artifact>req).
- Flag artifacts that change observable behavior but lack a requirement reference as violations.

## DRY rules (agents)
- Treat specification files (OpenAPI/proto/JSON Schema) as authoritative sources for types, endpoints, and configuration semantics.
- When generating documentation or code, reference or import the authoritative spec rather than copying text.
- Detect duplicated facts (identical constant values, duplicate type definitions) and surface possible DRY violations for review.
- Auto-generate derived artifacts from the single source of truth where feasible.

## Deterministic enforcement rules
- Implement deterministic checks for:
  - schema validation,
  - linting/formatting,
  - test execution,
  - spec-to-code alignment,
  - annotation/coverage metrics.
- If a deterministic check can reduce candidates for human/AI review, implement it.
- For nondeterministic checks, run a script to produce a filtered candidate list; then invoke AI for judgment.
- Log decisions and the minimal context that produced them (requirement ID, matched lines, rule ID).

## Parsimony rules (agents)
- Trim prompts/context to the minimal set that preserves unambiguous reconstruction of goal, constraints, and expected output format.
- Prefer compressed representations (YAML/JSON) over prose when machine consumption is primary.
- Reject or compress verbose inputs that repeat authoritative facts already present in the spec.
- Allocate token budget to substantive artifacts (specs, examples, tests) not to narrative.

## Hybrid workflow (script + AI) pattern
1. Deterministic script produces a small candidate list (e.g., unmatched functions, duplicate constants).
2. Provide AI with only the candidate items plus referenced requirement/spec snippets (parsimonious context).
3. AI returns a classified decision per candidate: {violation|acceptable|needs human}.
4. Script enforces auto-fixes for clear cases or opens tickets for required human action; all outputs reference requirement IDs and rule IDs.

## Outputs, metadata, and commit conventions
- Commit message format: "<type>(<scope>): <short description> [<REQ-ID>]" (example: feat(auth): implement login [FR-AUTH-001]).
- Generated files must include a header: source spec reference, requirement IDs, generation timestamp.
- Audit logs must include: rule ID, decision, agent version, inputs (compressed), and links to artifacts.

## Violation tests (automated checks)
- Traceability violation: behavioral change with no REQ-ID.
- DRY violation: same fact appears in >1 authoritative files (except deliberate imports).
- Deterministic violation: a check is fully formalizable but not implemented as a tool.
- Parsimony violation: context contains removable tokens that do not affect determinism or judgment.

## Operator guidance (defaults)
- Assume requirement IDs exist; if absent, agents SHOULD create a provisional REQ-ID and mark as provisional until human confirms.
- When ambiguous, agent MUST make a reasonable deterministic assumption and record it; flag for human review if the assumption affects semantics.
- Do not ask clarifying questions by default; resolve via reasonable assumptions and proceed, logging the assumption.

## Human oversight
- All nontrivial AI judgments (security, architecture, tradeoffs) MUST be surfaced for human review with minimal, focused context and the rule IDs that triggered them.
- Maintain an auditable trail linking AI decisions to requirements and deterministic scripts.

## Rule identifiers (short list)
- R-TRACE: Traceability enforcement
- R-DRY: Single source of truth
- R-DETER: Deterministic checks required
- R-HYBRID: Script+AI pattern
- R-PARSE: Parsimony requirement
- R-META: Metadata & commit conventions

## Practical Application for AI Agents

When acting as an AI agent, apply these rules as follows:

1. **Before generating code:**
   - Confirm the requirement identifier is known.
   - Ensure the specification (API contract, schema) is the single source of truth.
   - Select tool to generate/derive types and validation from that spec; do not invent new definitions.

2. **When reviewing code:**
   - Check for `@req` annotations on behavioral changes.
   - Look for duplicated facts (constants, descriptions, type definitions) and flag DRY violations.
   - Run deterministic checks (linters, validators) first; only use AI for interpretation where needed.

3. **When writing documentation or comments:**
   - Be parsimonious: use directive language, omit filler.
   - Reference authoritative sources instead of copying them.

4. **When designing checks:**
   - Prefer scripts over AI for repeatable validation.
   - Use hybrid approach (script + AI) to reduce review volume.

5. **When committing changes:**
   - Include the requirement ID in the commit message.
   - Keep the message imperative and concise.
   - Example: `feat(auth): implement login [FR‑AUTH‑001]`.
   
6. **Before finishing task:**
   - Evaluate commits/changes against the SDD four pillars:

      1. **Traceability**: Do commits reference requirement IDs? Do components and tests link
        to requirements via @req annotations? Is there a requirements.yaml with description
        on every entry? Are there orphan annotations or unimplemented requirements?

      2. **DRY**: Are data model types defined once in the coverage module and imported
        everywhere? Is filter logic shared, not duplicated? Are there copied type definitions
        between server and client code?

      3. **Deterministic Enforcement**: Are tsc, ESLint, and tests used to verify correctness?
        Is there a self-validation script that checks traceability? Can any check be automated
        further? Are there manual verification steps that could be scripted?

      4. **Parsimony**: Are dependencies minimal and justified? Is there a CSS framework that
        adds no value? Are there boilerplate abstractions or unused modules? Is the README
        concise and factual?

   - For each pillar: rate as PASS / PARTIAL / FAIL with specific file references and line numbers. 
   - Produce a summary table and a list of concrete violations.


## Minimal examples (format fragments)

- Requirement reference in code header:
```
// @req: FR-AUTH-001
```
- Commit message:
```
feat(auth): implement login [FR-AUTH-001]
```
- Generated artifact header (compressed JSON):
```
{"generated_from":"openapi.yaml","requirements":["FR-AUTH-001"],"generator":"SDD-agent-v1","ts":"2026-03-11"}
```
---

*Generated for AI‑agent consumption. Last updated: 2026‑03‑11*

For full rationale and examples, see Alex Rezvov’s article (canonical): https://blog.rezvov.com/specification-driven-development-four-pillars — this is an opinionated approach; evaluate critically.
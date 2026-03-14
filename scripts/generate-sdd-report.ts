#!/usr/bin/env node

/**
 * SDD Report Generator.
 * Consolidates coverage and DRY reports into a comprehensive SDD four‑pillars evaluation.
 *
 * @req SCD-DEPLOY-002 (implied)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const currentFilePath = fileURLToPath(import.meta.url);
const scriptPath = process.argv[1];

const normalizedCurrent = path.normalize(currentFilePath);
const normalizedScript = path.normalize(scriptPath);

const isMainModule = normalizedCurrent === normalizedScript;

// ----------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------
const REPORT_DIR = path.join(__dirname, '..', 'reports');
const COVERAGE_JSON = path.join(REPORT_DIR, 'coverage.json');
const DRY_JSON = path.join(REPORT_DIR, 'dry-report.json');
const SDD_REPORT_MD = path.join(REPORT_DIR, 'sdd-report.md');

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
interface CoverageReport {
  generatedAt: string;
  totalRequirements: number;
  implementedCount: number;
  unimplementedCount: number;
  orphanCount: number;
  unimplemented: string[];
  orphans: Array<{ reqId: string; file: string; line: number; snippet: string }>;
  coverage: Array<{
    reqId: string;
    annotationCount: number;
    annotations: Array<{ file: string; line: number; snippet: string }>;
  }>;
}

interface DryReport {
  generatedAt: string;
  scannedFiles: number;
  duplicateCount: number;
  duplicates: Array<{
    type: string;
    name: string;
    locations: Array<{ file: string; line: number }>;
    extra?: unknown;
  }>;
}

type PillarRating = 'PASS' | 'PARTIAL' | 'FAIL';

interface PillarEvaluation {
  pillar: string;
  rating: PillarRating;
  details: string[];
  violations: Array<{ file?: string; line?: number; description: string }>;
}

// ----------------------------------------------------------------------
// Load reports
// ----------------------------------------------------------------------
function loadCoverage(): CoverageReport | null {
  try {
    const content = fs.readFileSync(COVERAGE_JSON, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to load ${COVERAGE_JSON}:`, message);
    return null;
  }
}

function loadDry(): DryReport | null {
  try {
    const content = fs.readFileSync(DRY_JSON, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to load ${DRY_JSON}:`, message);
    return null;
  }
}

// ----------------------------------------------------------------------
// Pillar evaluations
// ----------------------------------------------------------------------
function evaluateTraceability(coverage: CoverageReport): PillarEvaluation {
  const violations: Array<{ file?: string; line?: number; description: string }> = [];
  const details: string[] = [];

  // Check requirement IDs in commits? (cannot be determined from reports)
  // Check components and tests link to requirements via @req annotations
  const unimplemented = coverage.unimplementedCount;
  const total = coverage.totalRequirements;
  const implemented = coverage.implementedCount;

  details.push(`Implemented ${implemented} of ${total} requirements (${unimplemented} unimplemented).`);
  if (coverage.orphanCount > 0) {
    violations.push(...coverage.orphans.map(o => ({
      file: o.file,
      line: o.line,
      description: `Orphan annotation referencing unknown requirement ID: ${o.reqId}`,
    })));
    details.push(`Found ${coverage.orphanCount} orphan annotation(s).`);
  }

  if (unimplemented === 0 && coverage.orphanCount === 0) {
    return {
      pillar: 'Traceability',
      rating: 'PASS',
      details,
      violations,
    };
  } else if (unimplemented > 0 && unimplemented < total) {
    return {
      pillar: 'Traceability',
      rating: 'PARTIAL',
      details,
      violations: [...violations, ...coverage.unimplemented.map(id => ({
        description: `Requirement ${id} lacks annotations.`,
      }))],
    };
  } else {
    return {
      pillar: 'Traceability',
      rating: 'FAIL',
      details,
      violations: [...violations, ...coverage.unimplemented.map(id => ({
        description: `Requirement ${id} lacks annotations.`,
      }))],
    };
  }
}

function evaluateDry(dry: DryReport): PillarEvaluation {
  const violations: Array<{ file?: string; line?: number; description: string }> = [];
  const details: string[] = [];

  const typeDuplicates = dry.duplicates.filter(d => d.type === 'type' || d.type === 'interface');
  const constantDuplicates = dry.duplicates.filter(d => d.type === 'constant');
  const functionDuplicates = dry.duplicates.filter(d => d.type === 'function');
  const blockDuplicates = dry.duplicates.filter(d => d.type === 'code-block');

  details.push(`Scanned ${dry.scannedFiles} files, found ${dry.duplicateCount} duplicate(s).`);

  if (typeDuplicates.length > 0) {
    typeDuplicates.forEach(dup => {
      dup.locations.forEach(loc => {
        violations.push({
          file: loc.file,
          line: loc.line,
          description: `Duplicate type/interface "${dup.name}"`,
        });
      });
    });
  }

  if (constantDuplicates.length > 0) {
    constantDuplicates.forEach(dup => {
      dup.locations.forEach(loc => {
        violations.push({
          file: loc.file,
          line: loc.line,
          description: `Duplicate constant "${dup.name}" with same value`,
        });
      });
    });
  }

  if (functionDuplicates.length > 0) {
    functionDuplicates.forEach(dup => {
      dup.locations.forEach(loc => {
        violations.push({
          file: loc.file,
          line: loc.line,
          description: `Duplicate function "${dup.name}" with same value`,
        });
      });
    });
  }

  if (blockDuplicates.length > 0) {
    blockDuplicates.forEach(dup => {
      dup.locations.forEach(loc => {
        violations.push({
          file: loc.file,
          line: loc.line,
          description: `Duplicate code block "${dup.name}" (copy‑paste)`,
        });
      });
    });
  }

  if (typeDuplicates.length > 0) {
    return {
      pillar: 'DRY',
      rating: 'FAIL',
      details,
      violations,
    };
  } else if (constantDuplicates.length > 0 || functionDuplicates.length > 0 || blockDuplicates.length > 0) {
    return {
      pillar: 'DRY',
      rating: 'PARTIAL',
      details,
      violations,
    };
  } else {
    return {
      pillar: 'DRY',
      rating: 'PASS',
      details,
      violations,
    };
  }
}

function evaluateDeterministicEnforcement(): PillarEvaluation {
  // This pillar is about using tsc, ESLint, tests, self‑validation scripts, etc.
  // Since we are running these scripts as part of CI, we assume they are in place.
  // We can check if package.json scripts include lint, test, build, check‑coverage, check:dry.
  // For simplicity, we'll just assume PASS if the scripts exist (we can't verify runtime).
  const violations: Array<{ file?: string; line?: number; description: string }> = [];
  const details: string[] = [];

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const scripts = packageJson.scripts || {};
    const required = ['lint', 'test', 'build', 'check-coverage', 'check:dry'];
    const missing = required.filter(name => !scripts[name]);
    if (missing.length > 0) {
      violations.push({ description: `Missing script(s) in package.json: ${missing.join(', ')}` });
      details.push(`Missing scripts: ${missing.join(', ')}`);
    } else {
      details.push('All required deterministic checks (lint, test, build, coverage, DRY) are defined.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    violations.push({ description: `Cannot read package.json: ${message}` });
  }

  if (violations.length === 0) {
    return {
      pillar: 'Deterministic Enforcement',
      rating: 'PASS',
      details,
      violations,
    };
  } else {
    return {
      pillar: 'Deterministic Enforcement',
      rating: 'PARTIAL',
      details,
      violations,
    };
  }
}

function evaluateParsimony(): PillarEvaluation {
  // Check dependencies minimal, CSS framework value, boilerplate abstractions, README conciseness.
  // This is subjective; we'll do a basic check.
  const violations: Array<{ file?: string; line?: number; description: string }> = [];
  const details: string[] = [];

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const deps = Object.keys(packageJson.dependencies || {}).length;
    const devDeps = Object.keys(packageJson.devDependencies || {}).length;
    details.push(`Dependencies: ${deps} prod, ${devDeps} dev.`);

    // Check for Tailwind CSS (expected, not a violation)
    if (packageJson.devDependencies?.['tailwindcss']) {
      details.push('Tailwind CSS present (justified for styling).');
    }

    // Check for unused modules? Hard to determine.
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    violations.push({ description: `Cannot read package.json: ${message}` });
  }

  // Check README length (optional)
  const readmePath = path.join(__dirname, '..', 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf8');
    const lines = readme.split('\n').length;
    if (lines > 200) {
      violations.push({ description: 'README is lengthy (>200 lines), consider making it more concise.' });
    }
  }

  if (violations.length === 0) {
    return {
      pillar: 'Parsimony',
      rating: 'PASS',
      details,
      violations,
    };
  } else {
    return {
      pillar: 'Parsimony',
      rating: 'PARTIAL',
      details,
      violations,
    };
  }
}

// ----------------------------------------------------------------------
// Report generation
// ----------------------------------------------------------------------
function generateMarkdown(evaluations: PillarEvaluation[]): string {
  const now = new Date().toISOString();
  let md = `# SDD Four‑Pillars Evaluation Report\n\n`;
  md += `Generated: ${now}\n\n`;
  md += `## Summary\n\n`;

  const table = `| Pillar | Rating | Details |\n|--------|--------|---------|\n`;
  md += table;
  evaluations.forEach(eval_ => {
    md += `| ${eval_.pillar} | **${eval_.rating}** | ${eval_.details.join(' ')} |\n`;
  });

  md += `\n## Detailed Findings\n\n`;
  evaluations.forEach(eval_ => {
    md += `### ${eval_.pillar} (${eval_.rating})\n\n`;
    if (eval_.details.length > 0) {
      md += eval_.details.map(d => `- ${d}`).join('\n') + '\n\n';
    }
    if (eval_.violations.length > 0) {
      md += `#### Violations\n\n`;
      eval_.violations.forEach(v => {
        const loc = v.file ? `**${v.file}${v.line ? `:${v.line}` : ''}**` : '';
        md += `- ${loc} ${v.description}\n`;
      });
      md += '\n';
    } else {
      md += `No violations.\n\n`;
    }
  });

  md += `---\n`;
  md += `*Report generated by \`scripts/generate-sdd-report.ts\`.*\n`;
  return md;
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------
function main() {
  console.log('📊 Generating SDD Report');
  console.log('=======================');

  const coverage = loadCoverage();
  const dry = loadDry();

  if (!coverage || !dry) {
    console.error('Missing required reports. Run check‑coverage and check‑dry first.');
    process.exit(1);
  }

  const evaluations = [
    evaluateTraceability(coverage),
    evaluateDry(dry),
    evaluateDeterministicEnforcement(),
    evaluateParsimony(),
  ];

  const markdown = generateMarkdown(evaluations);

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  fs.writeFileSync(SDD_REPORT_MD, markdown, 'utf8');
  console.log(`✅ SDD report written to ${SDD_REPORT_MD}`);

  // Print summary
  console.log('\n' + markdown.split('\n').slice(0, 15).join('\n'));
  console.log('\n... (full report saved)');
}

if (isMainModule) {
  main();
}
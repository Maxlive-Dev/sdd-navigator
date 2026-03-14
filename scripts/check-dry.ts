#!/usr/bin/env node

/**
 * DRY violation checker for SDD Navigator.
 * Scans for duplicate type definitions, constant values, and copied logic.
 *
 * @req SCD-DEPLOY-002 (implied)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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
const SOURCE_DIRS = ['app', 'components', 'lib', 'scripts'];
const EXCLUDED_DIRS = ['node_modules', '.next', 'out', 'build', 'coverage', '.git'];
const ALLOWED_EXT = ['.ts', '.tsx', '.mjs', '.cjs'];
const REPORT_DIR = path.join(__dirname, '..', 'reports');
const REPORT_JSON = path.join(REPORT_DIR, 'dry-report.json');
const DUPLICATE_BLOCK_SIZE = 5; // lines

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
interface Duplicate {
  type: 'constant' | 'type' | 'interface' | 'function' | 'code-block';
  name: string;
  locations: Array<{ file: string; line: number }>;
  extra?: { value?: string; hash?: string };
}

// ----------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------
function* walkFiles(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry.name)) {
        continue;
      }
      yield* walkFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function shouldProcessFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

// Simple regex patterns (naive but works for basic detection)
const CONSTANT_REGEX = /(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*([^;]+)/g;
const TYPE_REGEX = /(?:type|interface)\s+([A-Z][A-Za-z0-9]*)\s*(?:=|\{)/g;
const FUNCTION_REGEX = /function\s+([A-Za-z0-9_]+)\s*\(/g;

function extractConstants(content: string) {
  const matches = [...content.matchAll(CONSTANT_REGEX)];
  return matches.map(match => ({
    name: match[1],
    value: match[2].trim(),
    line: getLineNumber(content, match.index),
  }));
}

function extractTypes(content: string) {
  const matches = [...content.matchAll(TYPE_REGEX)];
  return matches.map(match => ({
    name: match[1],
    line: getLineNumber(content, match.index),
  }));
}

function extractFunctions(content: string) {
  const matches = [...content.matchAll(FUNCTION_REGEX)];
  return matches.map(match => ({
    name: match[1],
    line: getLineNumber(content, match.index),
  }));
}

function getLineNumber(content: string, index: number | undefined): number {
  if (index === undefined) return 1;
  return content.substring(0, index).split('\n').length;
}

// ----------------------------------------------------------------------
// Duplicate code block detection
// ----------------------------------------------------------------------
function normalizeLine(line: string): string {
  // Trim whitespace, remove trailing comments (simple)
  return line.trim().replace(/\/\/.*$/, '').replace(/\/\*.*\*\//, '');
}

function* slidingWindow(lines: string[], windowSize: number): Generator<{ start: number; block: string[] }> {
  for (let i = 0; i <= lines.length - windowSize; i++) {
    yield { start: i, block: lines.slice(i, i + windowSize) };
  }
}

function findDuplicateBlocks(files: Array<{ path: string; content: string }>): Duplicate[] {
  const blockMap = new Map<string, Array<{ file: string; line: number }>>();
  const duplicates: Duplicate[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    const normalizedLines = lines.map(normalizeLine).filter(line => line.length > 0);
    for (const { start, block } of slidingWindow(normalizedLines, DUPLICATE_BLOCK_SIZE)) {
      const blockText = block.join('\n');
      const hash = crypto.createHash('md5').update(blockText).digest('hex');
      const location = { file: file.path, line: start + 1 };
      if (!blockMap.has(hash)) {
        blockMap.set(hash, []);
      }
      blockMap.get(hash)!.push(location);
    }
  }

  for (const [hash, locations] of blockMap) {
    if (locations.length > 1) {
      // Ensure duplicates are across different files or distinct locations
      const uniqueFiles = new Set(locations.map(loc => loc.file));
      if (uniqueFiles.size > 1 || locations.length > 2) {
        duplicates.push({
          type: 'code-block',
          name: `block-${hash.substring(0, 8)}`,
          locations,
          extra: { hash },
        });
      }
    }
  }

  return duplicates;
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------
function main() {
  console.log('🔍 SDD Navigator DRY Check');
  console.log('===========================');

  const constants = new Map<string, Array<{ file: string; line: number; value: string }>>();
  const types = new Map<string, Array<{ file: string; line: number }>>();
  const functions = new Map<string, Array<{ file: string; line: number }>>();
  const fileContents: Array<{ path: string; content: string }> = [];

  let scannedFiles = 0;

  for (const dir of SOURCE_DIRS) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      continue;
    }
    for (const filePath of walkFiles(dirPath)) {
      if (!shouldProcessFile(filePath)) {
        continue;
      }
      scannedFiles++;
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      fileContents.push({ path: relativePath, content });

      // Extract constants
      extractConstants(content).forEach(({ name, value, line }) => {
        const key = `${name}:${value}`;
        if (!constants.has(key)) {
          constants.set(key, []);
        }
        constants.get(key)!.push({ file: relativePath, line, value });
      });

      // Extract types
      extractTypes(content).forEach(({ name, line }) => {
        if (!types.has(name)) {
          types.set(name, []);
        }
        types.get(name)!.push({ file: relativePath, line });
      });

      // Extract functions
      extractFunctions(content).forEach(({ name, line }) => {
        if (!functions.has(name)) {
          functions.set(name, []);
        }
        functions.get(name)!.push({ file: relativePath, line });
      });
    }
  }

  console.log(`Scanned ${scannedFiles} file(s)`);

  // Detect duplicates
  const duplicates: Duplicate[] = [];

  // Constants with same name and value across files
  for (const [key, locations] of constants) {
    if (locations.length > 1) {
      const [name, value] = key.split(':');
      duplicates.push({
        type: 'constant',
        name,
        locations: locations.map(loc => ({ file: loc.file, line: loc.line })),
        extra: { value },
      });
    }
  }

  // Types defined in multiple places
  for (const [name, locations] of types) {
    if (locations.length > 1) {
      duplicates.push({
        type: 'type',
        name,
        locations,
      });
    }
  }

  // Functions defined in multiple places (could be intentional overloading, but we flag)
  for (const [name, locations] of functions) {
    if (locations.length > 1) {
      duplicates.push({
        type: 'function',
        name,
        locations,
      });
    }
  }

  // Duplicate code blocks
  const blockDuplicates = findDuplicateBlocks(fileContents);
  duplicates.push(...blockDuplicates);

  // ------------------------------------------------------------------
  // Generate JSON report
  // ------------------------------------------------------------------
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  const report = {
    generatedAt: new Date().toISOString(),
    scannedFiles,
    duplicateCount: duplicates.length,
    duplicates: duplicates.map(dup => ({
      type: dup.type,
      name: dup.name,
      locations: dup.locations,
      extra: dup.extra,
    })),
  };
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
  console.log(`\n📁 JSON report written to ${REPORT_JSON}`);

  // ------------------------------------------------------------------
  // Output human-readable report
  // ------------------------------------------------------------------
  if (duplicates.length === 0) {
    console.log('\n✅ No DRY violations found.');
    process.exit(0);
  }

  console.log(`\n⚠️  Found ${duplicates.length} potential DRY violation(s):`);
  duplicates.forEach(dup => {
    console.log(`\n${dup.type.toUpperCase()} "${dup.name}" appears in:`);
    dup.locations.forEach(loc => {
      console.log(`  - ${loc.file}:${loc.line}`);
    });
    if (dup.extra?.value) {
      console.log(`value: ${dup.extra.value}`);
    }
  });

  // Determine severity: if there are duplicate types, that's a serious violation.
  const hasTypeDuplicates = duplicates.some(d => d.type === 'type' || d.type === 'interface');
  const hasBlockDuplicates = duplicates.some(d => d.type === 'code-block');
  if (hasTypeDuplicates) {
    console.log('\n❌ DRY check failed: duplicate type definitions.');
    process.exit(1);
  } else if (hasBlockDuplicates) {
    console.log('\n⚠️  DRY check warnings: duplicate code blocks detected (non‑blocking).');
    process.exit(0); // treat as warning for now
  } else {
    console.log('\n⚠️  DRY check warnings (non‑blocking).');
    process.exit(0);
  }
}

console.log('DEBUG: import.meta.url =', import.meta.url);
console.log('DEBUG: process.argv[1] =', process.argv[1]);
console.log('DEBUG: isMainModule =', isMainModule);

if (isMainModule) {
  main();
}
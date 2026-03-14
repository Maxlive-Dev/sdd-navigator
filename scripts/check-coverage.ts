#!/usr/bin/env node

/**
 * Self-validation script for SDD Navigator.
 * Parses requirements.yaml and scans source files for @req SCD-XXX-NNN annotations.
 * Reports coverage and exits with appropriate code.
 *
 * @req SCD-DEPLOY-002
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
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
const REQUIREMENTS_FILE = path.join(__dirname, '..', 'requirements.yaml');
const SOURCE_DIRS = ['app', 'components', 'lib', 'scripts'];
const EXCLUDED_DIRS = ['node_modules', '.next', 'out', 'build', 'coverage', '.git'];
const REPORT_DIR = path.join(__dirname, '..', 'reports');
const REPORT_JSON = path.join(REPORT_DIR, 'coverage.json');

const VALID_REQ_ID_REGEX = /^SCD-[A-Z]+-\d{3}$/;
const ANNOTATION_REGEX = /@req\s*:?\s*([A-Z0-9\-,\s]+)/gi;

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
interface Annotation {
  reqId: string;
  file: string;
  line: number;
  snippet: string;
}

interface RequirementItem {
  id: string;
  title: string;
  description: string;
}

// ----------------------------------------------------------------------
// 1. Load requirements
// ----------------------------------------------------------------------
function loadRequirements(): Set<string> {
  const content = fs.readFileSync(REQUIREMENTS_FILE, 'utf8');
  const items = yaml.load(content) as RequirementItem[];
  if (!Array.isArray(items)) {
    throw new Error('requirements.yaml must be an array');
  }
  const reqIds = items.map(item => item.id).filter(Boolean);
  const requirementSet = new Set(reqIds);
  // Validate format
  for (const id of reqIds) {
    if (!VALID_REQ_ID_REGEX.test(id)) {
      console.warn(`Warning: requirement ID "${id}" does not match expected format SCD-XXX-NNN`);
    }
  }
  return requirementSet;
}

// ----------------------------------------------------------------------
// 2. Scan files recursively
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
  const allowedExt = ['.ts', '.tsx', '.mjs', '.cjs'];
  return allowedExt.includes(ext);
}

function extractAnnotations(filePath: string): Annotation[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const annotations: Annotation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    while ((match = ANNOTATION_REGEX.exec(line)) !== null) {
      const idsText = match[1];
      // Split by commas and trim
      const ids = idsText.split(',').map(id => id.trim()).filter(id => id.length > 0);
      for (const id of ids) {
        if (VALID_REQ_ID_REGEX.test(id)) {
          annotations.push({
            reqId: id,
            file: path.relative(process.cwd(), filePath),
            line: i + 1,
            snippet: line.trim().substring(0, 100)
          });
        } else {
          console.warn(`Warning: invalid requirement ID "${id}" in ${filePath}:${i + 1}`);
        }
      }
    }
    // Reset regex lastIndex for next line
    ANNOTATION_REGEX.lastIndex = 0;
  }
  return annotations;
}

// ----------------------------------------------------------------------
// 3. Main
// ----------------------------------------------------------------------
function main() {
  console.log('🔍 SDD Navigator Coverage Check');
  console.log('================================');

  // Load requirements
  let requirementSet: Set<string>;
  try {
    requirementSet = loadRequirements();
  } catch (err: unknown) {
    console.error(`Failed to load requirements: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  console.log(`Loaded ${requirementSet.size} requirement(s) from ${REQUIREMENTS_FILE}`);

  // Collect annotations
  const allAnnotations: Annotation[] = [];
  const scannedFiles: string[] = [];

  // Scan source directories
  for (const dir of SOURCE_DIRS) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      continue;
    }
    for (const filePath of walkFiles(dirPath)) {
      if (shouldProcessFile(filePath)) {
        scannedFiles.push(filePath);
        const annotations = extractAnnotations(filePath);
        allAnnotations.push(...annotations);
      }
    }
  }

  console.log(`Scanned ${scannedFiles.length} file(s)`);
  console.log(`Found ${allAnnotations.length} annotation(s)`);

  // Map requirement -> annotations
  const coverage = new Map<string, Annotation[]>();
  for (const reqId of requirementSet) {
    coverage.set(reqId, []);
  }
  for (const ann of allAnnotations) {
    if (coverage.has(ann.reqId)) {
      coverage.get(ann.reqId)!.push(ann);
    } else {
      // Orphan annotation
      if (!coverage.has('__orphans')) {
        coverage.set('__orphans', []);
      }
      coverage.get('__orphans')!.push(ann);
    }
  }

  // Determine unimplemented requirements
  const unimplemented: string[] = [];
  for (const [reqId, anns] of coverage) {
    if (reqId !== '__orphans' && anns.length === 0) {
      unimplemented.push(reqId);
    }
  }

  // Orphan annotations (those not in requirementSet)
  const orphans = coverage.get('__orphans') || [];

  // ------------------------------------------------------------------
  // 4. Output human-readable report
  // ------------------------------------------------------------------
  console.log('\n📊 Coverage Report');
  console.log('-----------------');
  console.log(`Total requirements: ${requirementSet.size}`);
  console.log(`Implemented: ${requirementSet.size - unimplemented.length}`);
  console.log(`Unimplemented: ${unimplemented.length}`);
  console.log(`Orphan annotations: ${orphans.length}`);

  if (unimplemented.length > 0) {
    console.log('\n❌ Unimplemented requirements:');
    unimplemented.forEach(id => console.log(`  - ${id}`));
  } else {
    console.log('\n✅ All requirements have at least one annotation.');
  }

  if (orphans.length > 0) {
    console.log('\n⚠️  Orphan annotations (reference unknown requirement IDs):');
    orphans.forEach(ann => {
      console.log(`  - ${ann.reqId} in ${ann.file}:${ann.line} (${ann.snippet})`);
    });
  }

  // ------------------------------------------------------------------
  // 5. Generate JSON report (optional)
  // ------------------------------------------------------------------
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  const report = {
    generatedAt: new Date().toISOString(),
    totalRequirements: requirementSet.size,
    implementedCount: requirementSet.size - unimplemented.length,
    unimplementedCount: unimplemented.length,
    orphanCount: orphans.length,
    unimplemented,
    orphans: orphans.map(ann => ({
      reqId: ann.reqId,
      file: ann.file,
      line: ann.line,
      snippet: ann.snippet
    })),
    coverage: Array.from(coverage.entries())
      .filter(([reqId]) => reqId !== '__orphans')
      .map(([reqId, anns]) => ({
        reqId,
        annotationCount: anns.length,
        annotations: anns.map(ann => ({
          file: ann.file,
          line: ann.line,
          snippet: ann.snippet
        }))
      }))
  };
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
  console.log(`\n📁 JSON report written to ${REPORT_JSON}`);

  // ------------------------------------------------------------------
  // 6. Exit code
  // ------------------------------------------------------------------
  const success = unimplemented.length === 0;
  if (!success) {
    console.log('\n❌ Coverage check failed: some requirements lack annotations.');
    process.exit(1);
  } else {
    console.log('\n✅ Coverage check passed.');
    process.exit(0);
  }
}

if (isMainModule) {
  main();
} else {
  console.log('Script is not running as main module — skipping execution');
}

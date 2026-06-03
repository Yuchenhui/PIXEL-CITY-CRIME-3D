#!/usr/bin/env node

/**
 * compile-story.js
 *
 * Compiles .ink files from story-src/ to .json in public/story/
 * using inkjs's built-in Compiler.
 *
 * Usage:
 *   node tools/compile-story.js
 *   npm run compile-story
 */

const { Compiler } = require('inkjs/full');
const fs = require('fs');
const path = require('path');

const inkDir = path.join(__dirname, '..', 'story-src');
const outDir = path.join(__dirname, '..', 'public', 'story');

// Ensure directories exist
if (!fs.existsSync(inkDir)) {
  console.error(`Error: story-src/ directory not found at ${inkDir}`);
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Collect .ink files
const files = fs.readdirSync(inkDir).filter(f => f.endsWith('.ink'));

if (files.length === 0) {
  console.warn('No .ink files found in story-src/');
  process.exit(0);
}

let successCount = 0;
let errorCount = 0;

for (const file of files) {
  const inkPath = path.join(inkDir, file);
  const jsonName = file.replace('.ink', '.json');
  const jsonPath = path.join(outDir, jsonName);

  try {
    const content = fs.readFileSync(inkPath, 'utf-8');
    const compiler = new Compiler(content);
    const story = compiler.Compile();
    const json = story.ToJson();

    fs.writeFileSync(jsonPath, json, 'utf-8');
    console.log(`  ✓ ${file} → ${jsonName}`);
    successCount++;
  } catch (err) {
    console.error(`  ✗ ${file}: ${err.message}`);
    errorCount++;
  }
}

console.log(`\nCompiled ${successCount}/${files.length} stories.`);
if (errorCount > 0) {
  console.error(`${errorCount} file(s) failed to compile.`);
  process.exit(1);
}

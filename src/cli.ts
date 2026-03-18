#!/usr/bin/env node

import fs from 'fs';
import { processPost, MODELS } from './rewrite.js';

function usage(): never {
  console.error(`Usage: myvoice <file> [options]

Options:
  -o <path>      Write output to file
  --in-place     Overwrite the input file
  --model <name> Model to use: sonnet (default), opus
  -              Read from stdin

Examples:
  myvoice post.md                   # Output to stdout
  myvoice post.md -o rewritten.md   # Write to file
  myvoice post.md --in-place        # Overwrite original
  cat post.md | myvoice -           # Read from stdin`);
  process.exit(1);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    usage();
  }

  // Parse flags
  const inPlace = args.includes('--in-place');
  const modelFlag = args.includes('--model');
  const modelName = modelFlag ? args[args.indexOf('--model') + 1] : 'sonnet';
  const model = MODELS[modelName] || MODELS.sonnet;

  let outputPath: string | null = null;
  if (args.includes('-o')) {
    const oIdx = args.indexOf('-o');
    outputPath = args[oIdx + 1];
    if (!outputPath) {
      console.error('Error: -o requires a path argument');
      process.exit(1);
    }
  }

  // Find the input file (first arg that isn't a flag or flag value)
  const flagsWithValues = new Set(['-o', '--model']);
  const flags = new Set(['--in-place', '--help', '-h']);
  let inputFile: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (flagsWithValues.has(arg)) {
      i++; // skip the value
      continue;
    }
    if (flags.has(arg)) continue;
    inputFile = arg;
    break;
  }

  if (!inputFile) {
    usage();
  }

  // Read input
  let content: string;
  if (inputFile === '-') {
    content = await readStdin();
  } else {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: file not found: ${inputFile}`);
      process.exit(1);
    }
    content = fs.readFileSync(inputFile, 'utf8');
  }

  if (!content.trim()) {
    console.error('Error: input is empty');
    process.exit(1);
  }

  // Process
  process.stderr.write(`Rewriting with ${modelName}...\n`);
  const { text, result } = await processPost(content, model);

  if (result.warnings.length > 0) {
    process.stderr.write(`Warnings: ${result.warnings.join('; ')}\n`);
  }

  if (!result.passed) {
    process.stderr.write('Validation failed after retries. Output may have issues.\n');
  }

  // Output
  if (inPlace && inputFile !== '-') {
    fs.writeFileSync(inputFile, text);
    process.stderr.write(`Wrote ${inputFile}\n`);
  } else if (outputPath) {
    fs.writeFileSync(outputPath, text);
    process.stderr.write(`Wrote ${outputPath}\n`);
  } else {
    process.stdout.write(text);
  }
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});

#!/usr/bin/env node
// scripts/generate-icons.mjs
// =================================================================
// Rasterises icons/icon.svg → icons/icon-{16,32,48,128}.png
//
// Requires: npm install --save-dev sharp
//
// Run: node scripts/generate-icons.mjs
// =================================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const SVG_PATH  = join(ROOT, 'icons', 'icon.svg');
const SIZES     = [16, 32, 48, 128];

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';

// Check SVG exists
if (!existsSync(SVG_PATH)) {
  console.error(RED + '✗ icons/icon.svg not found' + RESET);
  process.exit(1);
}

// Check sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (_) {
  console.error(RED + '✗ sharp not installed. Run: npm install --save-dev sharp' + RESET);
  console.log(YELLOW + '  Alternatively, use any SVG → PNG tool to export at sizes: ' + SIZES.join(', ') + RESET);
  process.exit(1);
}

const svgBuffer = readFileSync(SVG_PATH);
let hadError = false;

for (const size of SIZES) {
  const outPath = join(ROOT, 'icons', `icon-${size}.png`);
  try {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(GREEN + `✓ icons/icon-${size}.png` + RESET);
  } catch (err) {
    console.error(RED + `✗ Failed to generate icon-${size}.png: ${err.message}` + RESET);
    hadError = true;
  }
}

if (hadError) {
  process.exit(1);
} else {
  console.log(GREEN + '\nAll icons generated successfully.' + RESET);
  console.log('Load the extension at chrome://extensions to verify they display correctly.');
}

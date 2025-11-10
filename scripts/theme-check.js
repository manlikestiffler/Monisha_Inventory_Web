/**
 * Theme Check Automation Tool
 * Searches for hardcoded colors and validates theme implementation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color patterns to search for
const COLOR_PATTERNS = {
  hex: /(?:#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))\b/g,
  rgb: /\brgba?\([^)]+\)/g,
  hsl: /\bhsl\(\s*\d+[, ]+\s*\d+%[, ]+\s*\d+%[^)]*\)/g,
  inlineStyleColor: /style\s*=\s*["'][^"']*(?:background|color|border|box-shadow)[^"']*["']/g,
  jsxInlineStyle: /style=\{[^}]*\}/g,
};

// Directories to scan
const SCAN_DIRS = ['src', 'components'];
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'theme-check',
  'scripts',
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'];

const results = {
  files: [],
  totalMatches: 0,
  colorsByType: {
    hex: [],
    rgb: [],
    hsl: [],
    inline: [],
  },
};

/**
 * Check if file should be excluded
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Check if file extension is valid
 */
function isValidExtension(filePath) {
  return SCAN_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (shouldExclude(filePath)) {
      return;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (isValidExtension(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Scan a file for color patterns
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileMatches = {
    path: filePath,
    matches: [],
  };

  lines.forEach((line, lineNumber) => {
    // Skip lines that are using CSS variables properly
    if (line.includes('var(--') || line.includes('hsl(var(--')) {
      return;
    }

    // Check for hex colors
    let match;
    while ((match = COLOR_PATTERNS.hex.exec(line)) !== null) {
      fileMatches.matches.push({
        line: lineNumber + 1,
        type: 'hex',
        match: match[0],
        context: line.trim(),
      });
      results.colorsByType.hex.push({
        file: filePath,
        line: lineNumber + 1,
        color: match[0],
      });
    }

    // Check for RGB/RGBA
    COLOR_PATTERNS.rgb.lastIndex = 0;
    while ((match = COLOR_PATTERNS.rgb.exec(line)) !== null) {
      // Skip if it's a shadow variable definition
      if (line.includes('--shadow-elevation')) {
        continue;
      }
      fileMatches.matches.push({
        line: lineNumber + 1,
        type: 'rgb',
        match: match[0],
        context: line.trim(),
      });
      results.colorsByType.rgb.push({
        file: filePath,
        line: lineNumber + 1,
        color: match[0],
      });
    }

    // Check for HSL (not using var)
    COLOR_PATTERNS.hsl.lastIndex = 0;
    while ((match = COLOR_PATTERNS.hsl.exec(line)) !== null) {
      fileMatches.matches.push({
        line: lineNumber + 1,
        type: 'hsl',
        match: match[0],
        context: line.trim(),
      });
      results.colorsByType.hsl.push({
        file: filePath,
        line: lineNumber + 1,
        color: match[0],
      });
    }

    // Check for inline styles (basic check)
    if (line.includes('style=')) {
      const hasColorProp = /(?:background|color|border|box-shadow)/.test(line);
      if (hasColorProp && !line.includes('var(--')) {
        fileMatches.matches.push({
          line: lineNumber + 1,
          type: 'inline',
          match: 'inline style with color',
          context: line.trim().substring(0, 100),
        });
        results.colorsByType.inline.push({
          file: filePath,
          line: lineNumber + 1,
          color: 'inline-style',
        });
      }
    }
  });

  if (fileMatches.matches.length > 0) {
    results.files.push(fileMatches);
    results.totalMatches += fileMatches.matches.length;
  }
}

/**
 * Generate summary report
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.files.length,
      totalMatches: results.totalMatches,
      hexColors: results.colorsByType.hex.length,
      rgbColors: results.colorsByType.rgb.length,
      hslColors: results.colorsByType.hsl.length,
      inlineStyles: results.colorsByType.inline.length,
    },
    files: results.files.map(f => ({
      path: f.path.replace(/\\/g, '/'),
      matchCount: f.matches.length,
      matches: f.matches,
    })),
    colorsByType: {
      hex: results.colorsByType.hex.slice(0, 50), // Limit to 50
      rgb: results.colorsByType.rgb.slice(0, 50),
      hsl: results.colorsByType.hsl.slice(0, 50),
      inline: results.colorsByType.inline.slice(0, 50),
    },
  };

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Starting theme check...\n');

  const rootDir = path.resolve(__dirname, '..');
  
  console.log(`📁 Scanning directory: ${rootDir}\n`);

  // Scan all relevant directories
  const allFiles = [];
  SCAN_DIRS.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`  Scanning ${dir}/...`);
      const files = scanDirectory(dirPath);
      allFiles.push(...files);
    }
  });

  console.log(`\n📄 Found ${allFiles.length} files to check\n`);

  // Scan each file
  allFiles.forEach(file => {
    scanFile(file);
  });

  // Generate report
  const report = generateReport();

  // Save report
  const outputPath = path.join(rootDir, 'theme-check-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('✅ Theme check complete!\n');
  console.log('📊 Summary:');
  console.log(`  Files with issues: ${report.summary.totalFiles}`);
  console.log(`  Total matches: ${report.summary.totalMatches}`);
  console.log(`  Hex colors: ${report.summary.hexColors}`);
  console.log(`  RGB/RGBA colors: ${report.summary.rgbColors}`);
  console.log(`  HSL colors: ${report.summary.hslColors}`);
  console.log(`  Inline styles: ${report.summary.inlineStyles}`);
  console.log(`\n📝 Report saved to: ${outputPath}\n`);

  // Show top files with issues
  if (report.files.length > 0) {
    console.log('🔝 Top files with issues:');
    report.files
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 10)
      .forEach(f => {
        console.log(`  ${f.path}: ${f.matchCount} matches`);
      });
  }

  console.log('\n');
}

main().catch(console.error);

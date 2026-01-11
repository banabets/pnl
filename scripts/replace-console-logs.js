#!/usr/bin/env node

/**
 * Script to replace console.log with logger
 * Usage: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const serverDir = path.join(__dirname, '../server');
const logImport = "import { log } from './logger';";

// Patterns to replace
const replacements = [
  {
    pattern: /console\.log\(/g,
    replacement: 'log.info(',
    description: 'console.log -> log.info',
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'log.error(',
    description: 'console.error -> log.error',
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'log.warn(',
    description: 'console.warn -> log.warn',
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'log.info(',
    description: 'console.info -> log.info',
  },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let hasLogImport = content.includes("from './logger'") || content.includes("from '../logger'");

  // Apply replacements
  for (const { pattern, replacement } of replacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  // Add log import if needed and not present
  if (modified && !hasLogImport) {
    // Find the last import statement
    const importRegex = /^import .+$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      
      // Determine relative path
      const relativePath = path.relative(path.dirname(filePath), path.join(serverDir, 'logger.ts'))
        .replace(/\\/g, '/')
        .replace(/\.ts$/, '');
      
      const logImportLine = `\nimport { log } from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';`;
      content = content.slice(0, insertIndex) + logImportLine + content.slice(insertIndex);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('dist')) {
      walkDir(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main execution
console.log('🔍 Finding TypeScript files...');
const files = walkDir(serverDir);
console.log(`📁 Found ${files.length} files`);

let modifiedCount = 0;
files.forEach(file => {
  if (processFile(file)) {
    console.log(`✅ Modified: ${path.relative(serverDir, file)}`);
    modifiedCount++;
  }
});

console.log(`\n✨ Done! Modified ${modifiedCount} files.`);
console.log('⚠️  Please review the changes before committing.');


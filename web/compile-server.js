const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const sourceFile = 'server/pumpfun-realtime.ts';
const source = fs.readFileSync(sourceFile, 'utf8');

const options = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  skipLibCheck: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
};

const result = ts.transpileModule(source, { compilerOptions: options });

const outFile = 'dist/server/pumpfun-realtime.js';
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, result.outputText);

console.log('✅ Compiled:', outFile);

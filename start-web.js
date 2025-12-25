#!/usr/bin/env node

// Simple startup script for the web server
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
  },
});

require('./server/index.ts');

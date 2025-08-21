#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build process...');

// Clear cache if it exists
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  console.log('🧹 Clearing Next.js cache...');
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
  } catch (error) {
    console.log('⚠️  Cache clear failed, continuing...');
  }
}

// Set environment variables for faster builds
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_ENV = 'production';

console.log('📦 Building application...');
const startTime = Date.now();

try {
  execSync('npm run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1'
    }
  });
  
  const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Build completed successfully in ${buildTime}s`);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
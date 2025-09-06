#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * 
 * This script sets up the development environment with:
 * - Git hooks for code quality
 * - Development dependencies check
 * - Environment validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function setupGitHooks() {
  log('Setting up Git hooks...', 'blue');
  
  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    log('Warning: Not in a Git repository. Skipping Git hooks setup.', 'yellow');
    return;
  }
  
  const hooksDir = path.join(process.cwd(), '.githooks');
  const gitHooksDir = path.join(process.cwd(), '.git', 'hooks');
  
  if (!fs.existsSync(hooksDir)) {
    log('No .githooks directory found. Skipping Git hooks setup.', 'yellow');
    return;
  }
  
  // Copy hooks to .git/hooks
  const hooks = fs.readdirSync(hooksDir);
  
  hooks.forEach(hook => {
    const sourcePath = path.join(hooksDir, hook);
    const targetPath = path.join(gitHooksDir, hook);
    
    try {
      fs.copyFileSync(sourcePath, targetPath);
      
      // Make executable on Unix systems
      if (process.platform !== 'win32') {
        fs.chmodSync(targetPath, '755');
      }
      
      log(`✅ Installed ${hook} hook`, 'green');
    } catch (error) {
      log(`❌ Failed to install ${hook} hook: ${error.message}`, 'red');
    }
  });
}

function checkDependencies() {
  log('Checking development dependencies...', 'blue');
  
  const requiredCommands = {
    'node': 'Node.js',
    'npm': 'npm',
    'git': 'Git'
  };
  
  let allPresent = true;
  
  Object.entries(requiredCommands).forEach(([command, name]) => {
    if (checkCommand(command)) {
      log(`✅ ${name} is installed`, 'green');
    } else {
      log(`❌ ${name} is not installed or not in PATH`, 'red');
      allPresent = false;
    }
  });
  
  return allPresent;
}

function validatePackageJson() {
  log('Validating package.json...', 'blue');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = ['dev', 'build', 'start', 'lint'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length > 0) {
      log(`❌ Missing required scripts: ${missingScripts.join(', ')}`, 'red');
      return false;
    }
    
    log('✅ package.json validation passed', 'green');
    return true;
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, 'red');
    return false;
  }
}

function installDependencies() {
  log('Installing npm dependencies...', 'blue');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to install dependencies: ${error.message}`, 'red');
    return false;
  }
}

function runTypeCheck() {
  log('Running TypeScript type check...', 'blue');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    log('✅ TypeScript type check passed', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript type check failed', 'red');
    return false;
  }
}

function main() {
  log('🚀 Setting up development environment...', 'blue');
  log('', 'reset');
  
  // Check system dependencies
  if (!checkDependencies()) {
    log('Please install missing dependencies and try again.', 'red');
    process.exit(1);
  }
  
  log('', 'reset');
  
  // Validate package.json
  if (!validatePackageJson()) {
    log('Please fix package.json issues and try again.', 'red');
    process.exit(1);
  }
  
  log('', 'reset');
  
  // Install dependencies
  if (!installDependencies()) {
    log('Failed to install dependencies.', 'red');
    process.exit(1);
  }
  
  log('', 'reset');
  
  // Setup Git hooks
  setupGitHooks();
  
  log('', 'reset');
  
  // Run type check
  if (!runTypeCheck()) {
    log('TypeScript errors found. Please fix them before continuing.', 'yellow');
  }
  
  log('', 'reset');
  log('🎉 Development environment setup complete!', 'green');
  log('', 'reset');
  log('Next steps:', 'blue');
  log('  1. Run `npm run dev` to start the development server', 'reset');
  log('  2. Run `npm run build` to test production build', 'reset');
  log('  3. Run `npm run lint` to check code quality', 'reset');
  log('', 'reset');
}

if (require.main === module) {
  main();
}

module.exports = { setupGitHooks, checkDependencies, validatePackageJson };